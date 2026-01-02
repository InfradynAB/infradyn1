"use server";

import db from "@/db/drizzle";
import {
    milestone,
    progressRecord,
    conflictRecord,
    notification,
    purchaseOrder,
    supplier,
    user,
} from "@/db/schema";
import { eq, and, lt, gte, desc, isNull, sql, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// --- Constants ---
const IDLE_THRESHOLD_DAYS = 7;
const REMINDER_INTERVALS = {
    LOW_RISK: 7 * 24 * 60 * 60 * 1000, // 7 days
    MEDIUM_RISK: 3.5 * 24 * 60 * 60 * 1000, // 3.5 days (twice weekly)
    HIGH_RISK: 24 * 60 * 60 * 1000, // 1 day
};

const ESCALATION_LEVELS = {
    NONE: 0,
    PM: 1,
    EXECUTIVE: 2,
    FINANCE: 3,
} as const;

// --- Types ---
interface MilestoneWithContext {
    id: string;
    title: string;
    purchaseOrderId: string;
    expectedDate: Date | null;
    lastProgressUpdate: Date | null;
    currentProgress: number;
    isCritical: boolean;
    paymentPercentage: string;
}

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

// --- Helper Functions ---

/**
 * Calculate risk level based on days until milestone due date
 */
function calculateRiskLevel(daysUntilDue: number): RiskLevel {
    if (daysUntilDue < 7) return "HIGH";
    if (daysUntilDue <= 30) return "MEDIUM";
    return "LOW";
}

/**
 * Calculate next reminder time based on risk level
 */
function getNextReminderTime(riskLevel: RiskLevel): Date {
    const interval = REMINDER_INTERVALS[`${riskLevel}_RISK`];
    return new Date(Date.now() + interval);
}

// --- Forecasting Engine ---

/**
 * Detect milestones with no updates for X days and generate forecast records.
 * Uses historical supplier performance to estimate progress.
 */
export async function generateForecastRecords() {
    const cutoffDate = new Date(Date.now() - IDLE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    try {
        // Find milestones with no recent progress updates
        const staleMilestones = await db.query.milestone.findMany({
            where: eq(milestone.status, "IN_PROGRESS"),
            with: {
                purchaseOrder: {
                    with: {
                        supplier: true,
                    },
                },
                progressRecords: {
                    orderBy: [desc(progressRecord.reportedDate)],
                    limit: 1,
                },
            },
        });

        const forecastCandidates = staleMilestones.filter((m) => {
            const lastUpdate = m.progressRecords[0]?.reportedDate;
            if (!lastUpdate) return true; // Never updated
            return new Date(lastUpdate) < cutoffDate;
        });

        const generatedForecasts: string[] = [];

        for (const m of forecastCandidates) {
            const lastProgress = m.progressRecords[0]?.percentComplete
                ? Number(m.progressRecords[0].percentComplete)
                : 0;

            // Simple linear forecast: add 10% per week based on expected completion
            const daysSinceUpdate = m.progressRecords[0]?.reportedDate
                ? Math.floor((Date.now() - new Date(m.progressRecords[0].reportedDate).getTime()) / (24 * 60 * 60 * 1000))
                : IDLE_THRESHOLD_DAYS;

            const weeksPassed = Math.floor(daysSinceUpdate / 7);
            const forecastProgress = Math.min(100, lastProgress + (weeksPassed * 10));

            // Only create forecast if it's different from last known
            if (forecastProgress > lastProgress) {
                await db.insert(progressRecord).values({
                    milestoneId: m.id,
                    source: "FORECAST",
                    percentComplete: forecastProgress.toString(),
                    comment: `Auto-generated forecast based on ${daysSinceUpdate} days of inactivity.`,
                    reportedDate: new Date(),
                    trustLevel: "FORECAST",
                    isForecast: true,
                    forecastBasis: `Linear projection: +10% per week from ${lastProgress}%`,
                });

                generatedForecasts.push(m.id);
            }
        }

        revalidatePath("/dashboard/procurement/pos");

        return {
            success: true,
            data: {
                processed: forecastCandidates.length,
                generated: generatedForecasts.length,
            }
        };
    } catch (error: any) {
        console.error("[FORECAST_ENGINE]", error);
        return { success: false, error: error.message };
    }
}

// --- Chase Engine ---

/**
 * Process reminders and escalations based on risk level and milestone proximity.
 * - Low Risk (>30 days): Weekly reminders
 * - Medium Risk (7-30 days): Twice-weekly reminders
 * - High Risk (<7 days): Daily reminders + PM call task
 * - Critical Path: 4h reminder → 8h escalation to Exec
 * - Financial Milestone: 12h escalation to Finance Controller
 */
export async function processChaseQueue() {
    const now = new Date();

    try {
        // Get all open conflicts that need processing
        const openConflicts = await db.query.conflictRecord.findMany({
            where: and(
                eq(conflictRecord.state, "OPEN"),
                eq(conflictRecord.isDeleted, false)
            ),
            with: {
                purchaseOrder: {
                    with: { supplier: true },
                },
                milestone: true,
                assignee: true,
            },
        });

        let remindersCreated = 0;
        let escalationsTriggered = 0;

        for (const conflict of openConflicts) {
            const milestoneDate = conflict.milestone?.expectedDate;
            const daysUntilDue = milestoneDate
                ? Math.floor((new Date(milestoneDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
                : 30; // Default to medium risk if no date

            const riskLevel = calculateRiskLevel(daysUntilDue);
            const lastReminder = conflict.lastReminderAt ? new Date(conflict.lastReminderAt) : null;
            const reminderInterval = REMINDER_INTERVALS[`${riskLevel}_RISK`];

            const shouldRemind = !lastReminder || (now.getTime() - lastReminder.getTime()) >= reminderInterval;

            if (shouldRemind) {
                // Create notification for assignee
                if (conflict.assignedTo) {
                    await db.insert(notification).values({
                        userId: conflict.assignedTo,
                        title: `⚠️ ${riskLevel} Risk: ${conflict.milestone?.title}`,
                        message: `Conflict on PO ${conflict.purchaseOrder?.poNumber} requires attention. Deviation: ${conflict.deviationPercent}%`,
                        type: riskLevel === "HIGH" ? "URGENT" : "WARNING",
                        linkUrl: `/dashboard/procurement/${conflict.purchaseOrderId}`,
                    });
                    remindersCreated++;
                }

                // Update last reminder timestamp
                await db.update(conflictRecord)
                    .set({ lastReminderAt: now, updatedAt: now })
                    .where(eq(conflictRecord.id, conflict.id));

                // Handle escalations for critical path and financial milestones
                const currentEscalation = conflict.escalationLevel ?? 0;
                const isCritical = conflict.isCriticalPath ?? false;
                const isFinancial = conflict.isFinancialMilestone ?? false;

                if (isCritical && currentEscalation < ESCALATION_LEVELS.EXECUTIVE) {
                    const hoursSinceCreation = (now.getTime() - new Date(conflict.createdAt).getTime()) / (60 * 60 * 1000);

                    if (hoursSinceCreation >= 8) {
                        await db.update(conflictRecord)
                            .set({
                                escalationLevel: ESCALATION_LEVELS.EXECUTIVE,
                                state: "ESCALATED",
                                updatedAt: now,
                            })
                            .where(eq(conflictRecord.id, conflict.id));
                        escalationsTriggered++;
                    }
                }

                if (isFinancial && currentEscalation < ESCALATION_LEVELS.FINANCE) {
                    const hoursSinceCreation = (now.getTime() - new Date(conflict.createdAt).getTime()) / (60 * 60 * 1000);

                    if (hoursSinceCreation >= 12) {
                        await db.update(conflictRecord)
                            .set({
                                escalationLevel: ESCALATION_LEVELS.FINANCE,
                                state: "ESCALATED",
                                updatedAt: now,
                            })
                            .where(eq(conflictRecord.id, conflict.id));
                        escalationsTriggered++;
                    }
                }
            }
        }

        revalidatePath("/dashboard/procurement/pos");

        return {
            success: true,
            data: {
                processed: openConflicts.length,
                reminders: remindersCreated,
                escalations: escalationsTriggered,
            },
        };
    } catch (error: any) {
        console.error("[CHASE_ENGINE]", error);
        return { success: false, error: error.message };
    }
}

// --- Conflict Detection ---

/**
 * Compare SRP vs IRP for a milestone and detect deviations.
 * If deviation > 10%, create a conflict record.
 */
export async function detectConflicts(milestoneId: string) {
    try {
        const records = await db.query.progressRecord.findMany({
            where: and(
                eq(progressRecord.milestoneId, milestoneId),
                eq(progressRecord.isDeleted, false),
                eq(progressRecord.isForecast, false) // Exclude forecasts
            ),
            orderBy: [desc(progressRecord.reportedDate)],
        });

        const srpRecord = records.find((r) => r.source === "SRP");
        const irpRecord = records.find((r) => r.source === "IRP");

        if (!srpRecord || !irpRecord) {
            return { success: true, data: { hasConflict: false, reason: "Insufficient data for comparison" } };
        }

        const srpValue = Number(srpRecord.percentComplete);
        const irpValue = Number(irpRecord.percentComplete);
        const deviation = Math.abs(srpValue - irpValue);

        if (deviation > 10) {
            // Get milestone and PO info
            const milestoneData = await db.query.milestone.findFirst({
                where: eq(milestone.id, milestoneId),
                with: { purchaseOrder: true },
            });

            if (!milestoneData) {
                return { success: false, error: "Milestone not found" };
            }

            // Check if conflict already exists
            const existingConflict = await db.query.conflictRecord.findFirst({
                where: and(
                    eq(conflictRecord.milestoneId, milestoneId),
                    eq(conflictRecord.type, "PROGRESS_MISMATCH"),
                    eq(conflictRecord.state, "OPEN")
                ),
            });

            if (!existingConflict) {
                await db.insert(conflictRecord).values({
                    projectId: milestoneData.purchaseOrder.projectId,
                    purchaseOrderId: milestoneData.purchaseOrderId,
                    milestoneId,
                    type: "PROGRESS_MISMATCH",
                    state: "OPEN",
                    deviationPercent: deviation.toString(),
                    description: `SRP reports ${srpValue}%, IRP reports ${irpValue}%. Deviation: ${deviation}%`,
                    slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h SLA
                    escalationLevel: 0,
                    isCriticalPath: false, // To be set based on milestone
                    isFinancialMilestone: Number(milestoneData.paymentPercentage) >= 25,
                });
            }

            revalidatePath("/dashboard/procurement/pos");

            return {
                success: true,
                data: {
                    hasConflict: true,
                    deviation,
                    srpValue,
                    irpValue,
                }
            };
        }

        return { success: true, data: { hasConflict: false, deviation } };
    } catch (error: any) {
        console.error("[CONFLICT_DETECTOR]", error);
        return { success: false, error: error.message };
    }
}

// --- Progress Submission (SRP / IRP) ---

interface SubmitProgressInput {
    milestoneId: string;
    percentComplete: number;
    source: "SRP" | "IRP";
    comment?: string;
    userId?: string; // Optional - will get from session if not provided
}

/**
 * Submit a progress update and automatically trigger conflict detection.
 */
export async function submitProgress(input: SubmitProgressInput) {
    try {
        // Get user from session if not provided
        let userId = input.userId;
        if (!userId) {
            const { auth } = await import("@/auth");
            const { headers } = await import("next/headers");
            const session = await auth.api.getSession({ headers: await headers() });
            userId = session?.user?.id;
        }

        if (!userId) {
            return { success: false, error: "Not authenticated" };
        }

        // Create progress record
        const [newRecord] = await db.insert(progressRecord).values({
            milestoneId: input.milestoneId,
            source: input.source,
            percentComplete: input.percentComplete.toString(),
            comment: input.comment,
            reportedDate: new Date(),
            reportedBy: userId,
            trustLevel: input.source === "SRP" ? "VERIFIED" : "INTERNAL",
            isForecast: false,
        }).returning();

        // Trigger conflict detection
        await detectConflicts(input.milestoneId);

        revalidatePath("/dashboard/procurement/pos");
        revalidatePath("/dashboard/supplier");

        return { success: true, data: newRecord };
    } catch (error: any) {
        console.error("[SUBMIT_PROGRESS]", error);
        return { success: false, error: error.message };
    }
}
