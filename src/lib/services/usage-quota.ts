/**
 * Usage Quota Service
 * Tracks and enforces AI processing usage limits per organization
 */

import db from "@/db/drizzle";
import { usageQuota, usageEvent } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

// Estimated costs per operation (USD)
const COST_ESTIMATES = {
    OCR_PAGE: 0.0015,      // ~$1.50 per 1000 pages
    AI_PARSE: 0.003,       // ~$3 per 1000 documents (using gpt-4o-mini)
    EMAIL_INGEST: 0.001,   // Storage + processing
};

export type UsageEventType = "OCR_PAGE" | "AI_PARSE" | "EMAIL_INGEST";

export interface QuotaStatus {
    ocr: { used: number; limit: number; remaining: number; percentage: number };
    aiParse: { used: number; limit: number; remaining: number; percentage: number };
    emailIngest: { used: number; limit: number; remaining: number; percentage: number };
    periodStart: Date;
    isOverLimit: boolean;
    estimatedCostThisMonth: number;
}

/**
 * Get or create usage quota for an organization
 */
export async function getOrCreateQuota(organizationId: string) {
    let quota = await db.query.usageQuota.findFirst({
        where: eq(usageQuota.organizationId, organizationId),
    });

    if (!quota) {
        const [newQuota] = await db.insert(usageQuota).values({
            organizationId,
        }).returning();
        quota = newQuota;
    }

    // Check if we need to reset monthly counters
    const now = new Date();
    const periodStart = new Date(quota.currentPeriodStart!);
    const monthsDiff = (now.getFullYear() - periodStart.getFullYear()) * 12 +
        (now.getMonth() - periodStart.getMonth());

    if (monthsDiff >= 1) {
        // Reset counters for new month
        const [updatedQuota] = await db.update(usageQuota)
            .set({
                ocrUsedThisMonth: 0,
                aiParseUsedThisMonth: 0,
                emailIngestUsedThisMonth: 0,
                lastResetAt: now,
                currentPeriodStart: now,
                updatedAt: now,
            })
            .where(eq(usageQuota.id, quota.id))
            .returning();
        return updatedQuota;
    }

    return quota;
}

/**
 * Get current quota status for an organization
 */
export async function getQuotaStatus(organizationId: string): Promise<QuotaStatus> {
    const quota = await getOrCreateQuota(organizationId);

    const ocrUsed = Number(quota.ocrUsedThisMonth) || 0;
    const aiParseUsed = Number(quota.aiParseUsedThisMonth) || 0;
    const emailIngestUsed = Number(quota.emailIngestUsedThisMonth) || 0;

    const ocrLimit = Number(quota.monthlyOcrLimit) || 100;
    const aiParseLimit = Number(quota.monthlyAiParseLimit) || 50;
    const emailIngestLimit = Number(quota.monthlyEmailIngestLimit) || 200;

    const estimatedCost =
        ocrUsed * COST_ESTIMATES.OCR_PAGE +
        aiParseUsed * COST_ESTIMATES.AI_PARSE +
        emailIngestUsed * COST_ESTIMATES.EMAIL_INGEST;

    return {
        ocr: {
            used: ocrUsed,
            limit: ocrLimit,
            remaining: Math.max(0, ocrLimit - ocrUsed),
            percentage: Math.min(100, (ocrUsed / ocrLimit) * 100),
        },
        aiParse: {
            used: aiParseUsed,
            limit: aiParseLimit,
            remaining: Math.max(0, aiParseLimit - aiParseUsed),
            percentage: Math.min(100, (aiParseUsed / aiParseLimit) * 100),
        },
        emailIngest: {
            used: emailIngestUsed,
            limit: emailIngestLimit,
            remaining: Math.max(0, emailIngestLimit - emailIngestUsed),
            percentage: Math.min(100, (emailIngestUsed / emailIngestLimit) * 100),
        },
        periodStart: quota.currentPeriodStart!,
        isOverLimit: ocrUsed >= ocrLimit || aiParseUsed >= aiParseLimit || emailIngestUsed >= emailIngestLimit,
        estimatedCostThisMonth: Math.round(estimatedCost * 100) / 100,
    };
}

/**
 * Check if an organization can perform a specific operation
 */
export async function canUseQuota(
    organizationId: string,
    eventType: UsageEventType,
    quantity: number = 1
): Promise<{ allowed: boolean; reason?: string }> {
    const status = await getQuotaStatus(organizationId);

    switch (eventType) {
        case "OCR_PAGE":
            if (status.ocr.remaining < quantity) {
                return {
                    allowed: false,
                    reason: `OCR limit reached (${status.ocr.used}/${status.ocr.limit} pages)`
                };
            }
            break;
        case "AI_PARSE":
            if (status.aiParse.remaining < quantity) {
                return {
                    allowed: false,
                    reason: `AI parsing limit reached (${status.aiParse.used}/${status.aiParse.limit} documents)`
                };
            }
            break;
        case "EMAIL_INGEST":
            if (status.emailIngest.remaining < quantity) {
                return {
                    allowed: false,
                    reason: `Email ingestion limit reached (${status.emailIngest.used}/${status.emailIngest.limit} emails)`
                };
            }
            break;
    }

    return { allowed: true };
}

/**
 * Record a usage event and update quota counters
 */
export async function recordUsage(
    organizationId: string,
    eventType: UsageEventType,
    quantity: number = 1,
    resourceId?: string,
    metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
    try {
        // First check quota
        const canUse = await canUseQuota(organizationId, eventType, quantity);
        if (!canUse.allowed) {
            return { success: false, error: canUse.reason };
        }

        // Record the event
        const estimatedCost = (COST_ESTIMATES[eventType] || 0) * quantity;

        await db.insert(usageEvent).values({
            organizationId,
            eventType,
            resourceId,
            quantity,
            estimatedCostUsd: String(estimatedCost),
            metadata,
        });

        // Update quota counters
        const quota = await getOrCreateQuota(organizationId);
        const updates: Record<string, any> = { updatedAt: new Date() };

        switch (eventType) {
            case "OCR_PAGE":
                updates.ocrUsedThisMonth = (Number(quota.ocrUsedThisMonth) || 0) + quantity;
                break;
            case "AI_PARSE":
                updates.aiParseUsedThisMonth = (Number(quota.aiParseUsedThisMonth) || 0) + quantity;
                break;
            case "EMAIL_INGEST":
                updates.emailIngestUsedThisMonth = (Number(quota.emailIngestUsedThisMonth) || 0) + quantity;
                break;
        }

        await db.update(usageQuota)
            .set(updates)
            .where(eq(usageQuota.id, quota.id));

        return { success: true };
    } catch (error) {
        console.error("[USAGE] Record error:", error);
        return { success: false, error: "Failed to record usage" };
    }
}

/**
 * Get usage history for an organization
 */
export async function getUsageHistory(
    organizationId: string,
    startDate?: Date,
    eventType?: UsageEventType
) {
    const conditions = [eq(usageEvent.organizationId, organizationId)];

    if (startDate) {
        conditions.push(gte(usageEvent.createdAt, startDate));
    }

    const events = await db.query.usageEvent.findMany({
        where: and(...conditions),
        orderBy: (e, { desc }) => [desc(e.createdAt)],
        limit: 100,
    });

    if (eventType) {
        return events.filter(e => e.eventType === eventType);
    }

    return events;
}

/**
 * Update quota limits for an organization (admin function)
 */
export async function updateQuotaLimits(
    organizationId: string,
    limits: {
        monthlyOcrLimit?: number;
        monthlyAiParseLimit?: number;
        monthlyEmailIngestLimit?: number;
    }
): Promise<{ success: boolean }> {
    const quota = await getOrCreateQuota(organizationId);

    await db.update(usageQuota)
        .set({
            ...limits,
            updatedAt: new Date(),
        })
        .where(eq(usageQuota.id, quota.id));

    return { success: true };
}
