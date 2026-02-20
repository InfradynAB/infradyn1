"use server";

import { and, eq, inArray, gte, lt, isNull } from "drizzle-orm";
import db from "@/db/drizzle";
import { boqItem, delivery, deliveryItem, purchaseOrder, shipment } from "@/db/schema";
import {
    getDisciplineLabel,
    getMaterialClasses,
    DISCIPLINES,
} from "@/lib/constants/material-categories";
import {
    computeStatus,
    worstStatus,
} from "@/lib/utils/delivery-status";

import type { DeliveryStatus } from "@/lib/utils/delivery-status";

export type { DeliveryStatus } from "@/lib/utils/delivery-status";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface DisciplineSummaryRow {
    discipline: string;
    disciplineLabel: string;
    /** Total ordered quantity (all items) */
    orderedQty: number;
    /** Quantity required on-site as of today (rosDate <= today) */
    requiredQty: number;
    /** Quantity confirmed delivered */
    deliveredQty: number;
    /** How many BOQ items still have NULL discipline (need PM attention) */
    uncategorisedCount: number;
    status: DeliveryStatus;
    /** Days past the earliest overdue ROS date, 0 if on track */
    lateDays: number;
    /** Total PO value for items in this discipline */
    valueAtRisk: number;
    /** item count */
    itemCount: number;
    /** Simple trend based on delivered qty in last 7d vs prior 7d */
    trend: "IMPROVING" | "DETERIORATING" | "STABLE" | "UNKNOWN";
}

export interface MaterialClassRow {
    materialClass: string;
    discipline: string;
    orderedQty: number;
    requiredQty: number;
    deliveredQty: number;
    status: DeliveryStatus;
    lateDays: number;
    itemCount: number;
    /** Linked PO IDs for drill-through */
    purchaseOrderIds: string[];
    /** Optional PO number mapping for fast navigation to categorisation */
    purchaseOrders?: Array<{ id: string; poNumber: string }>;
    trend: "IMPROVING" | "DETERIORATING" | "STABLE" | "UNKNOWN";
}

export interface DeliveryRow {
    deliveryId: string;
    poNumber: string;
    itemNumber: string;
    description: string;
    unit: string;
    expectedDate: Date | null;
    actualDate: Date | null;
    qty: number;
    status: "ON_TIME" | "LATE" | "NOT_DELIVERED";
}

export interface MaterialClassDetailRow {
    weekStart: Date | null;
    weekEnd: Date | null;
    label: string;
    requiredQty: number;
    deliveredQty: number;
    status: DeliveryStatus;
    lateDays: number;
    deliveries: DeliveryRow[];
}


// ─────────────────────────────────────────────────────────────────────────────
// QUERY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all BOQ items for a project, joined with PO number + supplierId */
async function fetchProjectBOQItems(projectId: string) {
    const rows = await db
        .select({
            id: boqItem.id,
            itemNumber: boqItem.itemNumber,
            description: boqItem.description,
            unit: boqItem.unit,
            quantity: boqItem.quantity,
            unitPrice: boqItem.unitPrice,
            quantityDelivered: boqItem.quantityDelivered,
            rosDate: boqItem.rosDate,
            discipline: boqItem.discipline,
            materialClass: boqItem.materialClass,
            poNumber: purchaseOrder.poNumber,
            totalValue: purchaseOrder.totalValue,
            supplierId: purchaseOrder.supplierId,
            purchaseOrderId: boqItem.purchaseOrderId,
        })
        .from(boqItem)
        .innerJoin(purchaseOrder, eq(boqItem.purchaseOrderId, purchaseOrder.id))
        .where(eq(purchaseOrder.projectId, projectId));

    return rows.map((r) => ({
        ...r,
        orderedQty: parseFloat(r.quantity ?? "0"),
        deliveredQty: parseFloat(r.quantityDelivered ?? "0"),
        unitPriceNum: parseFloat(r.unitPrice ?? "0"),
        totalValueNum: parseFloat(r.totalValue ?? "0"),
    }));
}

function startOfWeekMonday(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    // JS: 0=Sun..6=Sat. Want Monday.
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d;
}

function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function formatWeekLabel(weekStart: Date) {
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(weekStart);
}

async function computeTrendByDiscipline(projectId: string) {
    const today = new Date();
    const end = new Date(today);
    end.setHours(0, 0, 0, 0);
    const start14 = addDays(end, -14);
    const start7 = addDays(end, -7);

    const rows = await db
        .select({
            discipline: boqItem.discipline,
            receivedDate: delivery.receivedDate,
            qty: deliveryItem.quantityDelivered,
        })
        .from(deliveryItem)
        .innerJoin(delivery, eq(deliveryItem.deliveryId, delivery.id))
        .innerJoin(boqItem, eq(deliveryItem.boqItemId, boqItem.id))
        .innerJoin(purchaseOrder, eq(boqItem.purchaseOrderId, purchaseOrder.id))
        .where(and(eq(purchaseOrder.projectId, projectId), gte(delivery.receivedDate, start14), lt(delivery.receivedDate, end)));

    const byDisc = new Map<string, { last7: number; prev7: number }>();
    for (const row of rows) {
        const disc = row.discipline ?? "UNCATEGORISED";
        if (!byDisc.has(disc)) byDisc.set(disc, { last7: 0, prev7: 0 });
        const qty = Number(row.qty ?? 0);
        const received = row.receivedDate ? new Date(row.receivedDate) : null;
        if (!received) continue;
        if (received >= start7) byDisc.get(disc)!.last7 += qty;
        else byDisc.get(disc)!.prev7 += qty;
    }

    const trendFor = (disc: string): DisciplineSummaryRow["trend"] => {
        const bucket = byDisc.get(disc);
        if (!bucket) return "UNKNOWN";
        if (bucket.last7 === 0 && bucket.prev7 === 0) return "STABLE";
        if (bucket.last7 > bucket.prev7) return "IMPROVING";
        if (bucket.last7 < bucket.prev7) return "DETERIORATING";
        return "STABLE";
    };

    return { trendFor };
}

async function computeTrendByMaterialClass(projectId: string, discipline: string) {
    const today = new Date();
    const end = new Date(today);
    end.setHours(0, 0, 0, 0);
    const start14 = addDays(end, -14);
    const start7 = addDays(end, -7);

    const rows = await db
        .select({
            materialClass: boqItem.materialClass,
            receivedDate: delivery.receivedDate,
            qty: deliveryItem.quantityDelivered,
        })
        .from(deliveryItem)
        .innerJoin(delivery, eq(deliveryItem.deliveryId, delivery.id))
        .innerJoin(boqItem, eq(deliveryItem.boqItemId, boqItem.id))
        .innerJoin(purchaseOrder, eq(boqItem.purchaseOrderId, purchaseOrder.id))
        .where(
            and(
                eq(purchaseOrder.projectId, projectId),
                discipline === "UNCATEGORISED" ? isNull(boqItem.discipline) : eq(boqItem.discipline, discipline),
                gte(delivery.receivedDate, start14),
                lt(delivery.receivedDate, end),
            ),
        );

    const byClass = new Map<string, { last7: number; prev7: number }>();
    for (const row of rows) {
        const cls = row.materialClass ?? "Uncategorised";
        if (!byClass.has(cls)) byClass.set(cls, { last7: 0, prev7: 0 });
        const qty = Number(row.qty ?? 0);
        const received = row.receivedDate ? new Date(row.receivedDate) : null;
        if (!received) continue;
        if (received >= start7) byClass.get(cls)!.last7 += qty;
        else byClass.get(cls)!.prev7 += qty;
    }

    const trendFor = (cls: string): MaterialClassRow["trend"] => {
        const bucket = byClass.get(cls);
        if (!bucket) return "UNKNOWN";
        if (bucket.last7 === 0 && bucket.prev7 === 0) return "STABLE";
        if (bucket.last7 > bucket.prev7) return "IMPROVING";
        if (bucket.last7 < bucket.prev7) return "DETERIORATING";
        return "STABLE";
    };

    return { trendFor };
}

// ─────────────────────────────────────────────────────────────────────────────
// L1 — DISCIPLINE SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns one row per discipline found in the project's BOQ items.
 * Also includes an "UNCATEGORISED" row if any items lack a discipline.
 */
export async function getDeliveryCategorySummary(
    projectId: string,
): Promise<DisciplineSummaryRow[]> {
    const today = new Date();
    const items = await fetchProjectBOQItems(projectId);

    const { trendFor } = await computeTrendByDiscipline(projectId);

    const rows: DisciplineSummaryRow[] = [];

    const disciplineKeys = [...DISCIPLINES, "UNCATEGORISED"] as string[];
    for (const disc of disciplineKeys) {
        const groupItems = disc === "UNCATEGORISED"
            ? items.filter((i) => !i.discipline)
            : items.filter((i) => i.discipline === disc);

        const statuses: DeliveryStatus[] = [];
        let lateDays = 0;
        let orderedQty = 0;
        let requiredQty = 0;
        let deliveredQty = 0;
        let valueAtRisk = 0;

        for (const item of groupItems) {
            const { status, lateDays: ld } = computeStatus(
                item.rosDate,
                item.orderedQty,
                item.deliveredQty,
                today,
            );
            statuses.push(status);
            lateDays = Math.max(lateDays, ld);
            orderedQty += item.orderedQty;
            deliveredQty += item.deliveredQty;

            if (item.rosDate && item.rosDate <= today) {
                requiredQty += item.orderedQty;
            }

            if (status === "LATE" || status === "AT_RISK") {
                valueAtRisk += item.unitPriceNum * (item.orderedQty - item.deliveredQty);
            }
        }

        rows.push({
            discipline: disc,
            disciplineLabel: getDisciplineLabel(disc),
            orderedQty,
            requiredQty,
            deliveredQty,
            uncategorisedCount: disc === "UNCATEGORISED" ? groupItems.length : 0,
            status: groupItems.length === 0 ? "ON_TRACK" : worstStatus(statuses),
            lateDays,
            valueAtRisk,
            itemCount: groupItems.length,
            trend: trendFor(disc),
        });
    }

    // Sort: LATE first, then AT_RISK, UNCATEGORISED at end
    const statusOrder: Record<DeliveryStatus | "UNCATEGORISED", number> = {
        LATE: 0,
        AT_RISK: 1,
        ON_TRACK: 2,
        NO_ROS: 3,
        UNCATEGORISED: 4,
    };

    return rows.sort(
        (a, b) =>
            (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5),
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// L2 — MATERIAL CLASS SUMMARY (for a discipline)
// ─────────────────────────────────────────────────────────────────────────────

export async function getMaterialClassSummary(
    projectId: string,
    discipline: string,
): Promise<MaterialClassRow[]> {
    const today = new Date();
    const items = await fetchProjectBOQItems(projectId);

    const { trendFor } = await computeTrendByMaterialClass(projectId, discipline);

    const disciplineItems = discipline === "UNCATEGORISED"
        ? items.filter((i) => !i.discipline)
        : items.filter((i) => i.discipline === discipline);
    const rows: MaterialClassRow[] = [];

    const fixedClasses = discipline === "UNCATEGORISED" ? [] : getMaterialClasses(discipline);
    const hasUncategorised = disciplineItems.some((i) => !i.materialClass);
    const classKeys = [...fixedClasses, ...(hasUncategorised ? ["Uncategorised"] : [])];

    for (const cls of classKeys) {
        const groupItems = cls === "Uncategorised"
            ? disciplineItems.filter((i) => !i.materialClass)
            : disciplineItems.filter((i) => i.materialClass === cls);

        const statuses: DeliveryStatus[] = [];
        let lateDays = 0;
        let orderedQty = 0;
        let requiredQty = 0;
        let deliveredQty = 0;
        const poIds = new Set<string>();
        const poNumberMap = new Map<string, string>();

        for (const item of groupItems) {
            const { status, lateDays: ld } = computeStatus(
                item.rosDate,
                item.orderedQty,
                item.deliveredQty,
                today,
            );
            statuses.push(status);
            lateDays = Math.max(lateDays, ld);
            orderedQty += item.orderedQty;
            deliveredQty += item.deliveredQty;
            poIds.add(item.purchaseOrderId);
            poNumberMap.set(item.purchaseOrderId, item.poNumber);
            if (item.rosDate && item.rosDate <= today) {
                requiredQty += item.orderedQty;
            }
        }

        rows.push({
            materialClass: cls,
            discipline,
            orderedQty,
            requiredQty,
            deliveredQty,
            status: groupItems.length === 0 ? "ON_TRACK" : worstStatus(statuses),
            lateDays,
            itemCount: groupItems.length,
            purchaseOrderIds: [...poIds],
            purchaseOrders: discipline === "UNCATEGORISED"
                ? [...poNumberMap.entries()].map(([id, poNumber]) => ({ id, poNumber }))
                : undefined,
            trend: trendFor(cls),
        });
    }

    return rows.sort((a, b) => {
        const order = { LATE: 0, AT_RISK: 1, ON_TRACK: 2, NO_ROS: 3 };
        return (order[a.status] ?? 4) - (order[b.status] ?? 4);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// L3 — MATERIAL CLASS DETAIL (individual BOQ items)
// ─────────────────────────────────────────────────────────────────────────────

export async function getMaterialClassDetail(
    projectId: string,
    discipline: string,
    materialClass: string,
): Promise<MaterialClassDetailRow[]> {
    const today = new Date();
    const items = await fetchProjectBOQItems(projectId);

    const filteredItems = items.filter((i) => {
        const disciplineMatch = discipline === "UNCATEGORISED" ? !i.discipline : i.discipline === discipline;
        if (!disciplineMatch) return false;
        if (materialClass === "Uncategorised") return !i.materialClass;
        return i.materialClass === materialClass;
    });
    const boqIds = filteredItems.map((i) => i.id);

    if (boqIds.length === 0) return [];

    // Fetch delivery rows for these BOQ items.
    const deliveryRows = await db
        .select({
            deliveryId: delivery.id,
            poNumber: purchaseOrder.poNumber,
            itemNumber: boqItem.itemNumber,
            description: boqItem.description,
            unit: boqItem.unit,
            rosDate: boqItem.rosDate,
            receivedDate: delivery.receivedDate,
            qty: deliveryItem.quantityDelivered,
            logisticsEta: shipment.logisticsEta,
            shipmentActual: shipment.actualDeliveryDate,
        })
        .from(deliveryItem)
        .innerJoin(delivery, eq(deliveryItem.deliveryId, delivery.id))
        .innerJoin(boqItem, eq(deliveryItem.boqItemId, boqItem.id))
        .innerJoin(purchaseOrder, eq(boqItem.purchaseOrderId, purchaseOrder.id))
        .leftJoin(shipment, eq(delivery.shipmentId, shipment.id))
        .where(inArray(deliveryItem.boqItemId, boqIds));

    const deliveries: DeliveryRow[] = deliveryRows.map((r) => {
        const expectedDate = (r.logisticsEta ?? r.rosDate) ? new Date((r.logisticsEta ?? r.rosDate) as any) : null;
        const actualDate = (r.shipmentActual ?? r.receivedDate) ? new Date((r.shipmentActual ?? r.receivedDate) as any) : null;
        let status: DeliveryRow["status"] = "NOT_DELIVERED";
        if (actualDate && expectedDate) status = actualDate > expectedDate ? "LATE" : "ON_TIME";
        else if (actualDate) status = "ON_TIME";

        return {
            deliveryId: r.deliveryId,
            poNumber: r.poNumber,
            itemNumber: r.itemNumber,
            description: r.description,
            unit: r.unit,
            expectedDate: expectedDate,
            actualDate: actualDate,
            qty: Number(r.qty ?? 0),
            status,
        };
    });

    // Build weekly batches.
    const rosDates = filteredItems.map((i) => i.rosDate).filter(Boolean).map((d) => new Date(d as any));
    const receivedDates = deliveries.map((d) => d.actualDate).filter(Boolean) as Date[];

    const minDate = [...rosDates, ...receivedDates].sort((a, b) => a.getTime() - b.getTime())[0] ?? today;
    const maxDate = [...rosDates, ...receivedDates, today].sort((a, b) => b.getTime() - a.getTime())[0] ?? today;
    const start = startOfWeekMonday(minDate);
    const end = startOfWeekMonday(maxDate);

    const batches: MaterialClassDetailRow[] = [];

    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 7)) {
        const weekStart = new Date(cursor);
        const weekEnd = addDays(weekStart, 6);
        const label = `Week of ${formatWeekLabel(weekStart)}`;

        const requiredItems = filteredItems.filter((i) => {
            if (!i.rosDate) return false;
            const ros = new Date(i.rosDate as any);
            return ros >= weekStart && ros <= weekEnd;
        });
        const requiredQty = requiredItems.reduce((sum, i) => sum + Number(i.orderedQty || 0), 0);

        const deliveredInWeek = deliveries.filter((d) => {
            if (!d.actualDate) return false;
            return d.actualDate >= weekStart && d.actualDate <= addDays(weekEnd, 1);
        });
        const deliveredQty = deliveredInWeek.reduce((sum, d) => sum + Number(d.qty || 0), 0);

        // Status: worst of items that are due in this week, driven by today's date.
        const statuses = requiredItems.map((item) =>
            computeStatus(item.rosDate ? new Date(item.rosDate as any) : null, item.orderedQty, item.deliveredQty, today).status,
        );
        const lateDays = requiredItems.reduce((max, item) => {
            const { lateDays: ld } = computeStatus(item.rosDate ? new Date(item.rosDate as any) : null, item.orderedQty, item.deliveredQty, today);
            return Math.max(max, ld);
        }, 0);

        // Only include weeks that have either demand or deliveries.
        if (requiredQty === 0 && deliveredQty === 0) continue;

        batches.push({
            weekStart,
            weekEnd,
            label,
            requiredQty,
            deliveredQty,
            status: statuses.length === 0 ? "ON_TRACK" : worstStatus(statuses),
            lateDays,
            deliveries: deliveredInWeek,
        });
    }

    // Add an unscheduled bucket for items with no ROS date.
    const noRosItems = filteredItems.filter((i) => !i.rosDate);
    if (noRosItems.length > 0) {
        const requiredQty = 0;
        const deliveredQty = 0;
        batches.unshift({
            weekStart: null,
            weekEnd: null,
            label: "Unscheduled (No ROS date)",
            requiredQty,
            deliveredQty,
            status: "NO_ROS",
            lateDays: 0,
            deliveries: [],
        });
    }

    return batches;
}
