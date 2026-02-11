"use server";

import db from "@/db/drizzle";
import { purchaseOrder, shipment, ncr, invoice, milestone } from "@/db/schema";
import { eq, and, inArray, lt, isNull, sql, gte } from "drizzle-orm";

export interface SupplierActionItems {
    openNcrs: number;
    pendingPos: number;
    activeShipments: number;
    pendingInvoices: number;
    overdueDeliveries: number;
    upcomingMilestones: number;
}

/**
 * Fetch all action item counts for a supplier in one go.
 * Each count represents something the supplier needs to act on.
 */
export async function getSupplierActionItems(
    supplierId: string,
    projectId?: string
): Promise<SupplierActionItems> {
    // 1. Get all POs for this supplier (optionally filtered by project)
    const poFilter = projectId
        ? and(eq(purchaseOrder.supplierId, supplierId), eq(purchaseOrder.projectId, projectId))
        : eq(purchaseOrder.supplierId, supplierId);

    const supplierPos = await db.query.purchaseOrder.findMany({
        where: poFilter,
        columns: { id: true, status: true },
    });

    const poIds = supplierPos.map((po) => po.id);

    if (poIds.length === 0) {
        return {
            openNcrs: 0,
            pendingPos: 0,
            activeShipments: 0,
            pendingInvoices: 0,
            overdueDeliveries: 0,
            upcomingMilestones: 0,
        };
    }

    // 2. POs awaiting supplier response
    const pendingPos = supplierPos.filter(
        (po) => po.status === "PENDING_RESPONSE" || po.status === "ISSUED"
    ).length;

    // 3. Open NCRs needing supplier response
    const openNcrResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(ncr)
        .where(
            and(
                eq(ncr.supplierId, supplierId),
                inArray(ncr.status, ["OPEN", "REINSPECTION"])
            )
        );
    const openNcrs = openNcrResult[0]?.count ?? 0;

    // 4. Active shipments (in transit, dispatched)
    const activeShipmentResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(shipment)
        .where(
            and(
                inArray(shipment.purchaseOrderId, poIds),
                inArray(shipment.status, ["DISPATCHED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "PENDING"])
            )
        );
    const activeShipments = activeShipmentResult[0]?.count ?? 0;

    // 5. Pending invoices
    const pendingInvoiceResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoice)
        .where(
            and(
                eq(invoice.supplierId, supplierId),
                eq(invoice.status, "PENDING_APPROVAL")
            )
        );
    const pendingInvoices = pendingInvoiceResult[0]?.count ?? 0;

    // 6. Overdue deliveries (shipments past ETA but not delivered)
    const now = new Date();
    const overdueResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(shipment)
        .where(
            and(
                inArray(shipment.purchaseOrderId, poIds),
                inArray(shipment.status, ["DISPATCHED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "PENDING"]),
                lt(
                    sql`COALESCE(${shipment.logisticsEta}, ${shipment.supplierAos})`,
                    now
                )
            )
        );
    const overdueDeliveries = overdueResult[0]?.count ?? 0;

    // 7. Upcoming milestones (due in next 14 days)
    const in14Days = new Date();
    in14Days.setDate(in14Days.getDate() + 14);

    const upcomingMilestoneResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(milestone)
        .where(
            and(
                inArray(milestone.purchaseOrderId, poIds),
                eq(milestone.status, "PENDING"),
                gte(milestone.expectedDate, now),
                lt(milestone.expectedDate, in14Days)
            )
        );
    const upcomingMilestones = upcomingMilestoneResult[0]?.count ?? 0;

    return {
        openNcrs,
        pendingPos,
        activeShipments,
        pendingInvoices,
        overdueDeliveries,
        upcomingMilestones,
    };
}
