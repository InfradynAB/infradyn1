/**
 * Phase 8: KPI Engine
 * Centralized calculation service for all dashboard KPIs
 */

import db from "@/db/drizzle";
import {
    purchaseOrder,
    milestone,
    invoice,
    changeOrder,
    ncr,
    shipment,
    supplier,
    project,
    progressRecord,
} from "@/db/schema";
import { eq, and, sql, lte, inArray, not } from "drizzle-orm";

// Types for KPI results
export interface FinancialKPIs {
    totalCommitted: number;
    totalPaid: number;
    totalUnpaid: number;
    totalPending: number;
    retentionHeld: number;
    changeOrderImpact: number;
    forecastToComplete: number;
}

export interface ProgressKPIs {
    physicalProgress: number; // Weighted % complete
    financialProgress: number; // % of committed that's paid
    milestonesCompleted: number;
    milestonesTotal: number;
    onTrackCount: number;
    atRiskCount: number;
    delayedCount: number;
    activePOs: number;
    totalPOs: number;
}

export interface QualityKPIs {
    totalNCRs: number;
    openNCRs: number;
    closedNCRs: number;
    criticalNCRs: number;
    ncrFinancialImpact: number;
    ncrRate: number; // NCRs per PO
}

export interface SupplierKPIs {
    totalSuppliers: number;
    activeSuppliers: number;
    avgDeliveryScore: number;
    avgQualityScore: number;
    topExposure: { supplierId: string; supplierName: string; exposure: number }[];
}

export interface PaymentKPIs {
    avgPaymentCycleDays: number;
    invoiceAccuracyRate: number;
    pendingInvoiceCount: number;
    overdueInvoiceCount: number;
    overdueAmount: number;
}

export interface LogisticsKPIs {
    totalShipments: number;
    deliveredOnTime: number;
    delayedShipments: number;
    inTransit: number;
    avgDeliveryDelay: number; // days
    onTimeRate: number;
}

// Types for chart data
export interface SCurveDataPoint {
    month: string;
    plannedCumulative: number;
    actualCumulative: number;
}

export interface COBreakdown {
    scope: number;
    rate: number;
    quantity: number;
    schedule: number;
    total: number;
}

export interface DashboardKPIs {
    financial: FinancialKPIs;
    progress: ProgressKPIs;
    quality: QualityKPIs;
    suppliers: SupplierKPIs;
    payments: PaymentKPIs;
    logistics: LogisticsKPIs;
    timestamp: Date;
}

interface KPIFilters {
    organizationId: string;
    projectId?: string;
    supplierId?: string;
    dateFrom?: Date;
    dateTo?: Date;
}

/**
 * Get all dashboard KPIs for an organization/project
 */
export async function getDashboardKPIs(filters: KPIFilters): Promise<DashboardKPIs> {
    const [financial, progress, quality, suppliers, payments, logistics] = await Promise.all([
        getFinancialKPIs(filters),
        getProgressKPIs(filters),
        getQualityKPIs(filters),
        getSupplierKPIs(filters),
        getPaymentKPIs(filters),
        getLogisticsKPIs(filters),
    ]);

    return {
        financial,
        progress,
        quality,
        suppliers,
        payments,
        logistics,
        timestamp: new Date(),
    };
}

/**
 * Calculate Financial KPIs
 * - Total Committed = Σ(PO Value) + Σ(Approved CO Value)
 * - Total Paid = Σ(Paid Invoices)
 * - Total Unpaid = Committed - Paid
 * - Retention Held = Σ(Retention %) × Paid Amount
 */
export async function getFinancialKPIs(filters: KPIFilters): Promise<FinancialKPIs> {
    const { organizationId, projectId, supplierId } = filters;

    // Build PO filter conditions
    const poConditions = [
        eq(purchaseOrder.organizationId, organizationId),
        eq(purchaseOrder.isDeleted, false),
        not(eq(purchaseOrder.status, "CANCELLED")),
    ];
    if (projectId) poConditions.push(eq(purchaseOrder.projectId, projectId));
    if (supplierId) poConditions.push(eq(purchaseOrder.supplierId, supplierId));

    // Get PO totals
    const poTotals = await db
        .select({
            totalValue: sql<number>`COALESCE(SUM(${purchaseOrder.totalValue}::numeric), 0)`,
            totalRetention: sql<number>`COALESCE(SUM(${purchaseOrder.totalValue}::numeric * ${purchaseOrder.retentionPercentage}::numeric / 100), 0)`,
        })
        .from(purchaseOrder)
        .where(and(...poConditions));

    // Get approved change orders
    const poIds = await db
        .select({ id: purchaseOrder.id })
        .from(purchaseOrder)
        .where(and(...poConditions));

    const poIdList = poIds.map(p => p.id);

    let coTotal = 0;
    let pendingCOTotal = 0;
    if (poIdList.length > 0) {
        const coTotals = await db
            .select({
                approvedTotal: sql<number>`COALESCE(SUM(CASE WHEN ${changeOrder.status} = 'APPROVED' THEN ${changeOrder.amountDelta}::numeric ELSE 0 END), 0)`,
                pendingTotal: sql<number>`COALESCE(SUM(CASE WHEN ${changeOrder.status} IN ('SUBMITTED', 'UNDER_REVIEW') THEN ${changeOrder.amountDelta}::numeric ELSE 0 END), 0)`,
            })
            .from(changeOrder)
            .where(and(
                inArray(changeOrder.purchaseOrderId, poIdList),
                eq(changeOrder.isDeleted, false)
            ));
        coTotal = Number(coTotals[0]?.approvedTotal) || 0;
        pendingCOTotal = Number(coTotals[0]?.pendingTotal) || 0;
    }

    // Get paid amounts from invoices
    let paidTotal = 0;
    let pendingInvoiceTotal = 0;
    if (poIdList.length > 0) {
        const invoiceTotals = await db
            .select({
                paidAmount: sql<number>`COALESCE(SUM(${invoice.paidAmount}::numeric), 0)`,
                pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${invoice.status} IN ('PENDING_APPROVAL', 'APPROVED') THEN ${invoice.amount}::numeric - ${invoice.paidAmount}::numeric ELSE 0 END), 0)`,
            })
            .from(invoice)
            .where(and(
                inArray(invoice.purchaseOrderId, poIdList),
                eq(invoice.isDeleted, false)
            ));
        paidTotal = Number(invoiceTotals[0]?.paidAmount) || 0;
        pendingInvoiceTotal = Number(invoiceTotals[0]?.pendingAmount) || 0;
    }

    const totalCommitted = Number(poTotals[0]?.totalValue || 0) + Number(coTotal);
    const totalPaid = Number(paidTotal);
    const totalUnpaid = totalCommitted - totalPaid;
    const retentionHeld = Number(poTotals[0]?.totalRetention) || 0;
    const forecastToComplete = totalUnpaid + Number(pendingCOTotal);

    return {
        totalCommitted,
        totalPaid,
        totalUnpaid,
        totalPending: pendingInvoiceTotal,
        retentionHeld,
        changeOrderImpact: coTotal + pendingCOTotal,
        forecastToComplete,
    };
}

/**
 * Calculate Progress KPIs
 * - Physical Progress = Σ(Milestone % × Milestone Value) / Total PO Value
 * - Financial Progress = Paid / Committed × 100
 */
export async function getProgressKPIs(filters: KPIFilters): Promise<ProgressKPIs> {
    const { organizationId, projectId, supplierId } = filters;

    // Build PO filter conditions
    const poConditions = [
        eq(purchaseOrder.organizationId, organizationId),
        eq(purchaseOrder.isDeleted, false),
        not(eq(purchaseOrder.status, "CANCELLED")),
    ];
    if (projectId) poConditions.push(eq(purchaseOrder.projectId, projectId));
    if (supplierId) poConditions.push(eq(purchaseOrder.supplierId, supplierId));

    // Get PO IDs and total value
    const pos = await db
        .select({
            id: purchaseOrder.id,
            totalValue: purchaseOrder.totalValue,
            status: purchaseOrder.status,
        })
        .from(purchaseOrder)
        .where(and(...poConditions));

    const poIdList = pos.map(p => p.id);
    const totalPOValue = pos.reduce((sum, p) => sum + Number(p.totalValue || 0), 0);

    let weightedProgress = 0;
    let milestonesCompleted = 0;
    let milestonesTotal = 0;
    let onTrack = 0;
    let atRisk = 0;
    let delayed = 0;

    if (poIdList.length > 0) {
        // Get milestones with progress
        const milestones = await db
            .select({
                id: milestone.id,
                purchaseOrderId: milestone.purchaseOrderId,
                paymentPercentage: milestone.paymentPercentage,
                amount: milestone.amount,
                status: milestone.status,
                expectedDate: milestone.expectedDate,
            })
            .from(milestone)
            .where(and(
                inArray(milestone.purchaseOrderId, poIdList),
                eq(milestone.isDeleted, false)
            ));

        milestonesTotal = milestones.length;

        // Get latest progress for each milestone
        for (const m of milestones) {
            const poValue = Number(pos.find(p => p.id === m.purchaseOrderId)?.totalValue || 0);
            const milestoneValue = m.amount ? Number(m.amount) : (poValue * Number(m.paymentPercentage) / 100);

            // Get latest progress record for this milestone
            const latestProgress = await db
                .select({ percentComplete: progressRecord.percentComplete })
                .from(progressRecord)
                .where(and(
                    eq(progressRecord.milestoneId, m.id),
                    eq(progressRecord.isDeleted, false)
                ))
                .orderBy(sql`${progressRecord.reportedDate} DESC`)
                .limit(1);

            const progress = latestProgress[0]?.percentComplete ? Number(latestProgress[0].percentComplete) : 0;
            weightedProgress += (progress / 100) * milestoneValue;

            // Count status
            if (m.status === "COMPLETED" || progress >= 100) {
                milestonesCompleted++;
                onTrack++;
            } else if (m.expectedDate && new Date(m.expectedDate) < new Date()) {
                delayed++;
            } else if (progress < 50 && m.expectedDate) {
                // At risk if less than 50% with deadline approaching
                const daysUntilDue = Math.floor((new Date(m.expectedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                if (daysUntilDue < 14) atRisk++;
                else onTrack++;
            } else {
                onTrack++;
            }
        }
    }

    // Get financial progress
    const financial = await getFinancialKPIs(filters);
    const financialProgress = financial.totalCommitted > 0
        ? (financial.totalPaid / financial.totalCommitted) * 100
        : 0;

    const physicalProgress = totalPOValue > 0 ? (weightedProgress / totalPOValue) * 100 : 0;

    // Count active vs total POs
    const activePOs = pos.filter(p => 
        !["DRAFT", "CANCELLED", "COMPLETED", "CLOSED"].includes(p.status || "")
    ).length;

    return {
        physicalProgress: Math.round(physicalProgress * 10) / 10,
        financialProgress: Math.round(financialProgress * 10) / 10,
        milestonesCompleted,
        milestonesTotal,
        onTrackCount: onTrack,
        atRiskCount: atRisk,
        delayedCount: delayed,
        activePOs,
        totalPOs: pos.length,
    };
}

/**
 * Calculate Quality KPIs (NCRs)
 */
export async function getQualityKPIs(filters: KPIFilters): Promise<QualityKPIs> {
    const { organizationId, projectId, supplierId } = filters;

    // Build conditions
    const conditions = [
        eq(ncr.organizationId, organizationId),
        eq(ncr.isDeleted, false),
    ];
    if (projectId) conditions.push(eq(ncr.projectId, projectId));
    if (supplierId) conditions.push(eq(ncr.supplierId, supplierId));

    const ncrStats = await db
        .select({
            total: sql<number>`COUNT(*)`,
            open: sql<number>`COUNT(*) FILTER (WHERE ${ncr.status} NOT IN ('CLOSED'))`,
            critical: sql<number>`COUNT(*) FILTER (WHERE ${ncr.severity} = 'CRITICAL')`,
        })
        .from(ncr)
        .where(and(...conditions));

    // Get PO count for NCR rate
    const poConditions = [
        eq(purchaseOrder.organizationId, organizationId),
        eq(purchaseOrder.isDeleted, false),
    ];
    if (projectId) poConditions.push(eq(purchaseOrder.projectId, projectId));
    if (supplierId) poConditions.push(eq(purchaseOrder.supplierId, supplierId));

    const poCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(purchaseOrder)
        .where(and(...poConditions));

    const totalNCRs = Number(ncrStats[0]?.total) || 0;
    const poTotal = Number(poCount[0]?.count) || 1;
    const openNCRs = Number(ncrStats[0]?.open) || 0;

    return {
        totalNCRs,
        openNCRs,
        closedNCRs: totalNCRs - openNCRs,
        criticalNCRs: Number(ncrStats[0]?.critical) || 0,
        ncrFinancialImpact: 0, // NCR table doesn't have estimatedCost - to be added in future
        ncrRate: Math.round((totalNCRs / poTotal) * 100) / 100,
    };
}

/**
 * Calculate Supplier KPIs
 */
export async function getSupplierKPIs(filters: KPIFilters): Promise<SupplierKPIs> {
    const { organizationId, projectId } = filters;

    // Get supplier stats
    const supplierStats = await db
        .select({
            total: sql<number>`COUNT(DISTINCT ${supplier.id})`,
            active: sql<number>`COUNT(DISTINCT ${supplier.id}) FILTER (WHERE ${supplier.status} = 'ACTIVE')`,
        })
        .from(supplier)
        .where(and(
            eq(supplier.organizationId, organizationId),
            eq(supplier.isDeleted, false)
        ));

    // Get top 5 suppliers by exposure (PO value + approved COs)
    const poConditions = [
        eq(purchaseOrder.organizationId, organizationId),
        eq(purchaseOrder.isDeleted, false),
        not(eq(purchaseOrder.status, "CANCELLED")),
    ];
    if (projectId) poConditions.push(eq(purchaseOrder.projectId, projectId));

    const topSuppliers = await db
        .select({
            supplierId: purchaseOrder.supplierId,
            supplierName: supplier.name,
            exposure: sql<number>`SUM(${purchaseOrder.totalValue}::numeric)`,
        })
        .from(purchaseOrder)
        .innerJoin(supplier, eq(purchaseOrder.supplierId, supplier.id))
        .where(and(...poConditions))
        .groupBy(purchaseOrder.supplierId, supplier.name)
        .orderBy(sql`SUM(${purchaseOrder.totalValue}::numeric) DESC`)
        .limit(5);

    return {
        totalSuppliers: Number(supplierStats[0]?.total) || 0,
        activeSuppliers: Number(supplierStats[0]?.active) || 0,
        avgDeliveryScore: 85, // TODO: Calculate from actual delivery data
        avgQualityScore: 90, // TODO: Calculate from NCR data
        topExposure: topSuppliers.map(s => ({
            supplierId: s.supplierId,
            supplierName: s.supplierName,
            exposure: Number(s.exposure),
        })),
    };
}

/**
 * Calculate Payment KPIs
 */
export async function getPaymentKPIs(filters: KPIFilters): Promise<PaymentKPIs> {
    const { organizationId, projectId, supplierId } = filters;

    // Get PO IDs first
    const poConditions = [
        eq(purchaseOrder.organizationId, organizationId),
        eq(purchaseOrder.isDeleted, false),
    ];
    if (projectId) poConditions.push(eq(purchaseOrder.projectId, projectId));
    if (supplierId) poConditions.push(eq(purchaseOrder.supplierId, supplierId));

    const poIds = await db
        .select({ id: purchaseOrder.id })
        .from(purchaseOrder)
        .where(and(...poConditions));

    const poIdList = poIds.map(p => p.id);

    if (poIdList.length === 0) {
        return {
            avgPaymentCycleDays: 0,
            invoiceAccuracyRate: 100,
            pendingInvoiceCount: 0,
            overdueInvoiceCount: 0,
            overdueAmount: 0,
        };
    }

    // Invoice stats
    const invoiceStats = await db
        .select({
            total: sql<number>`COUNT(*)`,
            pending: sql<number>`COUNT(*) FILTER (WHERE ${invoice.status} IN ('PENDING_APPROVAL', 'APPROVED'))`,
            overdue: sql<number>`COUNT(*) FILTER (WHERE ${invoice.status} NOT IN ('PAID') AND ${invoice.dueDate} < NOW())`,
            overdueAmount: sql<number>`COALESCE(SUM(CASE WHEN ${invoice.status} NOT IN ('PAID') AND ${invoice.dueDate} < NOW() THEN ${invoice.amount}::numeric - ${invoice.paidAmount}::numeric ELSE 0 END), 0)`,
            verified: sql<number>`COUNT(*) FILTER (WHERE ${invoice.validationStatus} = 'PASSED')`,
            avgCycleDays: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${invoice.paidAt} - ${invoice.invoiceDate})) / 86400) FILTER (WHERE ${invoice.paidAt} IS NOT NULL), 0)`,
        })
        .from(invoice)
        .where(and(
            inArray(invoice.purchaseOrderId, poIdList),
            eq(invoice.isDeleted, false)
        ));

    const total = Number(invoiceStats[0]?.total) || 0;
    const verified = Number(invoiceStats[0]?.verified) || 0;

    return {
        avgPaymentCycleDays: Math.round(Number(invoiceStats[0]?.avgCycleDays) || 0),
        invoiceAccuracyRate: total > 0 ? Math.round((verified / total) * 100) : 100,
        pendingInvoiceCount: Number(invoiceStats[0]?.pending) || 0,
        overdueInvoiceCount: Number(invoiceStats[0]?.overdue) || 0,
        overdueAmount: Number(invoiceStats[0]?.overdueAmount) || 0,
    };
}

/**
 * Calculate Logistics KPIs
 */
export async function getLogisticsKPIs(filters: KPIFilters): Promise<LogisticsKPIs> {
    const { organizationId, projectId, supplierId } = filters;

    // Get PO IDs
    const poConditions = [
        eq(purchaseOrder.organizationId, organizationId),
        eq(purchaseOrder.isDeleted, false),
    ];
    if (projectId) poConditions.push(eq(purchaseOrder.projectId, projectId));
    if (supplierId) poConditions.push(eq(purchaseOrder.supplierId, supplierId));

    const poIds = await db
        .select({ id: purchaseOrder.id })
        .from(purchaseOrder)
        .where(and(...poConditions));

    const poIdList = poIds.map(p => p.id);

    if (poIdList.length === 0) {
        return {
            totalShipments: 0,
            deliveredOnTime: 0,
            delayedShipments: 0,
            inTransit: 0,
            avgDeliveryDelay: 0,
            onTimeRate: 0,
        };
    }

    // Calculate delays by comparing actualDeliveryDate vs rosDate (Required on Site)
    const shipmentStats = await db
        .select({
            total: sql<number>`COUNT(*)`,
            delivered: sql<number>`COUNT(*) FILTER (WHERE ${shipment.status} = 'DELIVERED')`,
            inTransit: sql<number>`COUNT(*) FILTER (WHERE ${shipment.status} IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DISPATCHED'))`,
            delayed: sql<number>`COUNT(*) FILTER (WHERE ${shipment.status} = 'DELIVERED' AND ${shipment.actualDeliveryDate} > ${shipment.rosDate} AND ${shipment.rosDate} IS NOT NULL)`,
            onTime: sql<number>`COUNT(*) FILTER (WHERE ${shipment.status} = 'DELIVERED' AND (${shipment.actualDeliveryDate} <= ${shipment.rosDate} OR ${shipment.rosDate} IS NULL))`,
            avgDelay: sql<number>`COALESCE(AVG(EXTRACT(DAY FROM (${shipment.actualDeliveryDate} - ${shipment.rosDate}))) FILTER (WHERE ${shipment.actualDeliveryDate} > ${shipment.rosDate} AND ${shipment.rosDate} IS NOT NULL), 0)`,
        })
        .from(shipment)
        .where(and(
            inArray(shipment.purchaseOrderId, poIdList),
            eq(shipment.isDeleted, false)
        ));

    const total = Number(shipmentStats[0]?.total) || 0;
    const delivered = Number(shipmentStats[0]?.delivered) || 0;
    const onTime = Number(shipmentStats[0]?.onTime) || 0;
    const delayed = Number(shipmentStats[0]?.delayed) || 0;

    return {
        totalShipments: total,
        deliveredOnTime: onTime,
        delayedShipments: delayed,
        inTransit: Number(shipmentStats[0]?.inTransit) || 0,
        avgDeliveryDelay: Math.round(Number(shipmentStats[0]?.avgDelay) || 0),
        onTimeRate: delivered > 0 ? (onTime / delivered) * 100 : 0,
    };
}

/**
 * Get S-Curve data for planned vs actual spend
 */
export async function getSCurveData(filters: KPIFilters): Promise<SCurveDataPoint[]> {
    const { organizationId, projectId } = filters;

    // Get project date range
    const projectData = projectId
        ? await db.select().from(project).where(eq(project.id, projectId)).limit(1)
        : null;

    const startDate = projectData?.[0]?.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = projectData?.[0]?.endDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

    // Generate monthly buckets
    const labels: string[] = [];
    const planned: number[] = [];
    const actual: number[] = [];

    const current = new Date(startDate);
    while (current <= endDate) {
        const monthLabel = current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        labels.push(monthLabel);

        // Get planned spend (milestone expected dates)
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

        // Build conditions for this month
        const poConditions = [
            eq(purchaseOrder.organizationId, organizationId),
            eq(purchaseOrder.isDeleted, false),
        ];
        if (projectId) poConditions.push(eq(purchaseOrder.projectId, projectId));

        const plannedResult = await db
            .select({
                total: sql<number>`COALESCE(SUM(${milestone.amount}::numeric), 0)`,
            })
            .from(milestone)
            .innerJoin(purchaseOrder, eq(milestone.purchaseOrderId, purchaseOrder.id))
            .where(and(
                ...poConditions,
                lte(milestone.expectedDate, monthEnd),
                eq(milestone.isDeleted, false)
            ));

        // Get actual spend (paid invoices)
        const actualResult = await db
            .select({
                total: sql<number>`COALESCE(SUM(${invoice.paidAmount}::numeric), 0)`,
            })
            .from(invoice)
            .innerJoin(purchaseOrder, eq(invoice.purchaseOrderId, purchaseOrder.id))
            .where(and(
                ...poConditions,
                lte(invoice.paidAt, monthEnd),
                eq(invoice.isDeleted, false)
            ));

        planned.push(Number(plannedResult[0]?.total || 0));
        actual.push(Number(actualResult[0]?.total || 0));

        current.setMonth(current.getMonth() + 1);
    }

    // Convert to cumulative
    for (let i = 1; i < planned.length; i++) {
        planned[i] += planned[i - 1];
        actual[i] += actual[i - 1];
    }

    // Return SCurveDataPoint format
    return labels.map((month, i) => ({
        month: `${new Date().getFullYear()}-${String(i + 1).padStart(2, '0')}`, // YYYY-MM format
        plannedCumulative: planned[i],
        actualCumulative: actual[i],
    }));
}

/**
 * Get Change Order breakdown by type
 */
export async function getCOBreakdown(filters: KPIFilters): Promise<COBreakdown> {
    const { organizationId, projectId, supplierId } = filters;

    const poConditions = [
        eq(purchaseOrder.organizationId, organizationId),
        eq(purchaseOrder.isDeleted, false),
    ];
    if (projectId) poConditions.push(eq(purchaseOrder.projectId, projectId));
    if (supplierId) poConditions.push(eq(purchaseOrder.supplierId, supplierId));

    const poIds = await db
        .select({ id: purchaseOrder.id })
        .from(purchaseOrder)
        .where(and(...poConditions));

    const poIdList = poIds.map(p => p.id);

    if (poIdList.length === 0) {
        return { scope: 0, rate: 0, quantity: 0, schedule: 0, total: 0 };
    }

    // Group COs by type/reason (simplified - in reality would need a CO type field)
    const coData = await db
        .select({
            reason: changeOrder.reason,
            total: sql<number>`SUM(${changeOrder.amountDelta}::numeric)`,
        })
        .from(changeOrder)
        .where(and(
            inArray(changeOrder.purchaseOrderId, poIdList),
            eq(changeOrder.status, "APPROVED"),
            eq(changeOrder.isDeleted, false)
        ))
        .groupBy(changeOrder.reason);

    // Categorize based on reason keywords
    let scope = 0, rate = 0, quantity = 0, schedule = 0;

    for (const co of coData) {
        const reason = (co.reason || "").toLowerCase();
        const amount = Number(co.total);

        if (reason.includes("scope") || reason.includes("addition") || reason.includes("extra")) {
            scope += amount;
        } else if (reason.includes("rate") || reason.includes("price") || reason.includes("cost")) {
            rate += amount;
        } else if (reason.includes("quantity") || reason.includes("qty")) {
            quantity += amount;
        } else if (reason.includes("schedule") || reason.includes("delay") || reason.includes("time")) {
            schedule += amount;
        } else {
            scope += amount; // Default to scope
        }
    }

    const total = scope + rate + quantity + schedule;
    return { scope, rate, quantity, schedule, total };
}
