import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import OpenAI from "openai";
import db from "@/db/drizzle";
import { milestone, progressRecord, purchaseOrder, boqItem } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface AIFieldSuggestion {
    field: string;
    value: string | number;
    confidence: number;
    reason: string;
}

/**
 * POST /api/progress/suggest
 * Generate AI-assisted field suggestions for progress logging.
 * 
 * Body: { milestoneId: string, source: string }
 * Returns: { suggestions: AIFieldSuggestion[] }
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { milestoneId, source, purchaseOrderId } = body;

        if (!milestoneId) {
            return NextResponse.json({ error: "milestoneId is required" }, { status: 400 });
        }

        // Get milestone details
        const milestoneData = await db.query.milestone.findFirst({
            where: eq(milestone.id, milestoneId),
        });

        if (!milestoneData) {
            return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
        }

        // Get PO details if available
        let poData = null;
        if (purchaseOrderId) {
            poData = await db.query.purchaseOrder.findFirst({
                where: eq(purchaseOrder.id, purchaseOrderId),
            });
        } else if (milestoneData.purchaseOrderId) {
            poData = await db.query.purchaseOrder.findFirst({
                where: eq(purchaseOrder.id, milestoneData.purchaseOrderId),
            });
        }

        // Get recent progress history for this milestone
        const progressHistory = await db.query.progressRecord.findMany({
            where: eq(progressRecord.milestoneId, milestoneId),
            orderBy: [desc(progressRecord.createdAt)],
            limit: 10,
        });

        // Get BOQ items related to this PO for context
        let boqData: any[] = [];
        if (poData?.id) {
            boqData = await db.query.boqItem.findMany({
                where: eq(boqItem.purchaseOrderId, poData.id),
                limit: 10,
            });
        }

        // Build context for AI
        // Calculate current progress from the most recent progress record
        const currentProgress = progressHistory.length > 0
            ? progressHistory[0].percentComplete
            : 0;
        const lastUpdate = progressHistory[0];
        const progressTrend = progressHistory.length >= 2
            ? Number(progressHistory[0].percentComplete) - Number(progressHistory[1].percentComplete)
            : null;

        const context = {
            milestone: {
                title: milestoneData.title,
                description: milestoneData.description,
                expectedDate: milestoneData.expectedDate,
                currentProgress,
                paymentPercentage: milestoneData.paymentPercentage,
            },
            po: poData ? {
                poNumber: poData.poNumber,
                scope: poData.scope,
                status: poData.status,
            } : null,
            history: progressHistory.slice(0, 5).map(p => ({
                date: p.createdAt,
                percent: p.percentComplete,
                source: p.source,
                comment: p.comment?.substring(0, 100),
            })),
            boqSummary: boqData.length > 0 ? {
                totalItems: boqData.length,
                criticalItems: boqData.filter(b => b.isCritical).length,
                sampleItems: boqData.slice(0, 3).map(b => b.description?.substring(0, 50)),
            } : null,
            source,
            progressTrend,
        };

        // Generate suggestions using GPT
        const systemPrompt = `You are an AI assistant helping project managers log progress updates for construction/procurement milestones. 
Based on the context provided, generate smart suggestions for form fields.

IMPORTANT: Return ONLY a valid JSON array with suggestion objects. No explanation, no markdown.

Each suggestion should have:
- field: "percentComplete" or "comment"
- value: the suggested value (number for percentComplete, string for comment)
- confidence: 0-100 (how confident you are)
- reason: short explanation for the user

Consider:
1. Historical progress trends (if available)
2. The update source (site visit = more accurate, call = estimate)
3. Milestone type and expected completion
4. Typical progress increments (usually 10-25%)
5. Days until expected date`;

        const userPrompt = `Generate suggestions for logging progress on this milestone:

MILESTONE: ${context.milestone.title}
Current Progress: ${currentProgress}%
Expected Date: ${context.milestone.expectedDate || "Not set"}
Update Source: ${source || "Not specified"}

${context.history.length > 0 ? `
RECENT HISTORY:
${context.history.map(h => `- ${h.date}: ${h.percent}% (${h.source})`).join('\n')}
Progress Trend: ${progressTrend ? `+${progressTrend}% per update` : 'N/A'}` : 'No previous updates.'}

${context.po ? `
PO CONTEXT:
- PO: ${context.po.poNumber}
- Scope: ${context.po.scope?.substring(0, 100) || 'N/A'}
- Status: ${context.po.status}` : ''}

${context.boqSummary ? `
BOQ: ${context.boqSummary.totalItems} items (${context.boqSummary.criticalItems} critical)` : ''}

Generate 2-4 helpful suggestions. For "comment" suggestions, provide draft text appropriate for the source type (${source}).`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 500,
        });

        const responseText = completion.choices[0]?.message?.content || "[]";

        // Parse the response
        let suggestions: AIFieldSuggestion[] = [];
        try {
            // Clean up response - remove markdown if present
            let cleanText = responseText.trim();
            if (cleanText.startsWith("```")) {
                cleanText = cleanText.replace(/```json?\n?/g, "").replace(/```/g, "");
            }
            suggestions = JSON.parse(cleanText);

            // Validate structure
            if (!Array.isArray(suggestions)) {
                suggestions = [];
            }
        } catch (parseError) {
            console.error("[AI Suggest] Failed to parse response:", responseText);
            suggestions = [];
        }

        // Add fallback suggestions if AI failed or missing percentComplete
        const hasPercentSuggestion = suggestions.some(s => s.field === "percentComplete");

        if (!hasPercentSuggestion) {
            // Always suggest a progress value
            const progressNum = Number(currentProgress) || 0;
            const trendNum = Number(progressTrend) || 0;
            const suggestedProgress = trendNum > 0
                ? Math.min(100, progressNum + trendNum)
                : Math.min(100, progressNum + 15);

            suggestions.unshift({
                field: "percentComplete",
                value: Math.round(suggestedProgress / 5) * 5, // Round to nearest 5
                confidence: 60,
                reason: trendNum > 0
                    ? `Based on previous update trend (+${trendNum}%)`
                    : progressNum === 0
                        ? "Starting point - adjust based on actual progress"
                        : "Typical progress increment of 15%",
            });
        }

        // Add comment template if missing
        const hasCommentSuggestion = suggestions.some(s => s.field === "comment");
        if (!hasCommentSuggestion && source) {
            const commentTemplates: Record<string, string> = {
                SITE_VISIT: `Site visit on ${new Date().toLocaleDateString()}. Observed: `,
                CALL: `Weekly call update. Discussed with supplier: `,
                EMAIL: `Email update received. Summary: `,
                OTHER: `Update received. Notes: `,
            };

            if (commentTemplates[source]) {
                suggestions.push({
                    field: "comment",
                    value: commentTemplates[source],
                    confidence: 80,
                    reason: `Template for ${source.replace("_", " ").toLowerCase()} updates`,
                });
            }
        }

        return NextResponse.json({
            success: true,
            suggestions,
        });
    } catch (error) {
        console.error("[API /api/progress/suggest] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
