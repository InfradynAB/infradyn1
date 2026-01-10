/**
 * Process Single Email API
 * Manually triggers AI processing for a specific email
 * 
 * POST /api/emails/[id]/process
 */

import { NextRequest, NextResponse } from "next/server";
import db from "@/db/drizzle";
import { emailIngestion, emailAttachment, document, documentExtraction } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractPOFromS3 } from "@/lib/services/ai-extraction";
import { calculateDocumentConfidence } from "@/lib/services/confidence-engine";
import { recordUsage, canUseQuota } from "@/lib/services/usage-quota";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get the email with attachments
        const email = await db.query.emailIngestion.findFirst({
            where: eq(emailIngestion.id, id),
            with: {
                attachments: true,
            },
        });

        if (!email) {
            return NextResponse.json(
                { error: "Email not found" },
                { status: 404 }
            );
        }

        if (email.status !== "PENDING") {
            return NextResponse.json(
                { error: "Email is not pending", status: email.status },
                { status: 400 }
            );
        }

        // Check quota
        const quotaCheck = await canUseQuota(email.organizationId, "EMAIL_INGEST");
        if (!quotaCheck.allowed) {
            return NextResponse.json(
                { error: quotaCheck.reason },
                { status: 403 }
            );
        }

        // Update status to processing
        await db.update(emailIngestion)
            .set({ status: "PROCESSING" })
            .where(eq(emailIngestion.id, id));

        let extractionsCreated = 0;

        // Process each attachment with a documentId
        for (const attachment of email.attachments) {
            if (!attachment.fileUrl || !attachment.documentId) {
                console.log(`[PROCESS] Skipping ${attachment.fileName}: missing fileUrl or documentId`);
                continue;
            }

            // Check AI quota
            const aiQuota = await canUseQuota(email.organizationId, "AI_PARSE");
            if (!aiQuota.allowed) {
                console.warn(`[PROCESS] AI quota exceeded for ${attachment.fileName}`);
                continue;
            }

            try {
                // Extract content using AI
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
                        documentId: attachment.documentId,
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

                    // Record usage
                    await recordUsage(email.organizationId, "AI_PARSE", 1, attachment.documentId);
                    extractionsCreated++;
                }
            } catch (error) {
                console.error(`[PROCESS] Extraction failed for ${attachment.fileName}:`, error);
            }
        }

        // Update to processed
        await db.update(emailIngestion)
            .set({
                status: "PROCESSED",
                processedAt: new Date(),
            })
            .where(eq(emailIngestion.id, id));

        // Record email usage
        await recordUsage(email.organizationId, "EMAIL_INGEST", 1, id);

        return NextResponse.json({
            success: true,
            emailId: id,
            extractionsCreated,
        });
    } catch (error) {
        console.error("[API] Process email error:", error);

        // Mark as failed
        const { id } = await params;
        await db.update(emailIngestion)
            .set({
                status: "FAILED",
                processingError: error instanceof Error ? error.message : "Processing failed",
            })
            .where(eq(emailIngestion.id, id));

        return NextResponse.json(
            { error: "Failed to process email" },
            { status: 500 }
        );
    }
}
