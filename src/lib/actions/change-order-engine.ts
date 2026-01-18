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
    clientInstruction,
    boqItem,
    project,
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

// --- Phase 5 Revised: Client-Driven CO Types ---

interface CreateClientInstructionInput {
    projectId: string;
    instructionNumber: string;
    dateReceived: Date;
    type: "SITE_INSTRUCTION" | "ARCHITECT_INSTRUCTION" | "EMAIL_VARIATION";
    description?: string;
    attachmentUrl: string; // Mandatory
}

interface CreateVariationOrderInput {
    purchaseOrderId: string;
    clientInstructionId: string;
    items: Array<{
        itemNumber: string;
        description: string;
        unit: string;
        quantity: number;
        unitPrice: number;
    }>;
    reason: string;
}

interface CreateDeScopeInput {
    purchaseOrderId: string;
    clientInstructionId: string;
    items: Array<{
        id: string;
        reductionQuantity: number;
    }>;
    reason: string;
}

interface UpdateProgressInput {
    boqItemId: string;
    quantityInstalled?: number;
    quantityCertified?: number;
}

interface NetContractSummary {
    originalContract: number;
    additions: number;
    omissions: number;
    revisedTotal: number;
    variationOrders: Array<{
        voNumber: string;
        description: string;
        amount: number;
        status: string;
    }>;
}

// --- Helper Functions ---

async function getCurrentUser() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user;
}

async function logAudit(action: string, entityType: string, entityId: string, metadata?: object) {
    const currentUser = await getCurrentUser();
    await db.insert(auditLog).values({
        userId: currentUser?.id || null,
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

async function generateVONumber(projectId: string): Promise<string> {
    // Count existing VOs (BOQ items with isVariation = true) in the project
    const existingVOs = await db.select({ count: sql<number>`count(DISTINCT variation_order_number)` })
        .from(boqItem)
        .innerJoin(purchaseOrder, eq(boqItem.purchaseOrderId, purchaseOrder.id))
        .where(and(
            eq(purchaseOrder.projectId, projectId),
            eq(boqItem.isVariation, true)
        ));

    const voCount = Number(existingVOs[0]?.count || 0) + 1;
    return `VO-${voCount.toString().padStart(3, '0')}`;
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
        if (co.changeOrderType === "OMISSION" && co.affectedBoqItemIds) {
            // Nothing extra needed for omission as safety checks were done at creation
            // and quantity certification logic is separate.
        }

        // AUTO-UPDATE Client Instruction Status
        if (co.clientInstructionId) {
            await db.update(clientInstruction)
                .set({
                    status: "APPROVED",
                    updatedAt: new Date()
                })
                .where(eq(clientInstruction.id, co.clientInstructionId));
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

// --- Phase 5 Revised: Client-Driven Change Order Functions ---

/**
 * Create a new client instruction (letter/email reference for variations).
 * Requires mandatory attachment for legal traceability.
 */
export async function createClientInstruction(input: CreateClientInstructionInput) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        if (!input.attachmentUrl) {
            return { success: false, error: "Attachment is mandatory for client instructions" };
        }

        const [newInstruction] = await db.insert(clientInstruction).values({
            projectId: input.projectId,
            instructionNumber: input.instructionNumber,
            dateReceived: input.dateReceived,
            type: input.type,
            description: input.description,
            attachmentUrl: input.attachmentUrl,
            status: "PENDING_ESTIMATE",
        }).returning();

        await logAudit("CLIENT_INSTRUCTION_CREATED", "client_instruction", newInstruction.id, {
            projectId: input.projectId,
            instructionNumber: input.instructionNumber,
            type: input.type,
        });

        revalidatePath("/procurement");
        return { success: true, data: newInstruction };
    } catch (error) {
        console.error("[createClientInstruction] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to create client instruction" };
    }
}

/**
 * Create a Variation Order - adds new BOQ items linked to a client instruction.
 */
export async function createVariationOrder(input: CreateVariationOrderInput) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        // Get PO and project
        const po = await db.query.purchaseOrder.findFirst({
            where: eq(purchaseOrder.id, input.purchaseOrderId),
        });

        if (!po) {
            return { success: false, error: "Purchase order not found" };
        }

        // Generate VO number
        const voNumber = await generateVONumber(po.projectId);

        // Calculate total for all new items
        let totalAddition = 0;
        const newItems: any[] = [];

        for (const item of input.items) {
            const totalPrice = item.quantity * item.unitPrice;
            totalAddition += totalPrice;

            const [newItem] = await db.insert(boqItem).values({
                purchaseOrderId: input.purchaseOrderId,
                itemNumber: item.itemNumber,
                description: item.description,
                unit: item.unit,
                quantity: item.quantity.toString(),
                unitPrice: item.unitPrice.toString(),
                totalPrice: totalPrice.toString(),
                isVariation: true,
                variationOrderNumber: voNumber,
                clientInstructionId: input.clientInstructionId,
                originalQuantity: item.quantity.toString(),
            }).returning();

            newItems.push(newItem);
        }

        // Create change order record
        const currentValue = Number(po.totalValue) || 0;
        const newTotalValue = currentValue + totalAddition;
        const changeNumber = await generateCONumber(input.purchaseOrderId);

        const [newCO] = await db.insert(changeOrder).values({
            purchaseOrderId: input.purchaseOrderId,
            changeNumber,
            reason: input.reason,
            amountDelta: totalAddition.toString(),
            newTotalValue: newTotalValue.toString(),
            status: "SUBMITTED",
            requestedBy: user.id,
            requestedAt: new Date(),
            changeOrderType: "ADDITION",
            clientInstructionId: input.clientInstructionId,
            affectedBoqItemIds: newItems.map(item => item.id),
        }).returning();

        // Update PO total value
        await db.update(purchaseOrder)
            .set({ totalValue: newTotalValue.toString(), updatedAt: new Date() })
            .where(eq(purchaseOrder.id, input.purchaseOrderId));

        await logAudit("VARIATION_ORDER_CREATED", "change_order", newCO.id, {
            voNumber,
            itemCount: newItems.length,
            totalAddition,
            clientInstructionId: input.clientInstructionId,
        });

        revalidatePath("/procurement");
        return { success: true, data: { changeOrder: newCO, items: newItems, voNumber } };
    } catch (error) {
        console.error("[createVariationOrder] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to create variation order" };
    }
}

/**
 * Create a De-Scope - reduces existing BOQ item quantity.
 * SAFETY: Cannot reduce below certified quantity.
 */
/**
 * Create a De-Scope - reduces existing BOQ item quantities.
 * SAFETY: Cannot reduce below certified quantity.
 */
export async function createDeScope(input: CreateDeScopeInput) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        // Get PO
        const po = await db.query.purchaseOrder.findFirst({
            where: eq(purchaseOrder.id, input.purchaseOrderId),
        });

        if (!po) {
            return { success: false, error: "Purchase order not found" };
        }

        let totalAmountOmission = 0;
        const affectedItemIds: string[] = [];
        const processedItems: any[] = [];

        // Validate and process each item
        for (const inputItem of input.items) {
            const item = await db.query.boqItem.findFirst({
                where: eq(boqItem.id, inputItem.id),
            });

            if (!item) {
                return { success: false, error: `BOQ item ${inputItem.id} not found` };
            }

            const currentQty = Number(item.originalQuantity || item.quantity);
            const revisedQty = currentQty - inputItem.reductionQuantity;
            const certifiedQty = Number(item.quantityCertified) || 0;

            // SAFETY CHECK
            if (revisedQty < certifiedQty) {
                return {
                    success: false,
                    error: `Cannot reduce item "${item.description}" below certified amount (${certifiedQty}).`
                };
            }

            const unitPrice = Number(item.unitPrice);
            const amountOmission = inputItem.reductionQuantity * unitPrice;

            totalAmountOmission += amountOmission;
            affectedItemIds.push(item.id);
            processedItems.push({ item, revisedQty, amountOmission });
        }

        // Apply updates
        for (const p of processedItems) {
            await db.update(boqItem)
                .set({
                    originalQuantity: p.item.originalQuantity || p.item.quantity,
                    quantity: p.revisedQty.toString(), // Update main quantity
                    revisedQuantity: p.revisedQty.toString(),
                    totalPrice: (p.revisedQty * Number(p.item.unitPrice)).toString(),
                    updatedAt: new Date(),
                })
                .where(eq(boqItem.id, p.item.id));
        }

        // Create change order for de-scope
        const currentValue = Number(po.totalValue) || 0;
        const newTotalValue = currentValue - totalAmountOmission;
        const changeNumber = await generateCONumber(input.purchaseOrderId);

        const [newCO] = await db.insert(changeOrder).values({
            purchaseOrderId: input.purchaseOrderId,
            changeNumber,
            reason: input.reason,
            amountDelta: (-totalAmountOmission).toString(), // Negative for omission
            newTotalValue: newTotalValue.toString(),
            status: "SUBMITTED",
            requestedBy: user.id,
            requestedAt: new Date(),
            changeOrderType: "OMISSION",
            clientInstructionId: input.clientInstructionId,
            affectedBoqItemIds: affectedItemIds,
        }).returning();

        // Update PO total
        await db.update(purchaseOrder)
            .set({ totalValue: newTotalValue.toString(), updatedAt: new Date() })
            .where(eq(purchaseOrder.id, input.purchaseOrderId));

        await logAudit("DE_SCOPE_CREATED", "change_order", newCO.id, {
            itemCount: processedItems.length,
            totalAmountOmission,
            clientInstructionId: input.clientInstructionId,
        });

        revalidatePath("/procurement");
        return { success: true, data: newCO };
    } catch (error) {
        console.error("[createDeScope] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to create de-scope" };
    }
}

/**
 * Update quantity installed (Site Engineer action).
 * CONSTRAINT: Cannot install more than delivered.
 */
export async function updateQuantityInstalled(input: UpdateProgressInput) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        const item = await db.query.boqItem.findFirst({
            where: eq(boqItem.id, input.boqItemId),
        });

        if (!item) {
            return { success: false, error: "BOQ item not found" };
        }

        if (input.quantityInstalled !== undefined) {
            const delivered = Number(item.quantityDelivered) || 0;
            if (input.quantityInstalled > delivered) {
                return {
                    success: false,
                    error: `Cannot install more than delivered (${delivered})`
                };
            }

            await db.update(boqItem)
                .set({
                    quantityInstalled: input.quantityInstalled.toString(),
                    updatedAt: new Date(),
                })
                .where(eq(boqItem.id, input.boqItemId));
        }

        await logAudit("QUANTITY_INSTALLED_UPDATED", "boq_item", input.boqItemId, {
            quantityInstalled: input.quantityInstalled,
        });

        revalidatePath("/procurement");
        return { success: true };
    } catch (error) {
        console.error("[updateQuantityInstalled] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to update quantity installed" };
    }
}

/**
 * Certify quantity for payment (QS/PM action).
 * CONSTRAINT: Cannot certify more than installed.
 */
export async function certifyQuantity(input: UpdateProgressInput) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        const item = await db.query.boqItem.findFirst({
            where: eq(boqItem.id, input.boqItemId),
        });

        if (!item) {
            return { success: false, error: "BOQ item not found" };
        }

        if (input.quantityCertified !== undefined) {
            const installed = Number(item.quantityInstalled) || 0;
            if (input.quantityCertified > installed) {
                return {
                    success: false,
                    error: `Cannot certify more than installed (${installed})`
                };
            }

            await db.update(boqItem)
                .set({
                    quantityCertified: input.quantityCertified.toString(),
                    lockedForDeScope: input.quantityCertified > 0, // Lock if any certified
                    updatedAt: new Date(),
                })
                .where(eq(boqItem.id, input.boqItemId));
        }

        await logAudit("QUANTITY_CERTIFIED", "boq_item", input.boqItemId, {
            quantityCertified: input.quantityCertified,
        });

        revalidatePath("/procurement");
        return { success: true };
    } catch (error) {
        console.error("[certifyQuantity] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to certify quantity" };
    }
}

/**
 * Get Net Contract Summary for Bridge Chart (Project Level).
 * Returns: Original + Additions - Omissions = Revised Total
 */
export async function getNetContractSummary(projectId: string): Promise<{ success: boolean; data?: NetContractSummary; error?: string }> {
    try {
        // Get all POs for project
        const pos = await db.query.purchaseOrder.findMany({
            where: eq(purchaseOrder.projectId, projectId),
        });

        if (pos.length === 0) {
            return { success: true, data: { originalContract: 0, additions: 0, omissions: 0, revisedTotal: 0, variationOrders: [] } };
        }

        const poIds = pos.map(p => p.id);

        // Get all change orders for these POs
        const cos = await db.query.changeOrder.findMany({
            where: sql`${changeOrder.purchaseOrderId} IN (${sql.join(poIds.map(id => sql`${id}`), sql`, `)})`,
            with: {
                clientInstruction: true,
            }
        });

        let additions = 0;
        let omissions = 0;
        const variationOrders: NetContractSummary["variationOrders"] = [];

        for (const co of cos) {
            if (co.status !== "APPROVED") continue;

            const amount = Number(co.amountDelta) || 0;
            if (co.changeOrderType === "ADDITION" || amount > 0) {
                additions += Math.abs(amount);
                variationOrders.push({
                    voNumber: co.changeNumber,
                    description: co.reason || "",
                    amount: Math.abs(amount),
                    status: co.status,
                });
            } else {
                omissions += Math.abs(amount);
            }
        }

        // Calculate original contract by subtracting net changes from current totals
        const currentTotal = pos.reduce((sum, po) => sum + (Number(po.totalValue) || 0), 0);
        const originalContract = currentTotal - additions + omissions;

        return {
            success: true,
            data: {
                originalContract,
                additions,
                omissions,
                revisedTotal: currentTotal,
                variationOrders,
            },
        };
    } catch (error) {
        console.error("[getNetContractSummary] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to get net contract summary" };
    }
}
