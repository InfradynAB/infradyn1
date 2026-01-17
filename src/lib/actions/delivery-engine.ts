"use server";

/**
 * Phase 6: Delivery Engine
 * 
 * Handles delivery confirmation, partial deliveries, quantity reconciliation,
 * QA task generation, and milestone progress updates.
 */

import db from "@/db/drizzle";
import {
    delivery, deliveryItem, deliveryReceipt, qaInspectionTask,
    shipment, milestone, boqItem, conflictRecord, purchaseOrder
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getVarianceThresholds } from "./config-engine";

// ============================================================================
// Types
// ============================================================================

interface ConfirmDeliveryInput {
    shipmentId: string;
    receivedBy: string;
    receivedAt?: Date;
    items: {
        boqItemId: string;
        quantityDelivered: number;
        quantityDeclared?: number;
        condition?: "GOOD" | "DAMAGED" | "MISSING_ITEMS";
        notes?: string;
    }[];
    isPartial?: boolean;
    photoDocIds?: string[];
    notes?: string;
}

interface DeliveryReceiptData {
    shipmentId: string;
    deliveryId?: string;
    receivedBy: string;
    declaredQty?: number;
    receivedQty: number;
    isPartial?: boolean;
    condition?: string;
    notes?: string;
    photoDocIds?: string[];
}

// ============================================================================
// Delivery Confirmation
// ============================================================================

/**
 * Confirm delivery of a shipment - main entry point for site receivers
 */
export async function confirmDelivery(input: ConfirmDeliveryInput) {
    try {
        // Get shipment with PO info
        const ship = await db.query.shipment.findFirst({
            where: eq(shipment.id, input.shipmentId),
            with: {
                purchaseOrder: {
                    with: { project: true }
                }
            },
        });

        if (!ship) {
            return { success: false, error: "Shipment not found" };
        }

        // Create delivery record
        const [newDelivery] = await db.insert(delivery).values({
            projectId: ship.purchaseOrder!.projectId,
            purchaseOrderId: ship.purchaseOrderId,
            shipmentId: ship.id,
            receivedDate: input.receivedAt || new Date(),
            receivedBy: input.receivedBy,
            isPartial: input.isPartial || false,
        }).returning();

        // Calculate total quantities
        let totalDeclared = 0;
        let totalReceived = 0;

        // Create delivery items
        for (const item of input.items) {
            const variancePercent = item.quantityDeclared
                ? ((item.quantityDelivered - item.quantityDeclared) / item.quantityDeclared) * 100
                : 0;

            totalDeclared += item.quantityDeclared || 0;
            totalReceived += item.quantityDelivered;

            await db.insert(deliveryItem).values({
                deliveryId: newDelivery.id,
                boqItemId: item.boqItemId,
                quantityDelivered: String(item.quantityDelivered),
                quantityDeclared: item.quantityDeclared ? String(item.quantityDeclared) : null,
                condition: item.condition || "GOOD",
                variancePercent: String(variancePercent),
                notes: item.notes,
            });

            // Update BOQ item delivered quantity
            await updateBoqDeliveredQty(item.boqItemId);
        }

        // Calculate overall variance
        const overallVariance = totalDeclared > 0
            ? ((totalReceived - totalDeclared) / totalDeclared) * 100
            : 0;

        // Create delivery receipt
        const [receipt] = await db.insert(deliveryReceipt).values({
            shipmentId: ship.id,
            deliveryId: newDelivery.id,
            receivedAt: input.receivedAt || new Date(),
            receivedBy: input.receivedBy,
            declaredQty: totalDeclared ? String(totalDeclared) : null,
            receivedQty: String(totalReceived),
            variancePercent: String(overallVariance),
            isPartial: input.isPartial || false,
            condition: input.items.every(i => i.condition === "GOOD") ? "GOOD" : "ISSUES_FOUND",
            notes: input.notes,
            photoDocIds: input.photoDocIds,
        }).returning();

        // Update shipment status
        await db.update(shipment)
            .set({
                status: input.isPartial ? "PARTIALLY_DELIVERED" : "DELIVERED",
                actualDeliveryDate: input.receivedAt || new Date(),
            })
            .where(eq(shipment.id, input.shipmentId));

        // Check for quantity variance conflicts
        await checkQuantityVarianceConflict(receipt.id, ship.purchaseOrder!.organizationId);

        // Auto-create QA inspection task
        await createQaInspectionTask(receipt.id, ship.purchaseOrderId);

        // Update milestone progress
        await updateMilestoneProgressFromDelivery(ship.purchaseOrderId);

        return {
            success: true,
            delivery: newDelivery,
            receipt,
        };
    } catch (error) {
        console.error("[confirmDelivery] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

/**
 * Update BOQ item's delivered quantity by summing all delivery items
 */
async function updateBoqDeliveredQty(boqItemId: string) {
    const items = await db.query.deliveryItem.findMany({
        where: eq(deliveryItem.boqItemId, boqItemId),
    });

    const totalDelivered = items.reduce((sum, item) => sum + Number(item.quantityDelivered), 0);

    await db.update(boqItem)
        .set({ quantityDelivered: String(totalDelivered) })
        .where(eq(boqItem.id, boqItemId));
}

// ============================================================================
// Quantity Variance & Conflict Detection
// ============================================================================

/**
 * Check if quantity variance exceeds thresholds and create conflict
 */
async function checkQuantityVarianceConflict(receiptId: string, organizationId?: string) {
    const receipt = await db.query.deliveryReceipt.findFirst({
        where: eq(deliveryReceipt.id, receiptId),
        with: {
            shipment: {
                with: { purchaseOrder: { with: { project: true } } }
            }
        },
    });

    if (!receipt) return null;

    const variance = Math.abs(Number(receipt.variancePercent));
    const thresholds = await getVarianceThresholds(organizationId);

    // Determine if conflict should be created
    if (variance <= thresholds.variancePercent) {
        return null; // Within tolerance
    }

    // Determine severity
    const severity = variance > thresholds.highVariancePercent ? "HIGH" : "MEDIUM";

    // Create conflict
    const [newConflict] = await db.insert(conflictRecord).values({
        projectId: receipt.shipment!.purchaseOrder!.projectId,
        purchaseOrderId: receipt.shipment!.purchaseOrderId,
        deliveryReceiptId: receipt.id,
        type: "QUANTITY_MISMATCH",
        state: "OPEN",
        severity,
        deviationPercent: String(variance),
        description: `Quantity variance of ${variance.toFixed(1)}% detected (Declared: ${receipt.declaredQty}, Received: ${receipt.receivedQty})`,
        supplierValue: receipt.declaredQty || undefined,
        fieldValue: receipt.receivedQty,
    }).returning();

    return newConflict.id;
}

// ============================================================================
// QA Inspection Tasks
// ============================================================================

/**
 * Auto-create QA inspection task when delivery is confirmed
 */
async function createQaInspectionTask(receiptId: string, purchaseOrderId: string) {
    // Check if task already exists
    const existing = await db.query.qaInspectionTask.findFirst({
        where: eq(qaInspectionTask.deliveryReceiptId, receiptId),
    });

    if (existing) return existing;

    // Create task with 48-hour due date
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 48);

    const [task] = await db.insert(qaInspectionTask).values({
        deliveryReceiptId: receiptId,
        purchaseOrderId,
        status: "PENDING",
        dueDate,
    }).returning();

    return task;
}

/**
 * Update QA inspection task with findings
 */
export async function updateQaTask(
    taskId: string,
    data: {
        status?: "PENDING" | "IN_PROGRESS" | "PASSED" | "FAILED" | "WAIVED";
        assignedTo?: string;
        inspectionNotes?: string;
        passedItems?: number;
        failedItems?: number;
        ncrRequired?: boolean;
    }
) {
    const [updated] = await db.update(qaInspectionTask)
        .set({
            ...data,
            completedAt: data.status && ["PASSED", "FAILED", "WAIVED"].includes(data.status)
                ? new Date()
                : undefined,
        })
        .where(eq(qaInspectionTask.id, taskId))
        .returning();

    return updated;
}

/**
 * List pending QA tasks for a PO or organization
 */
export async function listPendingQaTasks(purchaseOrderId?: string) {
    if (purchaseOrderId) {
        return db.query.qaInspectionTask.findMany({
            where: and(
                eq(qaInspectionTask.purchaseOrderId, purchaseOrderId),
                eq(qaInspectionTask.status, "PENDING")
            ),
            with: {
                deliveryReceipt: true,
                purchaseOrder: true,
            },
        });
    }

    return db.query.qaInspectionTask.findMany({
        where: eq(qaInspectionTask.status, "PENDING"),
        with: {
            deliveryReceipt: true,
            purchaseOrder: true,
        },
        limit: 50,
    });
}

// ============================================================================
// Milestone Progress Updates
// ============================================================================

/**
 * Update milestone progress based on delivery quantities
 */
async function updateMilestoneProgressFromDelivery(purchaseOrderId: string) {
    // Get all BOQ items for the PO
    const items = await db.query.boqItem.findMany({
        where: eq(boqItem.purchaseOrderId, purchaseOrderId),
    });

    // Calculate overall delivery progress
    let totalOrdered = 0;
    let totalDelivered = 0;

    for (const item of items) {
        totalOrdered += Number(item.quantity) || 0;
        totalDelivered += Number(item.quantityDelivered) || 0;
    }

    const deliveryProgress = totalOrdered > 0
        ? Math.min(100, (totalDelivered / totalOrdered) * 100)
        : 0;

    // Update PO's progress percentage
    await db.update(purchaseOrder)
        .set({ progressPercentage: String(deliveryProgress) })
        .where(eq(purchaseOrder.id, purchaseOrderId));

    // Get milestones for this PO to proportionally update
    const milestones = await db.query.milestone.findMany({
        where: eq(milestone.purchaseOrderId, purchaseOrderId),
    });

    // For each milestone, update based on delivery progress
    for (const m of milestones) {
        // Milestones tied to delivery should be updated proportionally
        // This is a simplified approach - complex logic would consider specific BOQ items per milestone
        if (m.status === "PENDING" && deliveryProgress >= Number(m.paymentPercentage)) {
            await db.update(milestone)
                .set({ status: "APPROVED" })
                .where(eq(milestone.id, m.id));
        }
    }
}

// ============================================================================
// Partial Delivery Handling
// ============================================================================

/**
 * Get remaining quantities to be delivered for a PO
 */
export async function getRemainingDeliveryQty(purchaseOrderId: string) {
    const items = await db.query.boqItem.findMany({
        where: eq(boqItem.purchaseOrderId, purchaseOrderId),
    });

    return items.map(item => ({
        boqItemId: item.id,
        description: item.description,
        ordered: Number(item.quantity) || 0,
        delivered: Number(item.quantityDelivered) || 0,
        remaining: (Number(item.quantity) || 0) - (Number(item.quantityDelivered) || 0),
        unit: item.unit,
    }));
}

// ============================================================================
// Evidence Capture
// ============================================================================

/**
 * Add photos/evidence to a delivery receipt
 */
export async function addDeliveryEvidence(
    receiptId: string,
    photoDocIds: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const receipt = await db.query.deliveryReceipt.findFirst({
            where: eq(deliveryReceipt.id, receiptId),
        });

        if (!receipt) {
            return { success: false, error: "Receipt not found" };
        }

        const existingPhotos = receipt.photoDocIds || [];
        const updatedPhotos = [...existingPhotos, ...photoDocIds];

        await db.update(deliveryReceipt)
            .set({ photoDocIds: updatedPhotos })
            .where(eq(deliveryReceipt.id, receiptId));

        return { success: true };
    } catch (error) {
        console.error("[addDeliveryEvidence] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

// ============================================================================
// Delivery Queries
// ============================================================================

/**
 * Get delivery receipt with full details
 */
export async function getDeliveryReceipt(receiptId: string) {
    return db.query.deliveryReceipt.findFirst({
        where: eq(deliveryReceipt.id, receiptId),
        with: {
            shipment: {
                with: {
                    purchaseOrder: true,
                    supplier: true,
                },
            },
            delivery: {
                with: {
                    items: {
                        with: {
                            boqItem: true,
                        },
                    },
                },
            },
            qaTasks: true,
        },
    });
}

/**
 * List deliveries for a PO
 */
export async function listDeliveriesByPO(purchaseOrderId: string) {
    return db.query.delivery.findMany({
        where: eq(delivery.purchaseOrderId, purchaseOrderId),
        with: {
            items: true,
            shipment: true,
        },
        orderBy: (delivery, { desc }) => [desc(delivery.receivedDate)],
    });
}
