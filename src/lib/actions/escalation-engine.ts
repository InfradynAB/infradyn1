"use server";

import db from "@/db/drizzle";
import {
    invoice,
    changeOrder,
    notification,
    purchaseOrder,
    user,
    milestone,
    auditLog,
} from "@/db/schema";
import { eq, and, lt, sql, desc, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// --- Constants ---

const ESCALATION_CONFIG = {
    INVOICE_OVERDUE: {
        REMINDER_DAYS: 3,      // First reminder at 3 days overdue
        ESCALATE_DAYS: 7,      // Escalate to PM at 7 days overdue
        FINANCE_DAYS: 14,      // Escalate to Finance at 14 days overdue
    },
    CHANGE_ORDER: {
        REMINDER_DAYS: 2,      // First reminder at 2 days pending
        ESCALATE_DAYS: 5,      // Escalate at 5 days pending
    },
    MILESTONE_VALIDATION: {
        REMINDER_DAYS: 3,      // Remind PM to validate after 3 days
        ESCALATE_DAYS: 7,      // Escalate after 7 days
    },
};

const ESCALATION_LEVELS = {
    NONE: 0,
    REMINDER: 1,
    PM: 2,
    EXECUTIVE: 3,
    FINANCE: 4,
} as const;

type EscalationLevel = typeof ESCALATION_LEVELS[keyof typeof ESCALATION_LEVELS];

// --- Types ---

interface EscalationResult {
    processed: number;
    reminders: number;
    escalations: number;
    errors: string[];
}

// --- Invoice Escalation ---

/**
 * Process overdue invoice escalations.
 * - 3 days overdue → Reminder to PM
 * - 7 days overdue → Escalate to PM
 * - 14 days overdue → Escalate to Finance
 */
export async function processInvoiceEscalations(): Promise<EscalationResult> {
    const result: EscalationResult = {
        processed: 0,
        reminders: 0,
        escalations: 0,
        errors: [],
    };

    try {
        const now = new Date();

        // Get overdue invoices
        const overdueInvoices = await db.query.invoice.findMany({
            where: and(
                sql`${invoice.status} IN ('PENDING', 'PARTIALLY_PAID')`,
                sql`${invoice.dueDate} IS NOT NULL`,
                lt(invoice.dueDate, now)
            ),
            with: {
                purchaseOrder: {
                    with: {
                        project: true,
                    },
                },
                supplier: true,
            },
        });

        for (const inv of overdueInvoices) {
            result.processed++;

            const daysOverdue = Math.floor(
                (now.getTime() - (inv.dueDate?.getTime() || 0)) / (24 * 60 * 60 * 1000)
            );

            // Determine escalation level based on days overdue
            let level: EscalationLevel = ESCALATION_LEVELS.NONE;
            let message = "";
            let recipientRole = "";

            if (daysOverdue >= ESCALATION_CONFIG.INVOICE_OVERDUE.FINANCE_DAYS) {
                level = ESCALATION_LEVELS.FINANCE;
                message = `URGENT: Invoice ${inv.invoiceNumber} is ${daysOverdue} days overdue. Amount: $${Number(inv.amount).toLocaleString()}`;
                recipientRole = "FINANCE_CONTROLLER";
                result.escalations++;
            } else if (daysOverdue >= ESCALATION_CONFIG.INVOICE_OVERDUE.ESCALATE_DAYS) {
                level = ESCALATION_LEVELS.PM;
                message = `Invoice ${inv.invoiceNumber} is ${daysOverdue} days overdue and requires attention. Amount: $${Number(inv.amount).toLocaleString()}`;
                recipientRole = "PROJECT_MANAGER";
                result.escalations++;
            } else if (daysOverdue >= ESCALATION_CONFIG.INVOICE_OVERDUE.REMINDER_DAYS) {
                level = ESCALATION_LEVELS.REMINDER;
                message = `Reminder: Invoice ${inv.invoiceNumber} is ${daysOverdue} days overdue. Amount: $${Number(inv.amount).toLocaleString()}`;
                recipientRole = "PROJECT_MANAGER";
                result.reminders++;
            }

            if (level > ESCALATION_LEVELS.NONE) {
                // Check if notification already sent at this level today
                const existingNotification = await db.query.notification.findFirst({
                    where: and(
                        sql`${notification.metadata}::jsonb->>'invoiceId' = ${inv.id}`,
                        sql`${notification.metadata}::jsonb->>'escalationLevel' = ${level.toString()}`,
                        sql`${notification.createdAt} > ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}`
                    ),
                });

                if (!existingNotification) {
                    // Create notification (would need to find actual user by role)
                    await db.insert(notification).values({
                        userId: null, // Would be populated based on role
                        type: level >= ESCALATION_LEVELS.PM ? "PAYMENT_ESCALATION" : "PAYMENT_REMINDER",
                        title: level >= ESCALATION_LEVELS.PM ? "Overdue Invoice Escalation" : "Invoice Payment Reminder",
                        message,
                        link: `/procurement/invoices/${inv.id}`,
                        metadata: JSON.stringify({
                            invoiceId: inv.id,
                            invoiceNumber: inv.invoiceNumber,
                            amount: inv.amount,
                            daysOverdue,
                            escalationLevel: level,
                            recipientRole,
                        }),
                    });

                    // Update invoice status to OVERDUE if not already
                    if (inv.status !== "OVERDUE") {
                        await db.update(invoice)
                            .set({ status: "OVERDUE", updatedAt: now })
                            .where(eq(invoice.id, inv.id));
                    }

                    await logEscalation("INVOICE_ESCALATION", inv.id, {
                        level,
                        daysOverdue,
                        amount: inv.amount,
                    });
                }
            }
        }

        return result;
    } catch (error) {
        result.errors.push(error instanceof Error ? error.message : "Unknown error");
        console.error("[processInvoiceEscalations] Error:", error);
        return result;
    }
}

// --- Change Order Escalation ---

/**
 * Process pending change order escalations.
 * - 2 days pending → Reminder to PM
 * - 5 days pending → Escalate to Executive
 */
export async function processCOEscalations(): Promise<EscalationResult> {
    const result: EscalationResult = {
        processed: 0,
        reminders: 0,
        escalations: 0,
        errors: [],
    };

    try {
        const now = new Date();

        // Get pending COs
        const pendingCOs = await db.query.changeOrder.findMany({
            where: sql`${changeOrder.status} IN ('SUBMITTED', 'UNDER_REVIEW')`,
            with: {
                purchaseOrder: {
                    with: {
                        project: true,
                    },
                },
                requester: true,
            },
        });

        for (const co of pendingCOs) {
            result.processed++;

            const daysPending = Math.floor(
                (now.getTime() - (co.requestedAt?.getTime() || co.createdAt.getTime())) / (24 * 60 * 60 * 1000)
            );

            let level: EscalationLevel = ESCALATION_LEVELS.NONE;
            let message = "";
            let recipientRole = "";

            if (daysPending >= ESCALATION_CONFIG.CHANGE_ORDER.ESCALATE_DAYS) {
                level = ESCALATION_LEVELS.EXECUTIVE;
                message = `Change Order ${co.changeNumber} has been pending for ${daysPending} days. Value: $${Number(co.amountDelta).toLocaleString()}`;
                recipientRole = "EXECUTIVE";
                result.escalations++;
            } else if (daysPending >= ESCALATION_CONFIG.CHANGE_ORDER.REMINDER_DAYS) {
                level = ESCALATION_LEVELS.REMINDER;
                message = `Reminder: Change Order ${co.changeNumber} requires review. Pending for ${daysPending} days.`;
                recipientRole = "PROJECT_MANAGER";
                result.reminders++;
            }

            if (level > ESCALATION_LEVELS.NONE) {
                const existingNotification = await db.query.notification.findFirst({
                    where: and(
                        sql`${notification.metadata}::jsonb->>'changeOrderId' = ${co.id}`,
                        sql`${notification.metadata}::jsonb->>'escalationLevel' = ${level.toString()}`,
                        sql`${notification.createdAt} > ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}`
                    ),
                });

                if (!existingNotification) {
                    await db.insert(notification).values({
                        userId: null,
                        type: level >= ESCALATION_LEVELS.EXECUTIVE ? "CO_ESCALATION" : "CO_REMINDER",
                        title: level >= ESCALATION_LEVELS.EXECUTIVE ? "Change Order Escalation" : "Change Order Review Reminder",
                        message,
                        link: `/procurement/change-orders/${co.id}`,
                        metadata: JSON.stringify({
                            changeOrderId: co.id,
                            changeNumber: co.changeNumber,
                            amountDelta: co.amountDelta,
                            daysPending,
                            escalationLevel: level,
                            recipientRole,
                        }),
                    });

                    await logEscalation("CO_ESCALATION", co.id, {
                        level,
                        daysPending,
                        amountDelta: co.amountDelta,
                    });
                }
            }
        }

        return result;
    } catch (error) {
        result.errors.push(error instanceof Error ? error.message : "Unknown error");
        console.error("[processCOEscalations] Error:", error);
        return result;
    }
}

// --- Milestone Validation Escalation ---

/**
 * Process milestones awaiting validation escalations.
 */
export async function processMilestoneValidationEscalations(): Promise<EscalationResult> {
    const result: EscalationResult = {
        processed: 0,
        reminders: 0,
        escalations: 0,
        errors: [],
    };

    try {
        const now = new Date();

        // Get milestones at 100% progress but not validated (status != COMPLETED)
        const completedButNotValidated = await db.query.milestone.findMany({
            where: and(
                sql`${milestone.status} != 'COMPLETED'`,
                sql`${milestone.status} != 'VALIDATED'`
            ),
            with: {
                purchaseOrder: {
                    with: {
                        project: true,
                    },
                },
                progressRecords: {
                    orderBy: [desc(sql`created_at`)],
                    limit: 1,
                },
            },
        });

        for (const ms of completedButNotValidated) {
            const latestProgress = ms.progressRecords[0];
            if (!latestProgress || Number(latestProgress.percentComplete) < 100) {
                continue;
            }

            result.processed++;

            const daysSinceComplete = Math.floor(
                (now.getTime() - latestProgress.createdAt.getTime()) / (24 * 60 * 60 * 1000)
            );

            let level: EscalationLevel = ESCALATION_LEVELS.NONE;
            let message = "";

            if (daysSinceComplete >= ESCALATION_CONFIG.MILESTONE_VALIDATION.ESCALATE_DAYS) {
                level = ESCALATION_LEVELS.EXECUTIVE;
                message = `Milestone "${ms.title}" reached 100% ${daysSinceComplete} days ago but has not been validated. This may delay invoice processing.`;
                result.escalations++;
            } else if (daysSinceComplete >= ESCALATION_CONFIG.MILESTONE_VALIDATION.REMINDER_DAYS) {
                level = ESCALATION_LEVELS.REMINDER;
                message = `Reminder: Milestone "${ms.title}" is at 100% and awaiting validation.`;
                result.reminders++;
            }

            if (level > ESCALATION_LEVELS.NONE) {
                const existingNotification = await db.query.notification.findFirst({
                    where: and(
                        sql`${notification.metadata}::jsonb->>'milestoneId' = ${ms.id}`,
                        sql`${notification.metadata}::jsonb->>'type' = 'VALIDATION_REMINDER'`,
                        sql`${notification.createdAt} > ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}`
                    ),
                });

                if (!existingNotification) {
                    await db.insert(notification).values({
                        userId: null,
                        type: "MILESTONE_VALIDATION_REMINDER",
                        title: level >= ESCALATION_LEVELS.EXECUTIVE ? "Milestone Validation Overdue" : "Milestone Validation Required",
                        message,
                        link: `/procurement/${ms.purchaseOrderId}`,
                        metadata: JSON.stringify({
                            milestoneId: ms.id,
                            milestoneTitle: ms.title,
                            daysSinceComplete,
                            escalationLevel: level,
                            type: "VALIDATION_REMINDER",
                        }),
                    });

                    await logEscalation("MILESTONE_VALIDATION_ESCALATION", ms.id, {
                        level,
                        daysSinceComplete,
                    });
                }
            }
        }

        return result;
    } catch (error) {
        result.errors.push(error instanceof Error ? error.message : "Unknown error");
        console.error("[processMilestoneValidationEscalations] Error:", error);
        return result;
    }
}

// --- Run All Escalations ---

/**
 * Run all Phase 5 escalation checks.
 * This should be called by a cron job (e.g., daily or every few hours).
 */
export async function runPhase5Escalations(): Promise<{
    invoices: EscalationResult;
    changeOrders: EscalationResult;
    milestones: EscalationResult;
}> {
    const [invoices, changeOrders, milestones] = await Promise.all([
        processInvoiceEscalations(),
        processCOEscalations(),
        processMilestoneValidationEscalations(),
    ]);

    console.log("[Phase 5 Escalations] Results:", {
        invoices,
        changeOrders,
        milestones,
    });

    revalidatePath("/procurement");

    return { invoices, changeOrders, milestones };
}

// --- Helper ---

async function logEscalation(action: string, entityId: string, metadata: object) {
    await db.insert(auditLog).values({
        userId: null,
        action,
        entityType: "escalation",
        entityId,
        metadata: JSON.stringify(metadata),
    });
}
