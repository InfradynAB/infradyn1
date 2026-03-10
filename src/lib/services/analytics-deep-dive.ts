import db from "@/db/drizzle";
import {
  invoice,
  ncr,
  project,
  purchaseOrder,
  shipment,
  supplier,
} from "@/db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDashboardKPIs, type DashboardKPIs } from "@/lib/services/kpi-engine";
import { getCashflowForecast, getSupplierProgressData, type CashflowForecast, type SupplierProgressRow } from "@/lib/services/report-engine";

export interface AnalyticsDeepDiveFilters {
  organizationId: string;
  projectId?: string;
  supplierId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface FinanceInvoiceRow {
  id: string;
  invoiceNumber: string;
  poNumber: string;
  supplierName: string;
  projectName: string;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  invoiceDate: string;
  dueDate: string | null;
  paidDate: string | null;
  currency: string;
  daysOpen: number;
  isOverdue: boolean;
}

export interface FinanceAgingBucket {
  label: string;
  count: number;
  value: number;
}

export interface FinanceSupplierCycle {
  supplierName: string;
  totalInvoices: number;
  paidInvoices: number;
  avgPaymentCycleDays: number;
}

export interface FinanceDeepDiveData {
  kpis: DashboardKPIs["financial"] & DashboardKPIs["payments"] & { currency: string };
  cashflow: CashflowForecast[];
  agingBuckets: FinanceAgingBucket[];
  paymentCycle: FinanceSupplierCycle[];
  invoices: FinanceInvoiceRow[];
}

export interface QualityTrendPoint {
  month: string;
  opened: number;
  closed: number;
  critical: number;
}

export interface QualityIssueBreakdown {
  issueType: string;
  count: number;
}

export interface QualitySupplierSummary {
  supplierId: string;
  supplierName: string;
  total: number;
  open: number;
  critical: number;
  avgResolutionDays: number;
}

export interface QualityRegisterRow {
  id: string;
  ncrNumber: string;
  title: string;
  severity: string;
  status: string;
  issueType: string;
  supplierName: string;
  projectName: string;
  poNumber: string;
  reportedAt: string;
  slaDueAt: string | null;
  closedAt: string | null;
  isOverdue: boolean;
  resolutionDays: number | null;
}

export interface QualityDeepDiveData {
  kpis: {
    totalNCRs: number;
    openNCRs: number;
    criticalNCRs: number;
    overdueNCRs: number;
    closureRate: number;
    avgResolutionDays: number;
    financialImpact: number;
  };
  trend: QualityTrendPoint[];
  issueBreakdown: QualityIssueBreakdown[];
  supplierSummary: QualitySupplierSummary[];
  register: QualityRegisterRow[];
}

export interface LogisticsShipmentRow {
  id: string;
  trackingNumber: string;
  poNumber: string;
  supplierName: string;
  projectName: string;
  carrier: string;
  status: string;
  origin: string | null;
  destination: string | null;
  expectedDate: string | null;
  actualDate: string | null;
  etaConfidence: string | null;
  lastLocation: string | null;
  daysInTransit: number;
  isDelayed: boolean;
}

export interface LogisticsCarrierSummary {
  carrier: string;
  totalShipments: number;
  delivered: number;
  delayed: number;
  onTimeRate: number;
  avgTransitDays: number;
}

export interface LogisticsDeepDiveData {
  kpis: {
    totalShipments: number;
    inTransit: number;
    deliveredOnTime: number;
    delayedShipments: number;
    onTimeRate: number;
    avgDeliveryDelay: number;
  };
  carriers: LogisticsCarrierSummary[];
  shipments: LogisticsShipmentRow[];
}

export interface SupplierScoreRow {
  supplierId: string;
  supplierName: string;
  status: string;
  poCount: number;
  totalValue: number;
  paidAmount: number;
  unpaidAmount: number;
  physicalProgress: number;
  financialProgress: number;
  onTimeRate: number;
  ncrCount: number;
  riskScore: number;
  deliveryScore: number;
  qualityScore: number;
  financialAlignmentScore: number;
  overallScore: number;
}

export interface SuppliersDeepDiveData {
  summary: {
    totalSuppliers: number;
    activeSuppliers: number;
    avgDeliveryScore: number;
    avgQualityScore: number;
  };
  suppliers: SupplierScoreRow[];
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

function buildInvoiceConditions(filters: AnalyticsDeepDiveFilters) {
  const conditions = [
    eq(purchaseOrder.organizationId, filters.organizationId),
    eq(purchaseOrder.isDeleted, false),
    eq(invoice.isDeleted, false),
  ];

  if (filters.projectId) {
    conditions.push(eq(purchaseOrder.projectId, filters.projectId));
  }

  if (filters.supplierId) {
    conditions.push(eq(invoice.supplierId, filters.supplierId));
  }

  if (filters.dateFrom) {
    conditions.push(gte(invoice.invoiceDate, filters.dateFrom));
  }

  if (filters.dateTo) {
    conditions.push(lte(invoice.invoiceDate, filters.dateTo));
  }

  return conditions;
}

function buildNcrConditions(filters: AnalyticsDeepDiveFilters) {
  const conditions = [
    eq(ncr.organizationId, filters.organizationId),
    eq(ncr.isDeleted, false),
  ];

  if (filters.projectId) {
    conditions.push(eq(ncr.projectId, filters.projectId));
  }

  if (filters.supplierId) {
    conditions.push(eq(ncr.supplierId, filters.supplierId));
  }

  if (filters.dateFrom) {
    conditions.push(gte(ncr.reportedAt, filters.dateFrom));
  }

  if (filters.dateTo) {
    conditions.push(lte(ncr.reportedAt, filters.dateTo));
  }

  return conditions;
}

function buildShipmentConditions(filters: AnalyticsDeepDiveFilters) {
  const conditions = [
    eq(purchaseOrder.organizationId, filters.organizationId),
    eq(purchaseOrder.isDeleted, false),
    eq(shipment.isDeleted, false),
  ];

  if (filters.projectId) {
    conditions.push(eq(purchaseOrder.projectId, filters.projectId));
  }

  if (filters.supplierId) {
    conditions.push(eq(purchaseOrder.supplierId, filters.supplierId));
  }

  if (filters.dateFrom) {
    conditions.push(sql`COALESCE(${shipment.dispatchDate}, ${shipment.createdAt}) >= ${filters.dateFrom}`);
  }

  if (filters.dateTo) {
    conditions.push(sql`COALESCE(${shipment.dispatchDate}, ${shipment.createdAt}) <= ${filters.dateTo}`);
  }

  return conditions;
}

export async function getFinanceDeepDiveData(filters: AnalyticsDeepDiveFilters): Promise<FinanceDeepDiveData> {
  const [dashboard, cashflow, invoiceRows] = await Promise.all([
    getDashboardKPIs(filters),
    getCashflowForecast(filters),
    db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        poNumber: purchaseOrder.poNumber,
        supplierName: supplier.name,
        projectName: project.name,
        amount: invoice.amount,
        paidAmount: invoice.paidAmount,
        status: invoice.status,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        currency: purchaseOrder.currency,
      })
      .from(invoice)
      .innerJoin(purchaseOrder, eq(invoice.purchaseOrderId, purchaseOrder.id))
      .innerJoin(supplier, eq(invoice.supplierId, supplier.id))
      .innerJoin(project, eq(purchaseOrder.projectId, project.id))
      .where(and(...buildInvoiceConditions(filters)))
      .orderBy(desc(invoice.invoiceDate)),
  ]);

  const now = new Date();
  const invoices: FinanceInvoiceRow[] = invoiceRows.map((row) => {
    const amount = Number(row.amount || 0);
    const paidAmount = Number(row.paidAmount || 0);
    const outstandingAmount = Math.max(0, amount - paidAmount);
    const dueDate = row.dueDate ? new Date(row.dueDate) : null;
    const paidDate = row.paidAt ? new Date(row.paidAt) : null;
    const daysOpen = diffInDays(row.invoiceDate, paidDate ?? now);
    const isOverdue = Boolean(outstandingAmount > 0 && dueDate && dueDate < now && !paidDate);

    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      poNumber: row.poNumber,
      supplierName: row.supplierName ?? "Unknown supplier",
      projectName: row.projectName ?? "Unknown project",
      amount,
      paidAmount,
      outstandingAmount,
      status: row.status ?? "PENDING_APPROVAL",
      invoiceDate: toIsoDate(row.invoiceDate) ?? "—",
      dueDate: toIsoDate(row.dueDate),
      paidDate: toIsoDate(row.paidAt),
      currency: row.currency ?? "USD",
      daysOpen,
      isOverdue,
    };
  });

  const agingBuckets: FinanceAgingBucket[] = [
    { label: "Current", count: 0, value: 0 },
    { label: "1-30 days overdue", count: 0, value: 0 },
    { label: "31-60 days overdue", count: 0, value: 0 },
    { label: "61+ days overdue", count: 0, value: 0 },
  ];

  const supplierCycleMap = new Map<string, { supplierName: string; totalInvoices: number; paidInvoices: number; totalDays: number }>();

  for (const row of invoices) {
    if (row.outstandingAmount > 0) {
      const dueDate = row.dueDate ? new Date(row.dueDate) : null;
      const daysOverdue = dueDate ? Math.max(0, diffInDays(dueDate, now)) : 0;
      const bucketIndex = daysOverdue === 0 ? 0 : daysOverdue <= 30 ? 1 : daysOverdue <= 60 ? 2 : 3;
      agingBuckets[bucketIndex].count += 1;
      agingBuckets[bucketIndex].value += row.outstandingAmount;
    }

    const supplierCycle = supplierCycleMap.get(row.supplierName) ?? {
      supplierName: row.supplierName,
      totalInvoices: 0,
      paidInvoices: 0,
      totalDays: 0,
    };
    supplierCycle.totalInvoices += 1;
    if (row.paidDate) {
      supplierCycle.paidInvoices += 1;
      supplierCycle.totalDays += row.daysOpen;
    }
    supplierCycleMap.set(row.supplierName, supplierCycle);
  }

  const paymentCycle = [...supplierCycleMap.values()]
    .map((row) => ({
      supplierName: row.supplierName,
      totalInvoices: row.totalInvoices,
      paidInvoices: row.paidInvoices,
      avgPaymentCycleDays: row.paidInvoices > 0 ? Math.round(row.totalDays / row.paidInvoices) : 0,
    }))
    .sort((a, b) => b.totalInvoices - a.totalInvoices);

  return {
    kpis: {
      ...dashboard.financial,
      ...dashboard.payments,
      currency: invoices[0]?.currency ?? "USD",
    },
    cashflow,
    agingBuckets,
    paymentCycle,
    invoices: invoices.slice(0, 50),
  };
}

export async function getQualityDeepDiveData(filters: AnalyticsDeepDiveFilters): Promise<QualityDeepDiveData> {
  const [dashboard, rows] = await Promise.all([
    getDashboardKPIs(filters),
    db
      .select({
        id: ncr.id,
        ncrNumber: ncr.ncrNumber,
        title: ncr.title,
        severity: ncr.severity,
        status: ncr.status,
        issueType: ncr.issueType,
        supplierId: ncr.supplierId,
        supplierName: supplier.name,
        projectName: project.name,
        poNumber: purchaseOrder.poNumber,
        reportedAt: ncr.reportedAt,
        slaDueAt: ncr.slaDueAt,
        closedAt: ncr.closedAt,
        estimatedCost: ncr.estimatedCost,
      })
      .from(ncr)
      .innerJoin(supplier, eq(ncr.supplierId, supplier.id))
      .innerJoin(project, eq(ncr.projectId, project.id))
      .innerJoin(purchaseOrder, eq(ncr.purchaseOrderId, purchaseOrder.id))
      .where(and(...buildNcrConditions(filters)))
      .orderBy(desc(ncr.reportedAt)),
  ]);

  const now = new Date();
  const register: QualityRegisterRow[] = rows.map((row) => {
    const isClosed = row.status === "CLOSED";
    const resolutionDays = row.closedAt ? diffInDays(row.reportedAt, row.closedAt) : null;
    const isOverdue = !isClosed && Boolean(row.slaDueAt && new Date(row.slaDueAt) < now);

    return {
      id: row.id,
      ncrNumber: row.ncrNumber,
      title: row.title,
      severity: row.severity,
      status: row.status,
      issueType: row.issueType,
      supplierName: row.supplierName ?? "Unknown supplier",
      projectName: row.projectName ?? "Unknown project",
      poNumber: row.poNumber ?? "—",
      reportedAt: toIsoDate(row.reportedAt) ?? "—",
      slaDueAt: toIsoDate(row.slaDueAt),
      closedAt: toIsoDate(row.closedAt),
      isOverdue,
      resolutionDays,
    };
  });

  const monthKeys: string[] = [];
  const monthMap = new Map<string, QualityTrendPoint>();
  const monthCursor = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  for (let i = 0; i < 6; i++) {
    const label = monthCursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    monthKeys.push(label);
    monthMap.set(label, { month: label, opened: 0, closed: 0, critical: 0 });
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  const issueMap = new Map<string, number>();
  const supplierMap = new Map<string, QualitySupplierSummary & { totalResolutionDays: number; closedCount: number }>();
  let overdueNCRs = 0;
  let closedCount = 0;
  let totalResolutionDays = 0;

  for (const row of register) {
    const openedLabel = new Date(row.reportedAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const openedPoint = monthMap.get(openedLabel);
    if (openedPoint) {
      openedPoint.opened += 1;
      if (row.severity === "CRITICAL") {
        openedPoint.critical += 1;
      }
    }

    if (row.closedAt) {
      const closedLabel = new Date(row.closedAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const closedPoint = monthMap.get(closedLabel);
      if (closedPoint) {
        closedPoint.closed += 1;
      }
    }

    issueMap.set(row.issueType, (issueMap.get(row.issueType) ?? 0) + 1);

    const supplierRow = supplierMap.get(row.supplierName) ?? {
      supplierId: rows.find((item) => item.supplierName === row.supplierName)?.supplierId ?? row.id,
      supplierName: row.supplierName,
      total: 0,
      open: 0,
      critical: 0,
      avgResolutionDays: 0,
      totalResolutionDays: 0,
      closedCount: 0,
    };

    supplierRow.total += 1;
    if (row.status !== "CLOSED") {
      supplierRow.open += 1;
    }
    if (row.severity === "CRITICAL") {
      supplierRow.critical += 1;
    }
    if (row.resolutionDays !== null) {
      supplierRow.closedCount += 1;
      supplierRow.totalResolutionDays += row.resolutionDays;
      closedCount += 1;
      totalResolutionDays += row.resolutionDays;
    }
    if (row.isOverdue) {
      overdueNCRs += 1;
    }

    supplierMap.set(row.supplierName, supplierRow);
  }

  const issueBreakdown = [...issueMap.entries()]
    .map(([issueType, count]) => ({ issueType, count }))
    .sort((a, b) => b.count - a.count);

  const supplierSummary = [...supplierMap.values()]
    .map((row) => ({
      supplierId: row.supplierId,
      supplierName: row.supplierName,
      total: row.total,
      open: row.open,
      critical: row.critical,
      avgResolutionDays: row.closedCount > 0 ? Math.round(row.totalResolutionDays / row.closedCount) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    kpis: {
      totalNCRs: register.length,
      openNCRs: register.filter((row) => row.status !== "CLOSED").length,
      criticalNCRs: register.filter((row) => row.status !== "CLOSED" && row.severity === "CRITICAL").length,
      overdueNCRs,
      closureRate: register.length > 0 ? Math.round((closedCount / register.length) * 100) : 0,
      avgResolutionDays: closedCount > 0 ? Math.round(totalResolutionDays / closedCount) : 0,
      financialImpact: dashboard.quality.ncrFinancialImpact,
    },
    trend: monthKeys.map((key) => monthMap.get(key) ?? { month: key, opened: 0, closed: 0, critical: 0 }),
    issueBreakdown,
    supplierSummary,
    register: register.slice(0, 50),
  };
}

export async function getLogisticsDeepDiveData(filters: AnalyticsDeepDiveFilters): Promise<LogisticsDeepDiveData> {
  const [dashboard, rows] = await Promise.all([
    getDashboardKPIs(filters),
    db
      .select({
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        poNumber: purchaseOrder.poNumber,
        supplierName: supplier.name,
        projectName: project.name,
        carrier: shipment.carrier,
        status: shipment.status,
        origin: shipment.originLocation,
        destination: shipment.destination,
        expectedDate: sql<Date | null>`COALESCE(${shipment.rosDate}, ${shipment.logisticsEta}, ${shipment.supplierAos})`,
        actualDate: shipment.actualDeliveryDate,
        etaConfidence: shipment.etaConfidence,
        lastLocation: shipment.lastKnownLocation,
        dispatchDate: shipment.dispatchDate,
      })
      .from(shipment)
      .innerJoin(purchaseOrder, eq(shipment.purchaseOrderId, purchaseOrder.id))
      .innerJoin(supplier, eq(purchaseOrder.supplierId, supplier.id))
      .innerJoin(project, eq(purchaseOrder.projectId, project.id))
      .where(and(...buildShipmentConditions(filters)))
      .orderBy(desc(shipment.createdAt)),
  ]);

  const now = new Date();
  const shipments: LogisticsShipmentRow[] = rows.map((row) => {
    const startDate = row.dispatchDate ?? row.expectedDate ?? now;
    const isDelivered = row.status === "DELIVERED" || row.status === "PARTIALLY_DELIVERED";
    const expectedDate = row.expectedDate ? new Date(row.expectedDate) : null;
    const actualDate = row.actualDate ? new Date(row.actualDate) : null;
    const isDelayed = isDelivered
      ? Boolean(expectedDate && actualDate && actualDate > expectedDate)
      : Boolean(expectedDate && expectedDate < now);

    return {
      id: row.id,
      trackingNumber: row.trackingNumber || row.id.slice(0, 8).toUpperCase(),
      poNumber: row.poNumber ?? "—",
      supplierName: row.supplierName ?? "Unknown supplier",
      projectName: row.projectName ?? "Unknown project",
      carrier: row.carrier ?? "Unassigned",
      status: row.status ?? "PENDING",
      origin: row.origin,
      destination: row.destination,
      expectedDate: toIsoDate(row.expectedDate),
      actualDate: toIsoDate(row.actualDate),
      etaConfidence: row.etaConfidence,
      lastLocation: row.lastLocation,
      daysInTransit: diffInDays(startDate, actualDate ?? now),
      isDelayed,
    };
  });

  const carrierMap = new Map<string, { carrier: string; totalShipments: number; delivered: number; delayed: number; totalTransitDays: number }>();

  for (const row of shipments) {
    const carrier = carrierMap.get(row.carrier) ?? {
      carrier: row.carrier,
      totalShipments: 0,
      delivered: 0,
      delayed: 0,
      totalTransitDays: 0,
    };

    carrier.totalShipments += 1;
    if (row.actualDate) {
      carrier.delivered += 1;
      carrier.totalTransitDays += row.daysInTransit;
    }
    if (row.isDelayed) {
      carrier.delayed += 1;
    }

    carrierMap.set(row.carrier, carrier);
  }

  const carriers = [...carrierMap.values()]
    .map((row) => ({
      carrier: row.carrier,
      totalShipments: row.totalShipments,
      delivered: row.delivered,
      delayed: row.delayed,
      onTimeRate: row.delivered > 0 ? Math.round(((row.delivered - row.delayed) / row.delivered) * 100) : 0,
      avgTransitDays: row.delivered > 0 ? Math.round(row.totalTransitDays / row.delivered) : 0,
    }))
    .sort((a, b) => b.totalShipments - a.totalShipments);

  return {
    kpis: {
      totalShipments: dashboard.logistics.totalShipments,
      inTransit: dashboard.logistics.inTransit,
      deliveredOnTime: dashboard.logistics.deliveredOnTime,
      delayedShipments: dashboard.logistics.delayedShipments,
      onTimeRate: dashboard.logistics.onTimeRate,
      avgDeliveryDelay: dashboard.logistics.avgDeliveryDelay,
    },
    carriers,
    shipments: shipments.slice(0, 50),
  };
}

function calculateSupplierScore(row: SupplierProgressRow) {
  const deliveryScore = Math.max(0, Math.min(100, Math.round(row.onTimeRate)));
  const qualityScore = Math.max(0, 100 - Math.min(100, row.ncrCount * 12));
  const financialAlignmentScore = Math.max(
    0,
    100 - Math.min(100, Math.abs(row.financialProgress - row.physicalProgress) * 3),
  );
  const overallScore = Math.round(
    deliveryScore * 0.4 + qualityScore * 0.3 + financialAlignmentScore * 0.3,
  );

  return {
    deliveryScore,
    qualityScore,
    financialAlignmentScore,
    overallScore,
  };
}

export async function getSuppliersDeepDiveData(filters: AnalyticsDeepDiveFilters): Promise<SuppliersDeepDiveData> {
  const [dashboard, supplierProgress, supplierStatuses] = await Promise.all([
    getDashboardKPIs(filters),
    getSupplierProgressData(filters),
    db
      .select({
        id: supplier.id,
        name: supplier.name,
        status: supplier.status,
      })
      .from(supplier)
      .where(and(
        eq(supplier.organizationId, filters.organizationId),
        eq(supplier.isDeleted, false),
      )),
  ]);

  const statusById = new Map(supplierStatuses.map((row) => [row.id, row.status]));
  const suppliers = supplierProgress
    .map((row) => {
      const derived = calculateSupplierScore(row);
      return {
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        status: statusById.get(row.supplierId) ?? "ACTIVE",
        poCount: row.poCount,
        totalValue: row.totalValue,
        paidAmount: row.paidAmount,
        unpaidAmount: row.unpaidAmount,
        physicalProgress: row.physicalProgress,
        financialProgress: row.financialProgress,
        onTimeRate: row.onTimeRate,
        ncrCount: row.ncrCount,
        riskScore: row.riskScore,
        ...derived,
      };
    })
    .sort((a, b) => b.overallScore - a.overallScore);

  const avgDeliveryScore = suppliers.length > 0
    ? Math.round(suppliers.reduce((sum, row) => sum + row.deliveryScore, 0) / suppliers.length)
    : 0;
  const avgQualityScore = suppliers.length > 0
    ? Math.round(suppliers.reduce((sum, row) => sum + row.qualityScore, 0) / suppliers.length)
    : 0;

  return {
    summary: {
      totalSuppliers: dashboard.suppliers.totalSuppliers,
      activeSuppliers: dashboard.suppliers.activeSuppliers,
      avgDeliveryScore,
      avgQualityScore,
    },
    suppliers,
  };
}
