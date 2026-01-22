"use server";

import db from "@/db/drizzle";
import { ncr, notification, user, auditLog } from "@/db/schema";
import { eq, and, lt, sql, isNull, not } from "drizzle-orm";
import { sendEmail } from "@/lib/services/email";

// ============================================================================
// SLA CONFIGURATION
// ============================================================================

const SLA_CONFIG = {
    CRITICAL: { response: 4, resolution: 24 },
    MAJOR: { response: 24, resolution: 72 },
    MINOR: { response: 72, resolution: 168 }, // 7 days
};

const ESCALATION_THRESHOLDS = {
    LEVEL_1: 0.5,  // 50% of SLA time = reminder
    LEVEL_2: 1.0,  // 100% of SLA time = escalate to PM
    LEVEL_3: 1.5,  // 150% of SLA time = escalate to executive
};

// ============================================================================
// NCR SLA ESCALATION ENGINE
// ============================================================================

interface EscalationResult {
    processed: number;
    reminders: number;
    escalations: number;
    errors: string[];
}

/**
 * Process NCR SLA escalations
 * This should be called by a cron job (e.g., every hour)
 */
export async function processNCREscalations(): Promise<EscalationResult> {
    const result: EscalationResult = {
        processed: 0,
        reminders: 0,
        escalations: 0,
        errors: [],
    };

    try {
        const now = new Date();

        // Get all open NCRs with SLA dates
        const openNCRs = await db.query.ncr.findMany({
            where: and(
                not(eq(ncr.status, "CLOSED")),
                not(isNull(ncr.slaDueAt)),
            ),
            with: {
                assignee: true,
                reporter: true,
                organization: true,
                purchaseOrder: true,
                supplier: true,
            },
        });

        for (const ncrRecord of openNCRs) {
            result.processed++;

            try {
                const slaDue = new Date(ncrRecord.slaDueAt!);
                const hoursRemaining = (slaDue.getTime() - now.getTime()) / (1000 * 60 * 60);
                const totalSLAHours = SLA_CONFIG[ncrRecord.severity as keyof typeof SLA_CONFIG].resolution;
                const percentUsed = 1 - (hoursRemaining / totalSLAHours);

                const currentLevel = ncrRecord.escalationLevel || 0;
                let newLevel = currentLevel;

                // Determine escalation level
                if (percentUsed >= ESCALATION_THRESHOLDS.LEVEL_3 && currentLevel < 3) {
                    newLevel = 3;
                } else if (percentUsed >= ESCALATION_THRESHOLDS.LEVEL_2 && currentLevel < 2) {
                    newLevel = 2;
                } else if (percentUsed >= ESCALATION_THRESHOLDS.LEVEL_1 && currentLevel < 1) {
                    newLevel = 1;
                }

                if (newLevel > currentLevel) {
                    // Update escalation level
                    await db.update(ncr)
                        .set({
                            escalationLevel: newLevel,
                            updatedAt: new Date(),
                        })
                        .where(eq(ncr.id, ncrRecord.id));

                    // Send notifications based on level
                    await sendEscalationNotification(ncrRecord, newLevel, hoursRemaining);

                    if (newLevel === 1) {
                        result.reminders++;
                    } else {
                        result.escalations++;
                    }

                    // Log audit
                    await db.insert(auditLog).values({
                        userId: "SYSTEM",
                        action: "NCR_SLA_ESCALATION",
                        entityType: "NCR",
                        entityId: ncrRecord.id,
                        metadata: JSON.stringify({
                            fromLevel: currentLevel,
                            toLevel: newLevel,
                            hoursRemaining,
                            percentUsed: Math.round(percentUsed * 100),
                        }),
                    });
                }
            } catch (error) {
                result.errors.push(`NCR ${ncrRecord.ncrNumber}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }

        return result;
    } catch (error) {
        console.error("[NCR_SLA_ENGINE]", error);
        result.errors.push(error instanceof Error ? error.message : "Unknown error");
        return result;
    }
}

/**
 * Send escalation notification
 */
async function sendEscalationNotification(
    ncrRecord: any,
    level: number,
    hoursRemaining: number
) {
    try {
        let recipientId: string | null = null;
        let notificationType: string;
        let title: string;
        let message: string;

        const ncrRef = `${ncrRecord.ncrNumber} - ${ncrRecord.title}`;
        const poRef = ncrRecord.purchaseOrder?.poNumber || "N/A";

        switch (level) {
            case 1:
                // Reminder to assignee
                recipientId = ncrRecord.assignedTo || ncrRecord.reportedBy;
                notificationType = "NCR_SLA_REMINDER";
                title = `⏰ NCR SLA Warning: ${ncrRecord.ncrNumber}`;
                message = `NCR "${ncrRef}" is approaching its SLA deadline. ${Math.round(hoursRemaining)} hours remaining.`;
                break;

            case 2:
                // Escalate to PM (find PM in organization)
                const pm = await db.query.user.findFirst({
                    where: and(
                        eq(user.organizationId, ncrRecord.organizationId),
                        eq(user.role, "PM"),
                    ),
                });
                recipientId = pm?.id || ncrRecord.reportedBy;
                notificationType = "NCR_SLA_ESCALATION";
                title = `🚨 NCR Overdue: ${ncrRecord.ncrNumber}`;
                message = `NCR "${ncrRef}" on PO ${poRef} has exceeded SLA. Immediate action required.`;
                break;

            case 3:
                // Escalate to Admin/Executive
                const admin = await db.query.user.findFirst({
                    where: and(
                        eq(user.organizationId, ncrRecord.organizationId),
                        eq(user.role, "ADMIN"),
                    ),
                });
                recipientId = admin?.id || ncrRecord.reportedBy;
                notificationType = "NCR_SLA_CRITICAL";
                title = `🔴 CRITICAL: NCR ${ncrRecord.ncrNumber} - ${ncrRecord.severity}`;
                message = `${ncrRecord.severity} NCR "${ncrRef}" is severely overdue. Executive attention required.`;
                break;

            default:
                return;
        }

        if (!recipientId) return;

        // Create in-app notification
        await db.insert(notification).values({
            userId: recipientId,
            title,
            message,
            type: notificationType,
        });

        // Get recipient email
        const recipient = await db.query.user.findFirst({
            where: eq(user.id, recipientId),
        });

        if (recipient?.email) {
            const ctaUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/procurement?ncr=${ncrRecord.id}`;
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">${title}</h2>
                    <p>Hi ${recipient.name || "Team Member"},</p>
                    <p>${message}</p>
                    <a href="${ctaUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
                        View NCR
                    </a>
                </div>
            `;

            await sendEmail({
                to: recipient.email,
                subject: title,
                html,
            });
        }
    } catch (error) {
        console.error("[SEND_NCR_ESCALATION]", error);
    }
}

/**
 * Get overdue NCRs summary for dashboard
 */
export async function getOverdueNCRsSummary(organizationId: string) {
    try {
        const now = new Date();

        const overdueNCRs = await db.query.ncr.findMany({
            where: and(
                eq(ncr.organizationId, organizationId),
                not(eq(ncr.status, "CLOSED")),
                lt(ncr.slaDueAt, now),
            ),
            with: {
                supplier: true,
                purchaseOrder: true,
                assignee: true,
            },
            orderBy: (n, { asc }) => [asc(n.slaDueAt)],
        });

        return {
            success: true,
            data: {
                count: overdueNCRs.length,
                ncrs: overdueNCRs.map(n => ({
                    id: n.id,
                    ncrNumber: n.ncrNumber,
                    title: n.title,
                    severity: n.severity,
                    supplier: n.supplier?.name,
                    poNumber: n.purchaseOrder?.poNumber,
                    daysOverdue: Math.ceil((now.getTime() - new Date(n.slaDueAt!).getTime()) / (1000 * 60 * 60 * 24)),
                    escalationLevel: n.escalationLevel,
                })),
            },
        };
    } catch (error) {
        console.error("[GET_OVERDUE_NCRS]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch overdue NCRs" };
    }
}
