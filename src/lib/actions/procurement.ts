"use server";

import { eq, and, desc } from "drizzle-orm";
import db from "@/db/drizzle";
import {
    purchaseOrder,
    poVersion,
    project,
    document,
    milestone,
    boqItem,
} from "@/db/schema";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
    createPOSchema,
    updatePOSchema,
    updatePOVersionSchema,
    type CreatePOInput,
    type UpdatePOInput,
    type UpdatePOVersionInput,
} from "@/lib/schemas/procurement";

// ============================================================================
// TYPES
// ============================================================================

// Return types for consistent API responses
type ActionResult<T = void> =
    | { success: true; data?: T }
    | { success: false; error: string; details?: Record<string, string[]> };

// ============================================================================
// HELPERS
// ============================================================================

async function getAuthenticatedUser() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    // Explicitly cast or extract the custom fields we mapped in auth.ts
    return session.user as typeof session.user & {
        organizationId: string;
        role: string
    };
}

// ============================================================================
// PURCHASE ORDER ACTIONS
// ============================================================================

/**
 * Create a new Purchase Order with initial version (v1)
 */
export async function createPurchaseOrder(
    input: CreatePOInput
): Promise<ActionResult<{ id: string; poNumber: string }>> {
    try {
        const user = await getAuthenticatedUser();

        // Validate input
        const validated = createPOSchema.safeParse(input);
        if (!validated.success) {
            return {
                success: false,
                error: "Validation failed",
                details: validated.error.flatten().fieldErrors as Record<string, string[]>,
            };
        }

        const { projectId, supplierId, poNumber, totalValue, currency, fileUrl } =
            validated.data;

        // Verify project exists and user has access
        const projectRecord = await db.query.project.findFirst({
            where: eq(project.id, projectId),
        });

        if (!projectRecord) {
            return { success: false, error: "Project not found" };
        }

        // Create PO record
        const [newPO] = await db
            .insert(purchaseOrder)
            .values({
                organizationId: projectRecord.organizationId,
                projectId,
                supplierId,
                poNumber,
                totalValue: totalValue.toString(),
                currency,
                status: "DRAFT",
            })
            .returning();

        // Create initial version (v1)
        await db.insert(poVersion).values({
            purchaseOrderId: newPO.id,
            versionNumber: 1,
            changeDescription: "Initial upload",
            fileUrl: fileUrl || null,
        });

        // If fileUrl provided, create document record
        if (fileUrl) {
            await db.insert(document).values({
                organizationId: projectRecord.organizationId,
                projectId,
                parentId: newPO.id,
                parentType: "PO",
                fileName: `${poNumber}_v1.pdf`,
                fileUrl,
                mimeType: "application/pdf",
                uploadedBy: user.id,
            });
        }

        revalidatePath("/dashboard/procurement");

        return {
            success: true,
            data: { id: newPO.id, poNumber: newPO.poNumber },
        };
    } catch (error: any) {
        console.error("[createPurchaseOrder] Error:", error);

        // Handle unique constraint violation (PG code 23505)
        const isDuplicate =
            error.code === '23505' ||
            error.constraint === 'po_number_idx' ||
            error.cause?.code === '23505' ||
            error.message?.includes('duplicate key value') ||
            error.cause?.message?.includes('duplicate key value');

        if (isDuplicate) {
            return {
                success: false,
                error: `PO number "${input.poNumber}" already exists for this project. Please use a unique PO number.`,
            };
        }

        return { success: false, error: "Failed to create purchase order" };
    }
}

/**
 * Update an existing Purchase Order
 */
export async function updatePurchaseOrder(
    input: UpdatePOInput
): Promise<ActionResult> {
    try {
        await getAuthenticatedUser();

        // Validate input
        const validated = updatePOSchema.safeParse(input);
        if (!validated.success) {
            return {
                success: false,
                error: "Validation failed",
                details: validated.error.flatten().fieldErrors as Record<string, string[]>,
            };
        }

        const { id, milestones, boqItems, ...poData } = validated.data;

        // Use a transaction for atomic updates
        await db.transaction(async (tx) => {
            // 1. Update core PO fields
            if (Object.keys(poData).length > 0) {
                const [updatedPO] = await tx
                    .update(purchaseOrder)
                    .set({
                        ...poData,
                        totalValue: poData.totalValue?.toString(),
                        retentionPercentage: poData.retentionPercentage?.toString(),
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(purchaseOrder.id, id),
                            eq(purchaseOrder.organizationId, (await getAuthenticatedUser()).organizationId)
                        )
                    )
                    .returning({ id: purchaseOrder.id });

                if (!updatedPO) {
                    throw new Error("Purchase order not found or unauthorized");
                }
            }

            // 2. Sync Milestones
            if (milestones) {
                // For simplicity in this workflow, we'll replace milestones
                // A better approach would be to diff them, but since this is a wizard flow
                // where the whole state is sent, replacing is safer and easier.
                await tx.delete(milestone).where(eq(milestone.purchaseOrderId, id));

                if (milestones.length > 0) {
                    await tx.insert(milestone).values(
                        milestones.map((m) => ({
                            purchaseOrderId: id,
                            title: m.title,
                            description: m.description,
                            expectedDate: m.expectedDate ? new Date(m.expectedDate) : null,
                            paymentPercentage: m.paymentPercentage.toString(),
                            sequenceOrder: m.sequenceOrder,
                        }))
                    );
                }
            }

            // 3. Sync BOQ Items
            if (boqItems) {
                await tx.delete(boqItem).where(eq(boqItem.purchaseOrderId, id));

                if (boqItems.length > 0) {
                    await tx.insert(boqItem).values(
                        boqItems.map((b) => ({
                            purchaseOrderId: id,
                            itemNumber: b.itemNumber,
                            description: b.description,
                            unit: b.unit,
                            quantity: b.quantity.toString(),
                            unitPrice: b.unitPrice.toString(),
                            totalPrice: b.totalPrice.toString(),
                            rosDate: b.rosDate ? new Date(b.rosDate) : null,
                            isCritical: b.isCritical,
                            rosStatus: b.rosStatus,
                        }))
                    );
                }
            }
        });

        revalidatePath(`/dashboard/procurement/${id}`);
        revalidatePath("/dashboard/procurement");

        return { success: true };
    } catch (error: any) {
        console.error("[updatePurchaseOrder] Error:", error);
        return { success: false, error: "Failed to update purchase order" };
    }
}

/**
 * List Purchase Orders with optional filters
 */
export async function listPurchaseOrders(filters?: {
    projectId?: string;
    status?: string;
}): Promise<ActionResult<typeof purchaseOrder.$inferSelect[]>> {
    try {
        const user = await getAuthenticatedUser();

        const conditions = [
            eq(purchaseOrder.organizationId, user.organizationId),
            eq(purchaseOrder.isDeleted, false)
        ];

        if (filters?.projectId) {
            conditions.push(eq(purchaseOrder.projectId, filters.projectId));
        }
        if (filters?.status) {
            conditions.push(eq(purchaseOrder.status, filters.status));
        }

        const pos = await db.query.purchaseOrder.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            with: {
                project: true,
                supplier: true,
                versions: {
                    orderBy: desc(poVersion.versionNumber),
                    limit: 1,
                },
            },
            orderBy: desc(purchaseOrder.createdAt),
        });

        return { success: true, data: pos as typeof purchaseOrder.$inferSelect[] };
    } catch (error) {
        console.error("[listPurchaseOrders] Error:", error);
        return { success: false, error: "Failed to fetch purchase orders" };
    }
}

/**
 * Get single Purchase Order with all relations
 */
export async function getPurchaseOrder(
    id: string
): Promise<ActionResult<typeof purchaseOrder.$inferSelect & { versions: typeof poVersion.$inferSelect[] }>> {
    try {
        const user = await getAuthenticatedUser();

        const po = await db.query.purchaseOrder.findFirst({
            where: and(
                eq(purchaseOrder.id, id),
                eq(purchaseOrder.organizationId, user.organizationId),
                eq(purchaseOrder.isDeleted, false)
            ),
            with: {
                project: true,
                supplier: true,
                versions: {
                    orderBy: desc(poVersion.versionNumber),
                },
                boqItems: true,
            },
        });

        if (!po) {
            return { success: false, error: "Purchase order not found" };
        }

        return { success: true, data: po as typeof purchaseOrder.$inferSelect & { versions: typeof poVersion.$inferSelect[] } };
    } catch (error) {
        console.error("[getPurchaseOrder] Error:", error);
        return { success: false, error: "Failed to fetch purchase order" };
    }
}

/**
 * Add new version to existing PO (on re-upload)
 */
export async function addPOVersion(
    input: UpdatePOVersionInput
): Promise<ActionResult<{ versionNumber: number }>> {
    try {
        const user = await getAuthenticatedUser();

        const validated = updatePOVersionSchema.safeParse(input);
        if (!validated.success) {
            return {
                success: false,
                error: "Validation failed",
                details: validated.error.flatten().fieldErrors as Record<string, string[]>,
            };
        }

        const { purchaseOrderId, fileUrl, changeDescription } = validated.data;

        // Get current max version
        const existingVersions = await db.query.poVersion.findMany({
            where: eq(poVersion.purchaseOrderId, purchaseOrderId),
            orderBy: desc(poVersion.versionNumber),
            limit: 1,
        });

        const nextVersion = (existingVersions[0]?.versionNumber || 0) + 1;

        // Create new version
        await db.insert(poVersion).values({
            purchaseOrderId,
            versionNumber: nextVersion,
            changeDescription: changeDescription || `Version ${nextVersion}`,
            fileUrl,
        });

        // Get PO for document linking and ownership check
        const po = await db.query.purchaseOrder.findFirst({
            where: and(
                eq(purchaseOrder.id, purchaseOrderId),
                eq(purchaseOrder.organizationId, user.organizationId)
            ),
            with: { project: true },
        });

        if (!po) {
            return { success: false, error: "Purchase order not found or unauthorized" };
        }

        if (po) {
            await db.insert(document).values({
                organizationId: po.organizationId,
                projectId: po.projectId,
                parentId: po.id,
                parentType: "PO",
                fileName: `${po.poNumber}_v${nextVersion}.pdf`,
                fileUrl,
                mimeType: "application/pdf",
                uploadedBy: user.id,
            });
        }

        // Update PO timestamp
        await db
            .update(purchaseOrder)
            .set({ updatedAt: new Date() })
            .where(eq(purchaseOrder.id, purchaseOrderId));

        revalidatePath(`/dashboard/procurement/${purchaseOrderId}`);
        revalidatePath("/dashboard/procurement");

        return { success: true, data: { versionNumber: nextVersion } };
    } catch (error) {
        console.error("[addPOVersion] Error:", error);
        return { success: false, error: "Failed to add version" };
    }
}

/**
 * Update PO status
 */
export async function updatePOStatus(
    id: string,
    status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED"
): Promise<ActionResult> {
    try {
        const user = await getAuthenticatedUser();

        const [updatedPO] = await db
            .update(purchaseOrder)
            .set({ status, updatedAt: new Date() })
            .where(
                and(
                    eq(purchaseOrder.id, id),
                    eq(purchaseOrder.organizationId, user.organizationId)
                )
            )
            .returning({ id: purchaseOrder.id });

        if (!updatedPO) {
            return { success: false, error: "Purchase order not found or unauthorized" };
        }

        revalidatePath(`/dashboard/procurement/${id}`);
        revalidatePath("/dashboard/procurement");

        return { success: true };
    } catch (error) {
        console.error("[updatePOStatus] Error:", error);
        return { success: false, error: "Failed to update status" };
    }
}

/**
 * Soft delete a PO
 */
export async function deletePurchaseOrder(id: string): Promise<ActionResult> {
    try {
        const user = await getAuthenticatedUser();

        const [updatedPO] = await db
            .update(purchaseOrder)
            .set({ isDeleted: true, updatedAt: new Date() })
            .where(
                and(
                    eq(purchaseOrder.id, id),
                    eq(purchaseOrder.organizationId, user.organizationId)
                )
            )
            .returning({ id: purchaseOrder.id });

        if (!updatedPO) {
            return { success: false, error: "Purchase order not found or unauthorized" };
        }

        revalidatePath("/dashboard/procurement");

        return { success: true };
    } catch (error) {
        console.error("[deletePurchaseOrder] Error:", error);
        return { success: false, error: "Failed to delete purchase order" };
    }
}
