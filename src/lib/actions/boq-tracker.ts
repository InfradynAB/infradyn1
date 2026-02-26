import { and, asc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db/drizzle";
import { boqDeliveryBatch, boqItem, purchaseOrder } from "@/db/schema";

export type BoqTrackerStatus = "ON_TRACK" | "AT_RISK" | "LATE" | "NO_REQUIRED_DATE";

export interface BoqTrackerItem {
  id: string;
  purchaseOrderId: string;
  poNumber: string;
  itemNumber: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  quantityDelivered: number;
  discipline: string | null;
  materialClass: string | null;
  requiredByDate: Date | null;
  rosDate: Date | null;
  criticality: string | null;
  scheduleActivityRef: string | null;
  scheduleDaysAtRisk: number;
  status: BoqTrackerStatus;
  lateDays: number;
}

export interface BoqDisciplineSummary {
  discipline: string;
  deliveredQty: number;
  requiredQty: number;
  status: BoqTrackerStatus;
  scheduleImpactDays: number;
  itemCount: number;
}

export interface BoqMaterialSummary {
  discipline: string;
  materialClass: string;
  deliveredQty: number;
  requiredQty: number;
  status: BoqTrackerStatus;
  scheduleImpactDays: number;
  itemCount: number;
  blockingActivities: string[];
}

const BUFFER_DAYS = 7;

function numeric(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function computeBoqStatus(params: {
  requiredByDate: Date | null;
  quantity: number;
  quantityDelivered: number;
  scheduleDaysAtRisk?: number | null;
  today?: Date;
}): { status: BoqTrackerStatus; lateDays: number } {
  const today = params.today ?? new Date();
  const requiredByDate = params.requiredByDate;
  const quantity = params.quantity;
  const quantityDelivered = params.quantityDelivered;
  const scheduleDaysAtRisk = params.scheduleDaysAtRisk ?? 0;

  if (!requiredByDate) {
    return { status: "NO_REQUIRED_DATE", lateDays: 0 };
  }

  const diffDays = Math.floor((today.getTime() - requiredByDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 0 && quantityDelivered < quantity) {
    return { status: "LATE", lateDays: diffDays };
  }

  const daysUntilRequired = -diffDays;
  if (daysUntilRequired <= BUFFER_DAYS && quantityDelivered < quantity) {
    return { status: "AT_RISK", lateDays: 0 };
  }

  if (scheduleDaysAtRisk > 0) {
    return { status: "AT_RISK", lateDays: 0 };
  }

  return { status: "ON_TRACK", lateDays: 0 };
}

function worstStatus(statuses: BoqTrackerStatus[]): BoqTrackerStatus {
  if (statuses.includes("LATE")) return "LATE";
  if (statuses.includes("AT_RISK")) return "AT_RISK";
  if (statuses.every((s) => s === "NO_REQUIRED_DATE")) return "NO_REQUIRED_DATE";
  return "ON_TRACK";
}

async function fetchProjectBoqItems(projectId: string): Promise<BoqTrackerItem[]> {
  const rows = await db
    .select({
      id: boqItem.id,
      purchaseOrderId: boqItem.purchaseOrderId,
      poNumber: purchaseOrder.poNumber,
      itemNumber: boqItem.itemNumber,
      description: boqItem.description,
      unit: boqItem.unit,
      quantity: boqItem.quantity,
      unitPrice: boqItem.unitPrice,
      totalPrice: boqItem.totalPrice,
      quantityDelivered: boqItem.quantityDelivered,
      discipline: boqItem.discipline,
      materialClass: boqItem.materialClass,
      requiredByDate: boqItem.requiredByDate,
      rosDate: boqItem.rosDate,
      criticality: boqItem.criticality,
      scheduleActivityRef: boqItem.scheduleActivityRef,
      scheduleDaysAtRisk: boqItem.scheduleDaysAtRisk,
    })
    .from(boqItem)
    .innerJoin(purchaseOrder, eq(boqItem.purchaseOrderId, purchaseOrder.id))
    .where(eq(purchaseOrder.projectId, projectId))
    .orderBy(asc(boqItem.itemNumber));

  return rows.map((row) => {
    const quantity = numeric(row.quantity);
    const unitPrice = numeric(row.unitPrice);
    const totalPrice = numeric(row.totalPrice);
    const quantityDelivered = numeric(row.quantityDelivered);
    const scheduleDaysAtRisk = numeric(row.scheduleDaysAtRisk);
    const requiredByDate = row.requiredByDate ?? row.rosDate;
    const { status, lateDays } = computeBoqStatus({
      requiredByDate,
      quantity,
      quantityDelivered,
      scheduleDaysAtRisk,
    });

    return {
      id: row.id,
      purchaseOrderId: row.purchaseOrderId,
      poNumber: row.poNumber,
      itemNumber: row.itemNumber,
      description: row.description,
      unit: row.unit,
      quantity,
      unitPrice,
      totalPrice,
      quantityDelivered,
      discipline: row.discipline,
      materialClass: row.materialClass,
      requiredByDate,
      rosDate: row.rosDate,
      criticality: row.criticality,
      scheduleActivityRef: row.scheduleActivityRef,
      scheduleDaysAtRisk,
      status,
      lateDays,
    };
  });
}

export async function getBoqDisciplineSummary(projectId: string): Promise<BoqDisciplineSummary[]> {
  const items = await fetchProjectBoqItems(projectId);
  const byDiscipline = new Map<string, BoqTrackerItem[]>();

  for (const item of items) {
    const key = item.discipline ?? "UNCATEGORISED";
    if (!byDiscipline.has(key)) byDiscipline.set(key, []);
    byDiscipline.get(key)!.push(item);
  }

  const rows: BoqDisciplineSummary[] = [];

  for (const [discipline, group] of byDiscipline.entries()) {
    const requiredQty = group.reduce((acc, it) => {
      if (!it.requiredByDate) return acc;
      return it.requiredByDate <= new Date() ? acc + it.quantity : acc;
    }, 0);

    const deliveredQty = group.reduce((acc, it) => acc + it.quantityDelivered, 0);
    const statuses = group.map((it) => it.status);
    rows.push({
      discipline,
      requiredQty,
      deliveredQty,
      status: worstStatus(statuses),
      scheduleImpactDays: Math.max(...group.map((it) => it.scheduleDaysAtRisk), 0),
      itemCount: group.length,
    });
  }

  return rows.sort((a, b) => {
    const order: Record<BoqTrackerStatus, number> = {
      LATE: 0,
      AT_RISK: 1,
      ON_TRACK: 2,
      NO_REQUIRED_DATE: 3,
    };
    return order[a.status] - order[b.status];
  });
}

export async function getBoqMaterialSummary(projectId: string, discipline: string): Promise<BoqMaterialSummary[]> {
  const items = await fetchProjectBoqItems(projectId);
  const filtered = discipline === "UNCATEGORISED"
    ? items.filter((it) => !it.discipline)
    : items.filter((it) => it.discipline === discipline);

  const byMaterial = new Map<string, BoqTrackerItem[]>();
  for (const item of filtered) {
    const key = item.materialClass ?? "Uncategorised";
    if (!byMaterial.has(key)) byMaterial.set(key, []);
    byMaterial.get(key)!.push(item);
  }

  const rows: BoqMaterialSummary[] = [];

  for (const [materialClass, group] of byMaterial.entries()) {
    const requiredQty = group.reduce((acc, it) => {
      if (!it.requiredByDate) return acc;
      return it.requiredByDate <= new Date() ? acc + it.quantity : acc;
    }, 0);

    const deliveredQty = group.reduce((acc, it) => acc + it.quantityDelivered, 0);

    rows.push({
      discipline,
      materialClass,
      requiredQty,
      deliveredQty,
      status: worstStatus(group.map((it) => it.status)),
      scheduleImpactDays: Math.max(...group.map((it) => it.scheduleDaysAtRisk), 0),
      itemCount: group.length,
      blockingActivities: [...new Set(group.map((it) => it.scheduleActivityRef).filter(Boolean) as string[])],
    });
  }

  return rows.sort((a, b) => {
    const order: Record<BoqTrackerStatus, number> = {
      LATE: 0,
      AT_RISK: 1,
      ON_TRACK: 2,
      NO_REQUIRED_DATE: 3,
    };
    return order[a.status] - order[b.status];
  });
}

export async function getBoqItemsList(params: {
  projectId: string;
  discipline?: string | null;
  materialClass?: string | null;
  search?: string | null;
  status?: BoqTrackerStatus | null;
}) {
  const items = await fetchProjectBoqItems(params.projectId);

  return items.filter((item) => {
    if (params.discipline && params.discipline !== "ALL") {
      if (params.discipline === "UNCATEGORISED") {
        if (item.discipline) return false;
      } else if (item.discipline !== params.discipline) {
        return false;
      }
    }

    if (params.materialClass && params.materialClass !== "ALL") {
      if (params.materialClass === "Uncategorised") {
        if (item.materialClass) return false;
      } else if (item.materialClass !== params.materialClass) {
        return false;
      }
    }

    if (params.status && params.status !== item.status) return false;

    if (params.search) {
      const query = params.search.toLowerCase();
      const inText = [
        item.itemNumber,
        item.description,
        item.poNumber,
        item.materialClass ?? "",
        item.discipline ?? "",
      ].join(" ").toLowerCase();
      if (!inText.includes(query)) return false;
    }

    return true;
  });
}

export async function getBatchesByBoqItemIds(boqItemIds: string[]) {
  if (boqItemIds.length === 0) return [];

  const rows = await db
    .select({
      id: boqDeliveryBatch.id,
      boqItemId: boqDeliveryBatch.boqItemId,
      linkedPoId: boqDeliveryBatch.linkedPoId,
      batchLabel: boqDeliveryBatch.batchLabel,
      expectedDate: boqDeliveryBatch.expectedDate,
      actualDate: boqDeliveryBatch.actualDate,
      quantityExpected: boqDeliveryBatch.quantityExpected,
      quantityDelivered: boqDeliveryBatch.quantityDelivered,
      status: boqDeliveryBatch.status,
      notes: boqDeliveryBatch.notes,
      poNumber: purchaseOrder.poNumber,
    })
    .from(boqDeliveryBatch)
    .leftJoin(purchaseOrder, eq(boqDeliveryBatch.linkedPoId, purchaseOrder.id))
    .where(and(inArray(boqDeliveryBatch.boqItemId, boqItemIds), eq(boqDeliveryBatch.isDeleted, false)))
    .orderBy(asc(boqDeliveryBatch.expectedDate), asc(boqDeliveryBatch.batchLabel));

  return rows.map((row) => ({
    ...row,
    quantityExpected: numeric(row.quantityExpected),
    quantityDelivered: numeric(row.quantityDelivered),
  }));
}

export async function recalculateBoqDeliveredQuantity(boqItemId: string) {
  const aggregate = await db
    .select({
      delivered: sql<string>`coalesce(sum(${boqDeliveryBatch.quantityDelivered}), 0)`,
    })
    .from(boqDeliveryBatch)
    .where(and(eq(boqDeliveryBatch.boqItemId, boqItemId), eq(boqDeliveryBatch.isDeleted, false)));

  const delivered = numeric(aggregate[0]?.delivered ?? 0);

  await db
    .update(boqItem)
    .set({
      quantityDelivered: String(delivered),
      updatedAt: new Date(),
    })
    .where(eq(boqItem.id, boqItemId));

  return delivered;
}

export async function recalculatePurchaseOrderTotal(purchaseOrderId: string) {
  const aggregate = await db
    .select({
      total: sql<string>`coalesce(sum(${boqItem.totalPrice}), 0)`,
    })
    .from(boqItem)
    .where(and(eq(boqItem.purchaseOrderId, purchaseOrderId), eq(boqItem.isDeleted, false)));

  const total = numeric(aggregate[0]?.total ?? 0);

  await db
    .update(purchaseOrder)
    .set({
      totalValue: String(total),
      updatedAt: new Date(),
    })
    .where(eq(purchaseOrder.id, purchaseOrderId));

  return total;
}
