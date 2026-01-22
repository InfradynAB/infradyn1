"use server";

import OpenAI from "openai";
import db from "@/db/drizzle";
import { ncr, ncrComment, document, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// NCR DOCUMENT PARSING (OCR + AI)
// ============================================================================

interface ParsedNCRData {
    poNumber?: string;
    issueType?: string;
    severity?: string;
    title?: string;
    description?: string;
    supplierName?: string;
    batchId?: string;
    date?: string;
    confidence: number;
}

interface ParseNCRDocumentResult {
    success: boolean;
    data?: ParsedNCRData;
    error?: string;
}

/**
 * Parse an NCR document using GPT-4 Vision
 * Extracts PO number, issue details, severity, etc. from scanned documents
 */
export async function parseNCRDocument(
    imageUrl: string,
    fileName?: string
): Promise<ParseNCRDocumentResult> {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return { success: false, error: "OpenAI API key not configured" };
        }

        // Try to extract PO number from filename first
        const filenamePOMatch = fileName?.match(/PO[-_]?(\d+)/i);
        const filenameHint = filenamePOMatch ? `Filename suggests PO: ${filenamePOMatch[1]}` : "";

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert at extracting structured data from Non-Conformance Report (NCR) documents.
Extract the following fields if present:
- poNumber: Purchase Order number (e.g., PO-2024-001)
- issueType: One of DAMAGED, WRONG_SPEC, DOC_MISSING, QUANTITY_SHORT, QUALITY_DEFECT, OTHER
- severity: One of MINOR, MAJOR, CRITICAL (based on impact described)
- title: Brief issue title
- description: Detailed description of the non-conformance
- supplierName: Supplier/vendor name if mentioned
- batchId: Batch or lot number if mentioned
- date: Date of the report if visible

Return a JSON object with these fields. Use null for fields you cannot find.
Also include a "confidence" field from 0-100 indicating how confident you are in the extraction.

${filenameHint}`,
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl,
                                detail: "high",
                            },
                        },
                        {
                            type: "text",
                            text: "Extract NCR data from this document. Return JSON only.",
                        },
                    ],
                },
            ],
            max_tokens: 1000,
            response_format: { type: "json_object" },
        });

        const content = response.choices[0].message.content;
        if (!content) {
            return { success: false, error: "No response from AI" };
        }

        const parsed = JSON.parse(content) as ParsedNCRData;

        // Validate and clean the response
        const cleanedData: ParsedNCRData = {
            poNumber: parsed.poNumber || undefined,
            issueType: validateIssueType(parsed.issueType),
            severity: validateSeverity(parsed.severity),
            title: parsed.title || undefined,
            description: parsed.description || undefined,
            supplierName: parsed.supplierName || undefined,
            batchId: parsed.batchId || undefined,
            date: parsed.date || undefined,
            confidence: parsed.confidence || 50,
        };

        return { success: true, data: cleanedData };
    } catch (error) {
        console.error("[PARSE_NCR_DOCUMENT]", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to parse document"
        };
    }
}

function validateIssueType(type?: string): string | undefined {
    const validTypes = ["DAMAGED", "WRONG_SPEC", "DOC_MISSING", "QUANTITY_SHORT", "QUALITY_DEFECT", "OTHER"];
    if (!type) return undefined;
    const upper = type.toUpperCase().replace(/\s+/g, "_");
    return validTypes.includes(upper) ? upper : "OTHER";
}

function validateSeverity(severity?: string): string | undefined {
    const validSeverities = ["MINOR", "MAJOR", "CRITICAL"];
    if (!severity) return undefined;
    const upper = severity.toUpperCase();
    return validSeverities.includes(upper) ? upper : undefined;
}

// ============================================================================
// AI THREAD SUMMARIZER
// ============================================================================

interface ThreadSummaryResult {
    success: boolean;
    summary?: string;
    error?: string;
}

/**
 * Generate an AI summary of an NCR comment thread
 */
export async function generateThreadSummary(ncrId: string): Promise<ThreadSummaryResult> {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return { success: false, error: "OpenAI API key not configured" };
        }

        // Get NCR and its comments
        const ncrData = await db.query.ncr.findFirst({
            where: eq(ncr.id, ncrId),
            with: {
                comments: {
                    orderBy: (c, { asc }) => [asc(c.createdAt)],
                },
                supplier: true,
            },
        });

        if (!ncrData) {
            return { success: false, error: "NCR not found" };
        }

        // Build conversation context
        const context = [
            `NCR: ${ncrData.ncrNumber} - ${ncrData.title}`,
            `Severity: ${ncrData.severity}`,
            `Status: ${ncrData.status}`,
            `Supplier: ${ncrData.supplier?.name || "Unknown"}`,
            `Issue: ${ncrData.description || "No description"}`,
            "",
            "Comment Thread:",
        ];

        ncrData.comments.forEach(comment => {
            if (!comment.isInternal) {  // Only include non-internal comments
                context.push(`- ${comment.authorRole || "User"}: ${comment.content || "[attachment]"}`);
            }
        });

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are summarizing Non-Conformance Report discussions for a procurement dashboard.
Generate a brief 1-2 sentence summary that captures:
- The main issue
- Current resolution status
- Who is involved/responsible
- Any pending actions

Be concise and factual. Focus on actionable information.`,
                },
                {
                    role: "user",
                    content: context.join("\n"),
                },
            ],
            max_tokens: 150,
        });

        const summary = response.choices[0].message.content;
        if (!summary) {
            return { success: false, error: "No summary generated" };
        }

        // Update NCR with the summary
        await db.update(ncr)
            .set({
                aiSummary: summary,
                aiSummaryUpdatedAt: new Date(),
            })
            .where(eq(ncr.id, ncrId));

        return { success: true, summary };
    } catch (error) {
        console.error("[GENERATE_THREAD_SUMMARY]", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to generate summary"
        };
    }
}

/**
 * Get cached AI summary for an NCR, regenerating if stale
 */
export async function getNCRSummary(ncrId: string, maxAgeMinutes = 60): Promise<ThreadSummaryResult> {
    try {
        const ncrData = await db.query.ncr.findFirst({
            where: eq(ncr.id, ncrId),
        });

        if (!ncrData) {
            return { success: false, error: "NCR not found" };
        }

        // Check if we have a recent summary
        if (ncrData.aiSummary && ncrData.aiSummaryUpdatedAt) {
            const ageMs = Date.now() - new Date(ncrData.aiSummaryUpdatedAt).getTime();
            const ageMinutes = ageMs / (1000 * 60);

            if (ageMinutes < maxAgeMinutes) {
                return { success: true, summary: ncrData.aiSummary };
            }
        }

        // Generate new summary
        return await generateThreadSummary(ncrId);
    } catch (error) {
        console.error("[GET_NCR_SUMMARY]", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get summary"
        };
    }
}
