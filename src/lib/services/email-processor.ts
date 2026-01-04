/**
 * Email Processor Service
 * Handles inbound email processing, supplier matching, and attachment extraction
 */

import db from "@/db/drizzle";
import {
    emailIngestion,
    emailAttachment,
    supplier,
    purchaseOrder,
    document,
    documentExtraction,
    organization
} from "@/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { uploadFile } from "./s3";
import { extractPOFromS3 } from "./ai-extraction";
import { calculateDocumentConfidence } from "./confidence-engine";
import { recordUsage, canUseQuota } from "./usage-quota";

export interface InboundEmail {
    from: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType: string;
    }>;
}

export interface ProcessEmailResult {
    success: boolean;
    emailId?: string;
    matchedSupplier?: { id: string; name: string };
    matchedPO?: { id: string; poNumber: string };
    attachmentsProcessed: number;
    error?: string;
}

// Regex patterns for finding PO references
const PO_PATTERNS = [
    /PO[#:\s-]*(\d{4,10})/gi,
    /P\.?O\.?\s*[#:\s-]*(\d{4,10})/gi,
    /Purchase\s*Order[#:\s-]*(\d{4,10})/gi,
    /Order\s*[#:\s-]*([A-Z]{2,4}[-/]?\d{4,10})/gi,
];

/**
 * Parse organization ID from inbox email address
 * Format: po-{orgId}@ingest.infradyn.com or {orgSlug}@ingest.infradyn.com
 */
export function parseOrgFromInbox(toEmail: string): string | null {
    const match = toEmail.match(/^po-([a-f0-9-]{36})@/i);
    if (match) return match[1];

    // Try to match by slug
    const slugMatch = toEmail.match(/^([a-z0-9-]+)@ingest\./i);
    return slugMatch ? slugMatch[1] : null;
}

/**
 * Find organization by inbox email
 */
export async function findOrgByInbox(toEmail: string): Promise<string | null> {
    const orgId = parseOrgFromInbox(toEmail);
    if (!orgId) return null;

    // Try UUID first
    if (orgId.match(/^[a-f0-9-]{36}$/i)) {
        const org = await db.query.organization.findFirst({
            where: eq(organization.id, orgId),
        });
        return org?.id || null;
    }

    // Try by slug
    const org = await db.query.organization.findFirst({
        where: eq(organization.slug, orgId),
    });
    return org?.id || null;
}

/**
 * Match sender email to a supplier in the organization
 */
export async function matchSupplier(
    fromEmail: string,
    orgId: string
): Promise<{ id: string; name: string } | null> {
    // Extract domain from email
    const domain = fromEmail.split("@")[1];

    // Try exact email match first
    const exactMatch = await db.query.supplier.findFirst({
        where: and(
            eq(supplier.organizationId, orgId),
            eq(supplier.contactEmail, fromEmail)
        ),
    });

    if (exactMatch) {
        return { id: exactMatch.id, name: exactMatch.name };
    }

    // Try domain match (any supplier with same email domain)
    const domainMatch = await db.query.supplier.findFirst({
        where: and(
            eq(supplier.organizationId, orgId),
            ilike(supplier.contactEmail, `%@${domain}`)
        ),
    });

    if (domainMatch) {
        return { id: domainMatch.id, name: domainMatch.name };
    }

    return null;
}

/**
 * Extract PO numbers from email subject and body
 */
export function extractPOReferences(subject: string, body?: string): string[] {
    const text = `${subject} ${body || ""}`;
    const matches: string[] = [];

    for (const pattern of PO_PATTERNS) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            matches.push(match[1]);
        }
    }

    // Deduplicate
    return [...new Set(matches)];
}

/**
 * Find PO by number in organization
 */
export async function findPOByNumber(
    poNumber: string,
    orgId: string
): Promise<{ id: string; poNumber: string } | null> {
    const po = await db.query.purchaseOrder.findFirst({
        where: and(
            eq(purchaseOrder.organizationId, orgId),
            or(
                eq(purchaseOrder.poNumber, poNumber),
                ilike(purchaseOrder.poNumber, `%${poNumber}%`)
            )
        ),
    });

    return po ? { id: po.id, poNumber: po.poNumber } : null;
}

/**
 * Store an inbound email and its metadata
 */
export async function storeEmail(
    email: InboundEmail,
    orgId: string,
    matchedSupplierId?: string,
    matchedPoId?: string
): Promise<string> {
    const [inserted] = await db.insert(emailIngestion).values({
        organizationId: orgId,
        fromEmail: email.from,
        toEmail: email.to,
        subject: email.subject,
        bodyText: email.text,
        bodyHtml: email.html,
        status: "PENDING",
        matchedSupplierId,
        matchedPoId,
    }).returning();

    return inserted.id;
}

/**
 * Process and store email attachments
 */
export async function processAttachments(
    emailId: string,
    orgId: string,
    attachments: InboundEmail["attachments"],
    matchedPoId?: string
): Promise<number> {
    if (!attachments || attachments.length === 0) return 0;

    let processed = 0;

    for (const attachment of attachments) {
        try {
            // Check if it's a processable document
            const isDocument = [
                "application/pdf",
                "image/png",
                "image/jpeg",
                "image/jpg",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
            ].includes(attachment.contentType);

            if (!isDocument) continue;

            // Upload to S3
            const key = `emails/${orgId}/${emailId}/${attachment.filename}`;
            const fileUrl = await uploadFile(
                key,
                attachment.content,
                attachment.contentType
            );

            // Create attachment record
            const [attachmentRecord] = await db.insert(emailAttachment).values({
                emailIngestionId: emailId,
                fileName: attachment.filename,
                fileUrl,
                mimeType: attachment.contentType,
                fileSize: attachment.content.length,
            }).returning();

            // If we have a matched PO, create a document record
            if (matchedPoId && fileUrl) {
                const [doc] = await db.insert(document).values({
                    organizationId: orgId,
                    parentId: matchedPoId,
                    parentType: "PO",
                    fileName: attachment.filename,
                    fileUrl,
                    mimeType: attachment.contentType,
                    documentType: "OTHER",
                }).returning();

                // Link document to attachment
                await db.update(emailAttachment)
                    .set({ documentId: doc.id })
                    .where(eq(emailAttachment.id, attachmentRecord.id));
            }

            processed++;
        } catch (error) {
            console.error(`[EMAIL] Failed to process attachment ${attachment.filename}:`, error);
        }
    }

    return processed;
}

/**
 * Process pending emails through OCR/AI extraction
 */
export async function processEmailQueue(limit: number = 10): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
}> {
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    // Get pending emails
    const pendingEmails = await db.query.emailIngestion.findMany({
        where: eq(emailIngestion.status, "PENDING"),
        with: {
            attachments: true,
        },
        limit,
    });

    for (const email of pendingEmails) {
        processed++;

        try {
            // Check quota
            const quotaCheck = await canUseQuota(email.organizationId, "EMAIL_INGEST");
            if (!quotaCheck.allowed) {
                await db.update(emailIngestion)
                    .set({
                        status: "FAILED",
                        processingError: quotaCheck.reason,
                        processedAt: new Date(),
                    })
                    .where(eq(emailIngestion.id, email.id));
                failed++;
                continue;
            }

            // Record usage
            await recordUsage(email.organizationId, "EMAIL_INGEST", 1, email.id);

            // Update status to processing
            await db.update(emailIngestion)
                .set({ status: "PROCESSING" })
                .where(eq(emailIngestion.id, email.id));

            // Process each attachment
            for (const attachment of email.attachments) {
                if (!attachment.fileUrl) continue;

                // Check OCR quota
                const ocrQuota = await canUseQuota(email.organizationId, "AI_PARSE");
                if (!ocrQuota.allowed) {
                    console.warn(`[EMAIL] Skipping extraction for ${attachment.fileName}: ${ocrQuota.reason}`);
                    continue;
                }

                try {
                    // Extract content
                    const extractionResult = await extractPOFromS3(attachment.fileUrl);

                    if (extractionResult.success && extractionResult.data) {
                        // Calculate confidence
                        const confidence = calculateDocumentConfidence(
                            extractionResult.data,
                            extractionResult.data.rawText
                        );

                        // Convert FieldConfidence objects to plain numbers
                        const fieldConfidences = Object.fromEntries(
                            Object.entries(confidence.fields).map(([k, v]) => [k, v.value])
                        );

                        // Create extraction record
                        const [extraction] = await db.insert(documentExtraction).values({
                            documentId: attachment.documentId!,
                            rawText: extractionResult.data.rawText,
                            parsedJson: JSON.stringify(extractionResult.data),
                            confidenceScore: String(confidence.overall),
                            status: "COMPLETED",
                            ingestionSource: "EMAIL_INBOUND",
                            aiModel: "gpt-4o-mini",
                            fieldConfidences,
                            detectedDocType: "PO",
                            requiresReview: confidence.requiresReview,
                        }).returning();

                        // Link extraction to attachment
                        await db.update(emailAttachment)
                            .set({ extractionId: extraction.id })
                            .where(eq(emailAttachment.id, attachment.id));

                        // Record AI usage
                        await recordUsage(email.organizationId, "AI_PARSE", 1, attachment.documentId!);
                    }
                } catch (extractError) {
                    console.error(`[EMAIL] Extraction failed for ${attachment.fileName}:`, extractError);
                }
            }

            // Mark as processed
            await db.update(emailIngestion)
                .set({
                    status: "PROCESSED",
                    processedAt: new Date(),
                })
                .where(eq(emailIngestion.id, email.id));

            succeeded++;
        } catch (error) {
            console.error(`[EMAIL] Processing failed for email ${email.id}:`, error);

            await db.update(emailIngestion)
                .set({
                    status: "FAILED",
                    processingError: error instanceof Error ? error.message : "Processing failed",
                    processedAt: new Date(),
                })
                .where(eq(emailIngestion.id, email.id));

            failed++;
        }
    }

    return { processed, succeeded, failed };
}

/**
 * Main entry point for handling an inbound email
 */
export async function handleInboundEmail(email: InboundEmail): Promise<ProcessEmailResult> {
    try {
        // Find organization from inbox address
        const orgId = await findOrgByInbox(email.to);
        if (!orgId) {
            return {
                success: false,
                attachmentsProcessed: 0,
                error: `No organization found for inbox: ${email.to}`
            };
        }

        // Match sender to supplier
        const matchedSupplier = await matchSupplier(email.from, orgId);

        // Extract PO references
        const poRefs = extractPOReferences(email.subject, email.text);
        let matchedPO: { id: string; poNumber: string } | null = null;

        for (const poRef of poRefs) {
            matchedPO = await findPOByNumber(poRef, orgId);
            if (matchedPO) break;
        }

        // Store the email
        const emailId = await storeEmail(
            email,
            orgId,
            matchedSupplier?.id,
            matchedPO?.id
        );

        // Process attachments
        const attachmentsProcessed = await processAttachments(
            emailId,
            orgId,
            email.attachments,
            matchedPO?.id
        );

        return {
            success: true,
            emailId,
            matchedSupplier: matchedSupplier || undefined,
            matchedPO: matchedPO || undefined,
            attachmentsProcessed,
        };
    } catch (error) {
        console.error("[EMAIL] Handle inbound error:", error);
        return {
            success: false,
            attachmentsProcessed: 0,
            error: error instanceof Error ? error.message : "Failed to process email",
        };
    }
}
