"use server";

/**
 * Phase 9 — Site Receiver Actions
 *
 * All queries are scoped to deliveries where receivedBy = current user,
 * or to shipments/POs that are assigned/accessible to the organisation.
 * No cost data, no other users' deliveries.
 */

import db from "@/db/drizzle";
import {
    delivery,
    deliveryItem,
    deliveryReceipt,
    shipment,
    purchaseOrder,
    boqItem,
    ncr,
    ncrAttachment,
    ncrComment,
    document,
} from "@/db/schema";
import { eq, and, desc, or, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getActiveOrganizationId } from "@/lib/utils/org-context";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper
// ─────────────────────────────────────────────────────────────────────────────
async function getReceiverSession() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthenticated");
    if (session.user.role !== "SITE_RECEIVER")
        throw new Error("Forbidden: SITE_RECEIVER role required");
    return session.user;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard summary
// ─────────────────────────────────────────────────────────────────────────────
export async function getReceiverDashboardSummary() {
    const user = await getReceiverSession();
    const orgId = await getActiveOrganizationId();

    // Deliveries this user confirmed
    const myDeliveries = await db.query.delivery.findMany({
        where: and(
            eq(delivery.receivedBy, user.id),
            eq(delivery.isDeleted, false)
        ),
        with: {
            purchaseOrder: {
                columns: { poNumber: true, status: true, currency: true },
                with: { supplier: { columns: { name: true } } },
            },
            shipment: { columns: { status: true, carrier: true, trackingNumber: true } },
        },
        orderBy: [desc(delivery.receivedDate)],
        limit: 5,
    });

    // Pending shipments – fetch org PO ids first to avoid 'where inside with' (Drizzle type-inference issue)
    const orgPoIds = orgId
        ? (await db.query.purchaseOrder.findMany({
              where: and(eq(purchaseOrder.organizationId, orgId!), eq(purchaseOrder.isDeleted, false)),
              columns: { id: true },
          })).map(p => p.id)
        : [];

    const pendingShipments = orgId && orgPoIds.length > 0
        ? await db.query.shipment.findMany({
              where: and(
                  inArray(shipment.purchaseOrderId, orgPoIds),
                  eq(shipment.isDeleted, false),
                  inArray(shipment.status, ["DISPATCHED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] as const)
              ),
              with: {
                  purchaseOrder: {
                      columns: { poNumber: true, supplierId: true },
                      with: { supplier: { columns: { name: true } } },
                  },
              },
              orderBy: [desc(shipment.createdAt)],
              limit: 6,
          })
        : [];

    // My open NCRs
    const myNcrs = orgId
        ? await db.query.ncr.findMany({
              where: and(
                  eq(ncr.reportedBy, user.id),
                  eq(ncr.isDeleted, false),
                  eq(ncr.organizationId, orgId!)
              ),
              columns: { id: true, ncrNumber: true, status: true, severity: true, title: true, reportedAt: true },
              orderBy: [desc(ncr.reportedAt)],
              limit: 5,
          })
        : [];

    return {
        recentDeliveries: myDeliveries,
        pendingShipments: pendingShipments.filter(s => s.purchaseOrder != null),
        myNcrs,
        counts: {
            totalConfirmed: myDeliveries.length,
            pending: pendingShipments.length,
            openNcrs: myNcrs.filter(n => n.status !== "CLOSED").length,
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Incoming shipments (awaiting confirmation)
// ─────────────────────────────────────────────────────────────────────────────
export async function getIncomingShipments() {
    const user = await getReceiverSession();
    const orgId = await getActiveOrganizationId();
    if (!orgId) return [];

    // Fetch org PO ids first (cheap)
    const orgPos = await db.query.purchaseOrder.findMany({
        where: and(eq(purchaseOrder.organizationId, orgId), eq(purchaseOrder.isDeleted, false)),
        columns: { id: true, poNumber: true, currency: true },
        with: { supplier: { columns: { name: true } } },
    });
    const poIds = orgPos.map(p => p.id);
    if (poIds.length === 0) return [];

    const ships = await db.query.shipment.findMany({
        where: and(
            inArray(shipment.purchaseOrderId, poIds),
            eq(shipment.isDeleted, false),
            inArray(shipment.status, [
                "DISPATCHED",
                "IN_TRANSIT",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
                "PARTIALLY_DELIVERED",
            ] as const)
        ),
        with: {
            purchaseOrder: {
                columns: { poNumber: true, currency: true, projectId: true },
                with: { supplier: { columns: { name: true } }, project: { columns: { name: true } } },
            },
        },
        orderBy: [desc(shipment.createdAt)],
    });

    return ships;
}

// ─────────────────────────────────────────────────────────────────────────────
// My confirmed deliveries
// ─────────────────────────────────────────────────────────────────────────────
export async function getMyDeliveries() {
    const user = await getReceiverSession();

    const deliveries = await db.query.delivery.findMany({
        where: and(eq(delivery.receivedBy, user.id), eq(delivery.isDeleted, false)),
        with: {
            purchaseOrder: {
                columns: { poNumber: true, currency: true },
                with: { supplier: { columns: { name: true } }, project: { columns: { name: true } } },
            },
            shipment: { columns: { status: true, carrier: true, trackingNumber: true, containerNumber: true } },
            items: {
                with: { boqItem: { columns: { description: true, unit: true } } },
            },
        },
        orderBy: [desc(delivery.receivedDate)],
    });

    return deliveries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single shipment detail (for confirm page)
// ─────────────────────────────────────────────────────────────────────────────
export type ShipmentForConfirmation = {
    id: string;
    carrier: string | null;
    trackingNumber: string | null;
    purchaseOrder: {
        poNumber: string;
        organizationId: string;
        supplier: { name: string } | null;
        project: { name: string; currency: string | null } | null;
        boqItems: {
            id: string;
            itemNumber: string | null;
            description: string | null;
            unit: string | null;
            quantity: string | null;
            quantityDelivered: string | null;
        }[];
    };
};

export async function getShipmentForConfirmation(shipmentId: string): Promise<ShipmentForConfirmation | null> {
    const user = await getReceiverSession();
    const orgId = await getActiveOrganizationId();
    if (!orgId) return null;

    const ship = await db.query.shipment.findFirst({
        where: and(eq(shipment.id, shipmentId), eq(shipment.isDeleted, false)),
        with: {
            purchaseOrder: {
                with: {
                    supplier: true,
                    project: true,
                    boqItems: true,
                },
            },
        },
    });

    if (!ship || !ship.purchaseOrder) return null;
    if (ship.purchaseOrder.organizationId !== orgId) return null;

    // Reshape to an explicit type so callers don't depend on Drizzle's deep inference
    return {
        id: ship.id,
        carrier: ship.carrier,
        trackingNumber: ship.trackingNumber,
        purchaseOrder: {
            poNumber: ship.purchaseOrder.poNumber,
            organizationId: ship.purchaseOrder.organizationId,
            supplier: ship.purchaseOrder.supplier
                ? { name: ship.purchaseOrder.supplier.name }
                : null,
            project: ship.purchaseOrder.project
                ? { name: ship.purchaseOrder.project.name, currency: ship.purchaseOrder.project.currency ?? null }
                : null,
            boqItems: ship.purchaseOrder.boqItems.map(b => ({
                id: b.id,
                itemNumber: b.itemNumber ?? null,
                description: b.description ?? null,
                unit: b.unit ?? null,
                quantity: b.quantity ?? null,
                quantityDelivered: b.quantityDelivered ?? null,
            })),
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm delivery (scoped action from delivery-engine)
// ─────────────────────────────────────────────────────────────────────────────
export async function receiverConfirmDelivery(formData: FormData) {
    const user = await getReceiverSession();

    const shipmentId = formData.get("shipmentId") as string;
    const isPartial = formData.get("isPartial") === "true";
    const notes = formData.get("notes") as string | null;
    const photoDocIds: string[] = JSON.parse((formData.get("photoDocIds") as string) || "[]");

    // Parse items array from form
    const itemsRaw = formData.get("items") as string;
    const items: {
        boqItemId: string;
        quantityDelivered: number;
        quantityDeclared?: number;
        condition: "GOOD" | "DAMAGED" | "MISSING_ITEMS";
        notes?: string;
    }[] = JSON.parse(itemsRaw || "[]");

    if (!shipmentId || items.length === 0) {
        return { success: false, error: "Missing required fields" };
    }

    // Delegate to the shared delivery-engine
    const { confirmDelivery } = await import("./delivery-engine");
    const result = await confirmDelivery({
        shipmentId,
        receivedBy: user.id,
        items,
        isPartial,
        photoDocIds,
        notes: notes || undefined,
    });

    revalidatePath("/dashboard/receiver");
    revalidatePath("/dashboard/receiver/deliveries");
    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PO Tracking — read-only, scoped to org, no cost fields exposed
// ─────────────────────────────────────────────────────────────────────────────
export async function getReceiverPOTracking() {
    const user = await getReceiverSession();
    const orgId = await getActiveOrganizationId();
    if (!orgId) return [];

    const pos = await db.query.purchaseOrder.findMany({
        where: and(
            eq(purchaseOrder.organizationId, orgId),
            eq(purchaseOrder.isDeleted, false)
        ),
        columns: {
            id: true,
            poNumber: true,
            status: true,
            currency: true,
            progressPercentage: true,
            incoterms: true,
        },
        with: {
            supplier: { columns: { name: true } },
            project: { columns: { name: true, code: true } },
            shipments: {
                columns: { id: true, status: true, logisticsEta: true, actualDeliveryDate: true, carrier: true },
                where: eq(shipment.isDeleted, false),
            },
        },
        orderBy: [desc(purchaseOrder.createdAt)],
    });

    return pos;
}

// ─────────────────────────────────────────────────────────────────────────────
// NCR — raise for own delivery only
// ─────────────────────────────────────────────────────────────────────────────
export async function getMyNCRs() {
    const user = await getReceiverSession();
    const orgId = await getActiveOrganizationId();
    if (!orgId) return [];

    const myNcrs = await db.query.ncr.findMany({
        where: and(
            eq(ncr.reportedBy, user.id),
            eq(ncr.organizationId, orgId),
            eq(ncr.isDeleted, false)
        ),
        with: {
            purchaseOrder: {
                columns: { poNumber: true },
                with: { supplier: { columns: { name: true } } },
            },
            reporter: { columns: { name: true } },
        },
        orderBy: [desc(ncr.reportedAt)],
    });

    return myNcrs;
}

export async function raiseReceiverNCR(formData: FormData) {
    const user = await getReceiverSession();
    const orgId = await getActiveOrganizationId();
    if (!orgId) return { success: false, error: "No active organization" };

    const purchaseOrderId = formData.get("purchaseOrderId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const severity = formData.get("severity") as "MINOR" | "MAJOR" | "CRITICAL";
    const issueType = formData.get("issueType") as string;
    const affectedBoqItemId = formData.get("affectedBoqItemId") as string | null;

    if (!purchaseOrderId || !title || !severity || !issueType) {
        return { success: false, error: "Missing required fields" };
    }

    // Verify PO belongs to this org
    const po = await db.query.purchaseOrder.findFirst({
        where: and(
            eq(purchaseOrder.id, purchaseOrderId),
            eq(purchaseOrder.organizationId, orgId)
        ),
        columns: { id: true, supplierId: true, projectId: true },
    });

    if (!po) return { success: false, error: "Purchase order not found or access denied" };

    const { createNCR } = await import("./ncr-engine");
    const result = await createNCR({
        organizationId: orgId,
        projectId: po.projectId,
        purchaseOrderId: po.id,
        supplierId: po.supplierId,
        title,
        description: description || undefined,
        severity,
        issueType: issueType as any,
        affectedBoqItemId: affectedBoqItemId || undefined,
        reportedBy: user.id,
    });

    revalidatePath("/dashboard/receiver/ncr");
    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Add comment to own NCR (no internal comments)
// ─────────────────────────────────────────────────────────────────────────────
export async function addReceiverNCRComment(ncrId: string, content: string) {
    const user = await getReceiverSession();

    // Ensure this NCR was reported by this user
    const record = await db.query.ncr.findFirst({
        where: and(eq(ncr.id, ncrId), eq(ncr.reportedBy, user.id), eq(ncr.isDeleted, false)),
        columns: { id: true },
    });
    if (!record) return { success: false, error: "NCR not found or access denied" };

    await db.insert(ncrComment).values({
        ncrId,
        userId: user.id,
        authorRole: "SITE_RECEIVER",
        content,
        isInternal: false,
    });

    revalidatePath(`/dashboard/receiver/ncr`);
    return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload delivery note / CMR / photo — returns a document record id stub
// (actual S3 upload is handled client-side via presigned URL pattern)
// ─────────────────────────────────────────────────────────────────────────────
export async function registerDeliveryDocument({
    parentId,
    parentType,
    fileName,
    fileUrl,
    mimeType,
    documentType,
}: {
    parentId: string;
    parentType: "PO" | "CMR" | "EVIDENCE";
    fileName: string;
    fileUrl: string;
    mimeType?: string;
    documentType?: "CMR" | "EVIDENCE" | "OTHER";
}) {
    const user = await getReceiverSession();
    const orgId = await getActiveOrganizationId();
    if (!orgId) return { success: false, error: "No active org" };

    const [doc] = await db
        .insert(document)
        .values({
            organizationId: orgId,
            parentId,
            parentType,
            fileName,
            fileUrl,
            mimeType,
            uploadedBy: user.id,
            documentType: documentType as any,
        })
        .returning({ id: document.id });

    return { success: true, documentId: doc.id };
}
