"use server";

import db from "@/db/drizzle";
import {
    changeOrder,
    purchaseOrder,
    milestone,
    financialLedger,
    auditLog,
    notification,
    user,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// --- Types ---

interface SubmitCOInput {
    purchaseOrderId: string;
    reason: string;
    amountDelta: number;
    scopeChange?: string;
    scheduleImpactDays?: number;
    affectedMilestoneIds?: string[];
}

interface ApproveCOInput {
    changeOrderId: string;
    notes?: string;
}

interface RejectCOInput {
    changeOrderId: string;
    rejectionReason: string;
}

interface COImpactSummary {
    totalCOs: number;
    approvedCOs: number;
    pendingCOs: number;
    totalCostImpact: number;
    totalScheduleImpact: number;
    affectedMilestones: number;
}

// --- Helper Functions ---

async function getCurrentUser() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user;
}

async function logAudit(action: string, entityType: string, entityId: string, metadata?: object) {
    const user = await getCurrentUser();
    await db.insert(auditLog).values({
        userId: user?.id || null,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
    });
}

async function generateCONumber(purchaseOrderId: string): Promise<string> {
    // Get PO number for prefix
    const po = await db.query.purchaseOrder.findFirst({
        where: eq(purchaseOrder.id, purchaseOrderId),
    });

    if (!po) throw new Error("PO not found");

    // Count existing COs for this PO
    const existingCOs = await db.select({ count: sql<number>`count(*)` })
        .from(changeOrder)
        .where(eq(changeOrder.purchaseOrderId, purchaseOrderId));

    const coCount = Number(existingCOs[0]?.count || 0) + 1;
    return `${po.poNumber}-CO${coCount.toString().padStart(2, '0')}`;
}

// --- Change Order Actions ---

/**
 * Submit a new change order request.
 */
export async function submitChangeOrder(input: SubmitCOInput) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        // Get current PO value
        const po = await db.query.purchaseOrder.findFirst({
            where: eq(purchaseOrder.id, input.purchaseOrderId),
        });

        if (!po) {
            return { success: false, error: "Purchase order not found" };
        }

        const currentValue = Number(po.totalValue) || 0;
        const newTotalValue = currentValue + input.amountDelta;
        const changeNumber = await generateCONumber(input.purchaseOrderId);

        // Create change order
        const [newCO] = await db.insert(changeOrder).values({
            purchaseOrderId: input.purchaseOrderId,
            changeNumber,
            reason: input.reason,
            amountDelta: input.amountDelta.toString(),
            newTotalValue: newTotalValue.toString(),
            status: "SUBMITTED",
            requestedBy: user.id,
            requestedAt: new Date(),
            scopeChange: input.scopeChange,
            scheduleImpactDays: input.scheduleImpactDays || 0,
            affectedMilestoneIds: input.affectedMilestoneIds || [],
        }).returning();

        await logAudit("CO_SUBMITTED", "change_order", newCO.id, {
            purchaseOrderId: input.purchaseOrderId,
            changeNumber,
            amountDelta: input.amountDelta,
            reason: input.reason,
        });

        // Notify PM(s) about new CO TODO: Get actual PM users
        // For now, we'll skip notification creation

        revalidatePath("/procurement");
        return { success: true, data: newCO };
    } catch (error) {
        console.error("[submitChangeOrder] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to submit change order" };
    }
}

/**
 * Get change order by ID with full details.
 */
export async function getChangeOrder(changeOrderId: string) {
    try {
        const co = await db.query.changeOrder.findFirst({
            where: eq(changeOrder.id, changeOrderId),
            with: {
                purchaseOrder: {
                    with: {
                        supplier: true,
                        project: true,
                    },
                },
                requester: true,
                approver: true,
            },
        });

        if (!co) {
            return { success: false, error: "Change order not found" };
        }

        // Get affected milestones if any
        let affectedMilestones: any[] = [];
        if (co.affectedMilestoneIds && co.affectedMilestoneIds.length > 0) {
            affectedMilestones = await db.query.milestone.findMany({
                where: sql`${milestone.id} IN (${sql.join(co.affectedMilestoneIds.map(id => sql`${id}`), sql`, `)})`,
            });
        }

        return { success: true, data: { ...co, affectedMilestones } };
    } catch (error) {
        console.error("[getChangeOrder] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to get change order" };
    }
}

/**
 * Review change order (mark as under review).
 */
export async function reviewChangeOrder(changeOrderId: string) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        const co = await db.query.changeOrder.findFirst({
            where: eq(changeOrder.id, changeOrderId),
        });

        await db.update(changeOrder)
            .set({
                status: "UNDER_REVIEW",
                updatedAt: new Date(),
            })
            .where(eq(changeOrder.id, changeOrderId));

        await logAudit("CO_UNDER_REVIEW", "change_order", changeOrderId, {
            purchaseOrderId: co?.purchaseOrderId,
        });

        revalidatePath("/procurement");
        return { success: true };
    } catch (error) {
        console.error("[reviewChangeOrder] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to update change order" };
    }
}

/**
 * Approve change order and update PO/milestone values.
 */
export async function approveChangeOrder(input: ApproveCOInput) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        const co = await db.query.changeOrder.findFirst({
            where: eq(changeOrder.id, input.changeOrderId),
        });

        if (!co) {
            return { success: false, error: "Change order not found" };
        }

        if (co.status === "APPROVED") {
            return { success: false, error: "Change order already approved" };
        }

        // Update CO status
        await db.update(changeOrder)
            .set({
                status: "APPROVED",
                approvedBy: user.id,
                approvedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(changeOrder.id, input.changeOrderId));

        // Update PO total value
        await db.update(purchaseOrder)
            .set({
                totalValue: co.newTotalValue,
                updatedAt: new Date(),
            })
            .where(eq(purchaseOrder.id, co.purchaseOrderId));

        // Get PO for ledger entry
        const po = await db.query.purchaseOrder.findFirst({
            where: eq(purchaseOrder.id, co.purchaseOrderId),
        });

        // Create ledger entry for CO adjustment
        if (po) {
            await db.insert(financialLedger).values({
                projectId: po.projectId,
                purchaseOrderId: co.purchaseOrderId,
                changeOrderId: input.changeOrderId,
                transactionType: "CO_ADJUSTMENT",
                amount: co.amountDelta,
                status: "COMMITTED",
                notes: `CO ${co.changeNumber}: ${co.reason}`,
            });
        }

        // Update affected milestones if schedule impact
        if (co.affectedMilestoneIds && co.affectedMilestoneIds.length > 0 && co.scheduleImpactDays) {
            for (const msId of co.affectedMilestoneIds) {
                const ms = await db.query.milestone.findFirst({
                    where: eq(milestone.id, msId),
                });

                if (ms && ms.expectedDate) {
                    const newExpectedDate = new Date(ms.expectedDate);
                    newExpectedDate.setDate(newExpectedDate.getDate() + co.scheduleImpactDays);

                    await db.update(milestone)
                        .set({
                            expectedDate: newExpectedDate,
                            updatedAt: new Date(),
                        })
                        .where(eq(milestone.id, msId));
                }
            }
        }

        await logAudit("CO_APPROVED", "change_order", input.changeOrderId, {
            purchaseOrderId: co.purchaseOrderId,
            changeNumber: co.changeNumber,
            approvedBy: user.id,
            amountDelta: co.amountDelta,
            newTotal: co.newTotalValue,
        });

        revalidatePath("/procurement");
        return { success: true };
    } catch (error) {
        console.error("[approveChangeOrder] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to approve change order" };
    }
}

/**
 * Reject change order with reason.
 */
export async function rejectChangeOrder(input: RejectCOInput) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        const co = await db.query.changeOrder.findFirst({
            where: eq(changeOrder.id, input.changeOrderId),
        });

        await db.update(changeOrder)
            .set({
                status: "REJECTED",
                rejectionReason: input.rejectionReason,
                approvedBy: user.id, // Tracks who rejected
                approvedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(changeOrder.id, input.changeOrderId));

        await logAudit("CO_REJECTED", "change_order", input.changeOrderId, {
            purchaseOrderId: co?.purchaseOrderId,
            rejectedBy: user.id,
            reason: input.rejectionReason,
        });

        revalidatePath("/procurement");
        return { success: true };
    } catch (error) {
        console.error("[rejectChangeOrder] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to reject change order" };
    }
}

/**
 * Get pending change orders for review.
 */
export async function getPendingChangeOrders(purchaseOrderId?: string) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        const cos = await db.query.changeOrder.findMany({
            where: and(
                purchaseOrderId ? eq(changeOrder.purchaseOrderId, purchaseOrderId) : sql`1=1`,
                sql`${changeOrder.status} IN ('SUBMITTED', 'UNDER_REVIEW')`
            ),
            with: {
                purchaseOrder: {
                    with: {
                        supplier: true,
                    },
                },
                requester: true,
            },
            orderBy: [desc(changeOrder.requestedAt)],
        });

        return { success: true, data: cos };
    } catch (error) {
        console.error("[getPendingChangeOrders] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to get pending COs" };
    }
}

/**
 * Get CO impact summary for a project or PO.
 */
export async function getCOImpactSummary(projectId?: string, purchaseOrderId?: string): Promise<{ success: boolean; data?: COImpactSummary; error?: string }> {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        let cos: any[];

        if (purchaseOrderId) {
            cos = await db.query.changeOrder.findMany({
                where: eq(changeOrder.purchaseOrderId, purchaseOrderId),
            });
        } else if (projectId) {
            // Get all POs for project, then their COs
            const pos = await db.query.purchaseOrder.findMany({
                where: eq(purchaseOrder.projectId, projectId),
            });
            const poIds = pos.map(p => p.id);

            cos = await db.query.changeOrder.findMany({
                where: sql`${changeOrder.purchaseOrderId} IN (${sql.join(poIds.map(id => sql`${id}`), sql`, `)})`,
            });
        } else {
            cos = await db.query.changeOrder.findMany({});
        }

        let totalCostImpact = 0;
        let totalScheduleImpact = 0;
        let approvedCOs = 0;
        let pendingCOs = 0;
        const affectedMilestoneSet = new Set<string>();

        for (const co of cos) {
            if (co.status === "APPROVED") {
                approvedCOs++;
                totalCostImpact += Number(co.amountDelta) || 0;
                totalScheduleImpact += co.scheduleImpactDays || 0;
            } else if (co.status === "SUBMITTED" || co.status === "UNDER_REVIEW") {
                pendingCOs++;
            }

            if (co.affectedMilestoneIds) {
                for (const msId of co.affectedMilestoneIds) {
                    affectedMilestoneSet.add(msId);
                }
            }
        }

        return {
            success: true,
            data: {
                totalCOs: cos.length,
                approvedCOs,
                pendingCOs,
                totalCostImpact,
                totalScheduleImpact,
                affectedMilestones: affectedMilestoneSet.size,
            },
        };
    } catch (error) {
        console.error("[getCOImpactSummary] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to get CO impact summary" };
    }
}

/**
 * Get all change orders for a PO.
 */
export async function getChangeOrdersForPO(purchaseOrderId: string) {
    try {
        const cos = await db.query.changeOrder.findMany({
            where: eq(changeOrder.purchaseOrderId, purchaseOrderId),
            with: {
                requester: true,
                approver: true,
            },
            orderBy: [desc(changeOrder.requestedAt)],
        });

        return { success: true, data: cos };
    } catch (error) {
        console.error("[getChangeOrdersForPO] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to get change orders" };
    }
}
