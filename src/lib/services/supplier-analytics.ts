import db from "@/db/drizzle";
import {
  invoice,
  milestone,
  ncr,
  progressRecord,
  purchaseOrder,
  shipment,
  supplierDocument,
} from "@/db/schema";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getSupplierProjects } from "@/lib/utils/supplier-project-context";
import type {
  ComplianceData,
  DeliveryTimelineItem,
  DocumentStatusItem,
  InvoiceCyclePoint,
  InvoiceItem,
  MilestoneItem,
  NCRItem,
  NCRMonthData,
  POItem,
  POStatusData,
  SupplierKPIs,
} from "@/components/dashboard/supplier/analytics-shared";

export interface SupplierAnalyticsFilters {
  organizationId: string;
  supplierId: string;
  projectId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SupplierAnalyticsPayload {
  projects: { id: string; name: string }[];
  kpis: SupplierKPIs;
  pos: POItem[];
  poStatus: POStatusData;
  deliveryTimeline: DeliveryTimelineItem[];
  invoiceCycle: InvoiceCyclePoint[];
  invoices: InvoiceItem[];
  complianceData: ComplianceData;
  documents: DocumentStatusItem[];
  ncrMonthly: NCRMonthData[];
  ncrs: NCRItem[];
  milestones: MilestoneItem[];
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function diffInDays(start: Date | string, end: Date | string) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Math.max(0, Math.round((endTime - startTime) / (1000 * 60 * 60 * 24)));
}

function buildPoConditions(filters: SupplierAnalyticsFilters) {
  const conditions = [
    eq(purchaseOrder.organizationId, filters.organizationId),
    eq(purchaseOrder.supplierId, filters.supplierId),
    eq(purchaseOrder.isDeleted, false),
  ];

  if (filters.projectId) {
    conditions.push(eq(purchaseOrder.projectId, filters.projectId));
  }

  if (filters.dateFrom) {
    conditions.push(gte(purchaseOrder.createdAt, filters.dateFrom));
  }

  if (filters.dateTo) {
    conditions.push(lte(purchaseOrder.createdAt, filters.dateTo));
  }

  return conditions;
}

function buildInvoiceConditions(filters: SupplierAnalyticsFilters) {
  const conditions = [
    eq(invoice.supplierId, filters.supplierId),
    eq(invoice.isDeleted, false),
    eq(purchaseOrder.organizationId, filters.organizationId),
    eq(purchaseOrder.isDeleted, false),
  ];

  if (filters.projectId) {
    conditions.push(eq(purchaseOrder.projectId, filters.projectId));
  }

  if (filters.dateFrom) {
    conditions.push(gte(invoice.invoiceDate, filters.dateFrom));
  }

  if (filters.dateTo) {
    conditions.push(lte(invoice.invoiceDate, filters.dateTo));
  }

  return conditions;
}

function buildNcrConditions(filters: SupplierAnalyticsFilters) {
  const conditions = [
    eq(ncr.organizationId, filters.organizationId),
    eq(ncr.supplierId, filters.supplierId),
    eq(ncr.isDeleted, false),
  ];

  if (filters.projectId) {
    conditions.push(eq(ncr.projectId, filters.projectId));
  }

  if (filters.dateFrom) {
    conditions.push(gte(ncr.reportedAt, filters.dateFrom));
  }

  if (filters.dateTo) {
    conditions.push(lte(ncr.reportedAt, filters.dateTo));
  }

  return conditions;
}

function buildShipmentConditions(filters: SupplierAnalyticsFilters) {
  const conditions = [
    eq(purchaseOrder.organizationId, filters.organizationId),
    eq(purchaseOrder.supplierId, filters.supplierId),
    eq(purchaseOrder.isDeleted, false),
    eq(shipment.isDeleted, false),
  ];

  if (filters.projectId) {
    conditions.push(eq(purchaseOrder.projectId, filters.projectId));
  }

  if (filters.dateFrom) {
    conditions.push(sql`COALESCE(${shipment.dispatchDate}, ${shipment.createdAt}) >= ${filters.dateFrom}`);
  }

  if (filters.dateTo) {
    conditions.push(sql`COALESCE(${shipment.dispatchDate}, ${shipment.createdAt}) <= ${filters.dateTo}`);
  }

  return conditions;
}

function buildDocumentStatus(status: string | null | undefined, validUntil: Date | null | undefined) {
  const normalized = (status || "").toUpperCase();
  if (normalized === "MISSING") return "missing" as const;
  if (validUntil) {
    const expiry = new Date(validUntil);
    if (expiry.getTime() < Date.now()) return "expired" as const;
    const daysUntilExpiry = diffInDays(new Date(), expiry);
    if (daysUntilExpiry <= 30) return "expiring" as const;
  }
  if (normalized === "EXPIRED") return "expired" as const;
  if (normalized === "EXPIRING") return "expiring" as const;
  return "valid" as const;
}

function calculateDeliveryProgress(progressRows: { percentComplete: string | null }[]) {
  if (progressRows.length === 0) return 0;
  const total = progressRows.reduce((sum, row) => sum + Number(row.percentComplete || 0), 0);
  return Math.round(total / progressRows.length);
}

export async function getSupplierAnalyticsData(
  filters: SupplierAnalyticsFilters,
): Promise<SupplierAnalyticsPayload> {
  const projects = await getSupplierProjects(filters.supplierId, filters.organizationId);

  const [poRows, invoiceRows, ncrRows, shipmentRows, milestoneRows, documentRows] = await Promise.all([
    db.query.purchaseOrder.findMany({
      where: and(...buildPoConditions(filters)),
      with: {
        project: true,
        milestones: {
          where: eq(milestone.isDeleted, false),
          with: {
            progressRecords: {
              where: eq(progressRecord.isDeleted, false),
              orderBy: [desc(progressRecord.reportedDate)],
              limit: 1,
            },
          },
        },
      },
      orderBy: [desc(purchaseOrder.createdAt)],
    }),
    db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        poNumber: purchaseOrder.poNumber,
        amount: invoice.amount,
        paidAmount: invoice.paidAmount,
        status: invoice.status,
        submittedDate: invoice.submittedAt,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
      })
      .from(invoice)
      .innerJoin(purchaseOrder, eq(invoice.purchaseOrderId, purchaseOrder.id))
      .where(and(...buildInvoiceConditions(filters)))
      .orderBy(desc(invoice.invoiceDate)),
    db
      .select({
        id: ncr.id,
        ncrNumber: ncr.ncrNumber,
        title: ncr.title,
        severity: ncr.severity,
        status: ncr.status,
        reportedAt: ncr.reportedAt,
        slaDueAt: ncr.slaDueAt,
      })
      .from(ncr)
      .where(and(...buildNcrConditions(filters)))
      .orderBy(desc(ncr.reportedAt)),
    db
      .select({
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        poNumber: purchaseOrder.poNumber,
        description: purchaseOrder.poNumber,
        dispatchDate: shipment.dispatchDate,
        actualDeliveryDate: shipment.actualDeliveryDate,
        logisticsEta: shipment.logisticsEta,
        rosDate: shipment.rosDate,
        status: shipment.status,
      })
      .from(shipment)
      .innerJoin(purchaseOrder, eq(shipment.purchaseOrderId, purchaseOrder.id))
      .where(and(...buildShipmentConditions(filters)))
      .orderBy(desc(shipment.createdAt)),
    db
      .select({
        id: milestone.id,
        title: milestone.title,
        poNumber: purchaseOrder.poNumber,
        expectedDate: milestone.expectedDate,
        amount: milestone.amount,
        status: milestone.status,
        paymentPercentage: milestone.paymentPercentage,
      })
      .from(milestone)
      .innerJoin(purchaseOrder, eq(milestone.purchaseOrderId, purchaseOrder.id))
      .where(and(
        eq(milestone.isDeleted, false),
        ...buildPoConditions(filters),
      ))
      .orderBy(asc(milestone.expectedDate)),
    db.query.supplierDocument.findMany({
      where: eq(supplierDocument.supplierId, filters.supplierId),
      orderBy: [asc(supplierDocument.documentType)],
    }),
  ]);

  const pos: POItem[] = poRows.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    project: po.project?.name ?? "Unknown project",
    totalValue: Number(po.totalValue || 0),
    currency: po.currency || "USD",
    status: po.status || "DRAFT",
    createdAt: po.createdAt.toISOString(),
    deliveryProgress: calculateDeliveryProgress(
      po.milestones.flatMap((ms) => ms.progressRecords ?? []),
    ),
  }));

  const poStatus: POStatusData = {
    delivered: { count: 0, value: 0 },
    pending: { count: 0, value: 0 },
    overdue: { count: 0, value: 0 },
    inProgress: { count: 0, value: 0 },
    total: { count: pos.length, value: pos.reduce((sum, po) => sum + po.totalValue, 0) },
  };

  for (const po of pos) {
    const status = (po.status || "").toUpperCase();
    if (status === "COMPLETED") {
      poStatus.delivered.count += 1;
      poStatus.delivered.value += po.totalValue;
    } else if (status === "PENDING_RESPONSE" || status === "ISSUED" || status === "DRAFT") {
      poStatus.pending.count += 1;
      poStatus.pending.value += po.totalValue;
    } else {
      poStatus.inProgress.count += 1;
      poStatus.inProgress.value += po.totalValue;
    }
  }

  const invoiceCycle: InvoiceCyclePoint[] = invoiceRows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    submittedDate: toIsoDate(row.submittedDate ?? row.invoiceDate) ?? "—",
    daysToApproval: row.submittedDate
      ? diffInDays(row.submittedDate, row.paidAt ?? new Date())
      : diffInDays(row.invoiceDate, row.paidAt ?? new Date()),
    amount: Number(row.amount || 0),
    status: row.status || "PENDING_APPROVAL",
  }));

  const invoices: InvoiceItem[] = invoiceRows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    poNumber: row.poNumber ?? "—",
    amount: Number(row.amount || 0),
    status: row.status || "PENDING_APPROVAL",
    submittedDate: toIsoDate(row.submittedDate ?? row.invoiceDate) ?? "—",
    dueDate: toIsoDate(row.dueDate) ?? "—",
    paidAt: toIsoDate(row.paidAt),
  }));

  const deliveryTimeline: DeliveryTimelineItem[] = shipmentRows.map((row) => {
    const expected = row.rosDate || row.logisticsEta;
    const isDelivered = row.status === "DELIVERED" || row.status === "PARTIALLY_DELIVERED";
    const isInTransit = ["DISPATCHED", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(row.status || "");
    const isDelayed = Boolean(!isDelivered && expected && new Date(expected) < new Date());

    return {
      id: row.id,
      poNumber: row.poNumber ?? "—",
      description: row.trackingNumber || `Shipment ${row.id.slice(0, 8)}`,
      stages: [
        {
          name: "dispatch",
          date: toIsoDate(row.dispatchDate),
          status: row.dispatchDate ? "completed" : "pending",
        },
        {
          name: "transit",
          date: toIsoDate(row.dispatchDate),
          status: isDelivered ? "completed" : isInTransit ? "in-progress" : isDelayed ? "delayed" : "pending",
        },
        {
          name: "delivered",
          date: toIsoDate(row.actualDeliveryDate),
          status: isDelivered ? "completed" : isDelayed ? "delayed" : "pending",
        },
        {
          name: "inspected",
          date: null,
          status: isDelivered ? "in-progress" : "pending",
        },
      ],
    };
  });

  const ncrs: NCRItem[] = ncrRows.map((row) => ({
    id: row.id,
    ncrNumber: row.ncrNumber,
    title: row.title,
    severity: row.severity,
    status: row.status,
    reportedAt: toIsoDate(row.reportedAt) ?? "—",
    slaDueAt: toIsoDate(row.slaDueAt),
  }));

  const monthMap = new Map<string, NCRMonthData>();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  for (let i = 0; i < 6; i += 1) {
    const label = start.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    monthMap.set(label, { month: label, accepted: 0, rejected: 0, awaiting: 0 });
    start.setMonth(start.getMonth() + 1);
  }
  for (const row of ncrRows) {
    const label = new Date(row.reportedAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const bucket = monthMap.get(label);
    if (!bucket) continue;
    if (row.status === "CLOSED") {
      bucket.accepted += 1;
    } else if (row.status === "REMEDIATION" || row.status === "REINSPECTION") {
      bucket.rejected += 1;
    } else {
      bucket.awaiting += 1;
    }
  }

  const milestones: MilestoneItem[] = milestoneRows.map((row) => ({
    id: row.id,
    title: row.title,
    poNumber: row.poNumber ?? "—",
    expectedDate: toIsoDate(row.expectedDate) ?? "—",
    amount: Number(row.amount || 0),
    status: row.status || "PENDING",
    paymentPercentage: Number(row.paymentPercentage || 0),
  }));

  const documents: DocumentStatusItem[] = documentRows.map((row) => ({
    id: row.id,
    type: row.documentType,
    status: buildDocumentStatus(row.status, row.validUntil),
    expiryDate: toIsoDate(row.validUntil) ?? undefined,
    uploadDate: toIsoDate(row.createdAt) ?? undefined,
  }));

  const validDocuments = documents.filter((doc) => doc.status === "valid").length;
  const complianceData: ComplianceData = {
    overallScore: documents.length > 0 ? Math.round((validDocuments / documents.length) * 100) : 0,
    documents,
  };

  const totalPOValue = pos.reduce((sum, po) => sum + po.totalValue, 0);
  const totalPaymentsReceived = invoiceRows.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0);
  const paidCycleRows = invoiceRows.filter((row) => row.paidAt);
  const avgPaymentCycle = paidCycleRows.length > 0
    ? Math.round(
        paidCycleRows.reduce((sum, row) => sum + diffInDays(row.invoiceDate, row.paidAt as Date), 0) /
          paidCycleRows.length,
      )
    : 0;
  const onTimeDeliveryCount = shipmentRows.filter((row) => {
    if (!row.actualDeliveryDate) return false;
    const target = row.rosDate || row.logisticsEta;
    return !target || new Date(row.actualDeliveryDate) <= new Date(target);
  }).length;
  const deliveredShipmentCount = shipmentRows.filter((row) => row.actualDeliveryDate).length;
  const onTimeDeliveryScore = deliveredShipmentCount > 0
    ? Math.round((onTimeDeliveryCount / deliveredShipmentCount) * 100)
    : 0;

  const kpis: SupplierKPIs = {
    totalActivePOs: pos.filter((po) => !["COMPLETED", "CANCELLED"].includes((po.status || "").toUpperCase())).length,
    pendingDeliveries: deliveryTimeline.filter((item) =>
      item.stages.some((stage) => stage.status === "in-progress" || stage.status === "delayed"),
    ).length,
    invoicesPendingApproval: invoices.filter((row) => row.status === "PENDING_APPROVAL").length,
    ncrsAssigned: ncrs.filter((row) => row.status !== "CLOSED").length,
    onTimeDeliveryScore,
    averagePaymentCycle: avgPaymentCycle,
    upcomingDeliveriesThisWeek: shipmentRows.filter((row) => {
      const target = row.rosDate || row.logisticsEta;
      if (!target || row.actualDeliveryDate) return false;
      const daysAway = diffInDays(new Date(), target);
      return daysAway <= 7;
    }).length,
    documentComplianceScore: complianceData.overallScore,
    milestonesPendingApproval: milestones.filter((row) => row.status === "SUBMITTED").length,
    totalPaymentsReceived,
    totalPOValue,
    currency: pos[0]?.currency ?? "USD",
  };

  return {
    projects: projects.map((item) => ({ id: item.id, name: item.name })),
    kpis,
    pos,
    poStatus,
    deliveryTimeline,
    invoiceCycle,
    invoices,
    complianceData,
    documents,
    ncrMonthly: [...monthMap.values()],
    ncrs,
    milestones,
  };
}
