/**
 * Phase 8: Report Engine
 * Services for generating detailed report data
 */

import db from "@/db/drizzle";
import {
    purchaseOrder,
    milestone,
    invoice,
    supplier,
    progressRecord,
    shipment,
    ncr,
    changeOrder,
} from "@/db/schema";
import { eq, and, sql, desc, not, inArray } from "drizzle-orm";

interface ReportFilters {
    organizationId: string;
    projectId?: string;
    supplierId?: string;
}

export interface MilestoneTrackerRow {
    poId: string;
    poNumber: string;
    supplierId: string;
    supplierName: string;
    milestoneId: string;
    milestoneName: string;
    progressPercent: number;
    status: string;
    expectedDate: string | null;
    invoiceStatus: string | null;
    invoiceId: string | null;
    amount: number;
    linkedNCRs: number;
    linkedCOs: number;
}

export interface SupplierProgressRow {
    supplierId: string;
    supplierName: string;
    physicalProgress: number;
    financialProgress: number;
    poCount: number;
    totalValue: number;
    paidAmount: number;
    unpaidAmount: number;
    onTimeRate: number;
    ncrCount: number;
    riskScore: number;
}

export interface RiskAssessment {
    poId: string;
    poNumber: string;
    supplierName: string;
    riskScore: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    riskFactors: {
        factor: string;
        impact: number;
        description: string;
    }[];
    predictedDelay: number;
    predictedOverrun: number;
}

export interface CashflowForecast {
    period: string;
    expectedPayments: number;
    pendingInvoices: number;
    projectedCommitments: number;
    cumulativeExposure: number;
}

/**
 * Get milestone tracker data for detailed reports
 */
export async function getMilestoneTrackerData(filters: ReportFilters): Promise<MilestoneTrackerRow[]> {
    const { organizationId, projectId, supplierId } = filters;

    const poConditions = [
        eq(purchaseOrder.organizationId, organizationId),
        eq(purchaseOrder.isDeleted, false),
        not(eq(purchaseOrder.status, "CANCELLED")),
    ];
    if (projectId) poConditions.push(eq(purchaseOrder.projectId, projectId));
    if (supplierId) poConditions.push(eq(purchaseOrder.supplierId, supplierId));

    const pos = await db.query.purchaseOrder.findMany({
        where: and(...poConditions),
        with: {
            supplier: true,
            milestones: {
                where: eq(milestone.isDeleted, false),
                with: {
                    invoices: {
                        where: eq(invoice.isDeleted, false),
                        orderBy: [desc(invoice.createdAt)],
                        limit: 1,
                    },
                    progressRecords: {
                        orderBy: [desc(progressRecord.createdAt)],
                        limit: 1,
                    },
                },
            },
        },
    });

    const results: MilestoneTrackerRow[] = [];

    for (const po of pos) {
        for (const ms of po.milestones) {
            const latestProgress = ms.progressRecords?.[0];
            const latestInvoice = ms.invoices?.[0];
            
            // Count linked NCRs and COs
            const [ncrCount, coCount] = await Promise.all([
                db.select({ count: sql<number>`count(*)` })
                    .from(ncr)
                    .where(and(
                        eq(ncr.purchaseOrderId, po.id),
                        eq(ncr.isDeleted, false)
                    )),
                db.select({ count: sql<number>`count(*)` })
                    .from(changeOrder)
                    .where(and(
                        eq(changeOrder.purchaseOrderId, po.id),
                        eq(changeOrder.isDeleted, false)
                    )),
            ]);

            results.push({
                poId: po.id,
                poNumber: po.poNumber || "N/A",
                supplierId: po.supplierId,
                supplierName: po.supplier?.name || "Unknown",
                milestoneId: ms.id,
                milestoneName: ms.title,
                progressPercent: latestProgress?.percentComplete ? Number(latestProgress.percentComplete) : 0,
                status: ms.status || "PENDING",
                expectedDate: ms.expectedDate?.toISOString().slice(0, 10) || null,
                invoiceStatus: latestInvoice?.status || null,
                invoiceId: latestInvoice?.id || null,
                amount: ms.amount ? Number(ms.amount) : 0,
                linkedNCRs: Number(ncrCount[0]?.count || 0),
                linkedCOs: Number(coCount[0]?.count || 0),
            });
        }
    }

    return results;
}

/**
 * Get supplier progress data for charts and reports
 */
export async function getSupplierProgressData(filters: ReportFilters): Promise<SupplierProgressRow[]> {
    const { organizationId, projectId } = filters;

    const poConditions = [
        eq(purchaseOrder.organizationId, organizationId),
        eq(purchaseOrder.isDeleted, false),
        not(eq(purchaseOrder.status, "CANCELLED")),
    ];
    if (projectId) poConditions.push(eq(purchaseOrder.projectId, projectId));

    // Get all suppliers with their POs
    const suppliers = await db.query.supplier.findMany({
        where: and(
            eq(supplier.organizationId, organizationId),
            eq(supplier.isDeleted, false)
        ),
    });

    const results: SupplierProgressRow[] = [];

    for (const sup of suppliers) {
        // Get POs for this supplier
        const pos = await db.query.purchaseOrder.findMany({
            where: and(
                ...poConditions,
                eq(purchaseOrder.supplierId, sup.id)
            ),
            with: {
                milestones: {
                    where: eq(milestone.isDeleted, false),
                    with: {
                        progressRecords: {
                            orderBy: [desc(progressRecord.createdAt)],
                            limit: 1,
                        },
                        invoices: {
                            where: eq(invoice.isDeleted, false),
                        },
                    },
                },
            },
        });

        if (pos.length === 0) continue;

        let totalValue = 0;
        let weightedProgress = 0;
        let paidAmount = 0;

        for (const po of pos) {
            const poValue = Number(po.totalValue || 0);
            totalValue += poValue;

            for (const ms of po.milestones) {
                const msValue = ms.amount ? Number(ms.amount) : (poValue * Number(ms.paymentPercentage || 0) / 100);
                const progress = ms.progressRecords?.[0]?.percentComplete 
                    ? Number(ms.progressRecords[0].percentComplete) 
                    : 0;
                weightedProgress += (progress / 100) * msValue;

                // Sum paid invoices
                for (const inv of ms.invoices) {
                    if (inv.status === "PAID") {
                        paidAmount += Number(inv.amount || 0);
                    }
                }
            }
        }

        const physicalProgress = totalValue > 0 ? (weightedProgress / totalValue) * 100 : 0;
        const financialProgress = totalValue > 0 ? (paidAmount / totalValue) * 100 : 0;

        // Get NCR count
        const [ncrResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(ncr)
            .where(and(
                eq(ncr.supplierId, sup.id),
                eq(ncr.isDeleted, false)
            ));

        // Get on-time delivery rate
        const [deliveryResult] = await db
            .select({
                total: sql<number>`count(*)`,
                onTime: sql<number>`count(*) FILTER (WHERE ${shipment.actualDeliveryDate} IS NOT NULL AND (${shipment.actualDeliveryDate} <= ${shipment.rosDate} OR ${shipment.actualDeliveryDate} <= ${shipment.logisticsEta}))`,
            })
            .from(shipment)
            .innerJoin(purchaseOrder, eq(shipment.purchaseOrderId, purchaseOrder.id))
            .where(and(
                eq(purchaseOrder.supplierId, sup.id),
                eq(shipment.isDeleted, false)
            ));

        const onTimeRate = deliveryResult.total > 0 
            ? (Number(deliveryResult.onTime) / Number(deliveryResult.total)) * 100 
            : 100;

        // Calculate risk score (simple algorithm)
        const riskScore = calculateSupplierRiskScore({
            onTimeRate,
            ncrCount: Number(ncrResult.count || 0),
            physicalProgress,
            financialProgress,
        });

        results.push({
            supplierId: sup.id,
            supplierName: sup.name,
            physicalProgress: Math.round(physicalProgress * 10) / 10,
            financialProgress: Math.round(financialProgress * 10) / 10,
            poCount: pos.length,
            totalValue,
            paidAmount,
            unpaidAmount: totalValue - paidAmount,
            onTimeRate: Math.round(onTimeRate * 10) / 10,
            ncrCount: Number(ncrResult.count || 0),
            riskScore,
        });
    }

    return results.sort((a, b) => b.totalValue - a.totalValue);
}

/**
 * Calculate risk score for a supplier (0-100, higher = more risk)
 */
function calculateSupplierRiskScore(params: {
    onTimeRate: number;
    ncrCount: number;
    physicalProgress: number;
    financialProgress: number;
}): number {
    let score = 0;

    // On-time delivery (40% weight)
    if (params.onTimeRate < 70) score += 40;
    else if (params.onTimeRate < 85) score += 25;
    else if (params.onTimeRate < 95) score += 10;

    // NCR frequency (30% weight)
    if (params.ncrCount > 5) score += 30;
    else if (params.ncrCount > 2) score += 20;
    else if (params.ncrCount > 0) score += 10;

    // Progress variance (30% weight) - if financial ahead of physical = risk
    const progressVariance = params.financialProgress - params.physicalProgress;
    if (progressVariance > 20) score += 30;
    else if (progressVariance > 10) score += 20;
    else if (progressVariance > 5) score += 10;

    return Math.min(100, score);
}

/**
 * Get risk assessment for all POs
 */
export async function getRiskAssessments(filters: ReportFilters): Promise<RiskAssessment[]> {
    const { organizationId, projectId } = filters;

    const poConditions = [
        eq(purchaseOrder.organizationId, organizationId),
        eq(purchaseOrder.isDeleted, false),
        not(eq(purchaseOrder.status, "CANCELLED")),
        not(eq(purchaseOrder.status, "COMPLETED")),
    ];
    if (projectId) poConditions.push(eq(purchaseOrder.projectId, projectId));

    const pos = await db.query.purchaseOrder.findMany({
        where: and(...poConditions),
        with: {
            supplier: true,
            milestones: {
                where: eq(milestone.isDeleted, false),
                with: {
                    progressRecords: {
                        orderBy: [desc(progressRecord.createdAt)],
                        limit: 1,
                    },
                },
            },
            shipments: {
                where: eq(shipment.isDeleted, false),
            },
        },
    });

    const results: RiskAssessment[] = [];

    for (const po of pos) {
        const riskFactors: RiskAssessment["riskFactors"] = [];
        let totalScore = 0;

        // Check milestone delays
        let delayedMilestones = 0;
        const totalMilestones = po.milestones.length;
        for (const ms of po.milestones) {
            if (ms.expectedDate && new Date(ms.expectedDate) < new Date()) {
                const progress = ms.progressRecords?.[0]?.percentComplete || 0;
                if (Number(progress) < 100) {
                    delayedMilestones++;
                }
            }
        }
        if (delayedMilestones > 0) {
            const impact = Math.min(40, (delayedMilestones / Math.max(totalMilestones, 1)) * 40);
            totalScore += impact;
            riskFactors.push({
                factor: "Milestone Delays",
                impact,
                description: `${delayedMilestones} of ${totalMilestones} milestones are past due`,
            });
        }

        // Check shipment delays
        const delayedShipments = po.shipments.filter(s => {
            const targetDate = s.rosDate || s.logisticsEta;
            return targetDate && new Date(targetDate) < new Date() && !s.actualDeliveryDate;
        }).length;
        if (delayedShipments > 0) {
            const impact = Math.min(30, delayedShipments * 10);
            totalScore += impact;
            riskFactors.push({
                factor: "Shipment Delays",
                impact,
                description: `${delayedShipments} shipments are overdue`,
            });
        }

        // Check NCRs
        const [ncrResult] = await db
            .select({ 
                count: sql<number>`count(*)`,
                criticalCount: sql<number>`count(*) FILTER (WHERE ${ncr.severity} = 'CRITICAL')`,
            })
            .from(ncr)
            .where(and(
                eq(ncr.purchaseOrderId, po.id),
                eq(ncr.isDeleted, false),
                not(eq(ncr.status, "CLOSED"))
            ));
        
        if (Number(ncrResult.count) > 0) {
            const impact = Math.min(20, Number(ncrResult.count) * 5 + Number(ncrResult.criticalCount) * 10);
            totalScore += impact;
            riskFactors.push({
                factor: "Quality Issues",
                impact,
                description: `${ncrResult.count} open NCRs (${ncrResult.criticalCount} critical)`,
            });
        }

        // Check pending COs
        const [coResult] = await db
            .select({ 
                count: sql<number>`count(*)`,
                totalValue: sql<number>`COALESCE(SUM(${changeOrder.amountDelta}::numeric), 0)`,
            })
            .from(changeOrder)
            .where(and(
                eq(changeOrder.purchaseOrderId, po.id),
                eq(changeOrder.isDeleted, false),
                inArray(changeOrder.status, ["SUBMITTED", "UNDER_REVIEW"])
            ));
        
        if (Number(coResult.count) > 0) {
            const coPercentage = (Number(coResult.totalValue) / Number(po.totalValue || 1)) * 100;
            const impact = Math.min(10, coPercentage / 2);
            totalScore += impact;
            riskFactors.push({
                factor: "Pending Changes",
                impact,
                description: `${coResult.count} pending COs worth ${coPercentage.toFixed(1)}% of PO value`,
            });
        }

        // Determine risk level
        let riskLevel: RiskAssessment["riskLevel"] = "LOW";
        if (totalScore >= 60) riskLevel = "CRITICAL";
        else if (totalScore >= 40) riskLevel = "HIGH";
        else if (totalScore >= 20) riskLevel = "MEDIUM";

        // Predict delay (simplified model)
        const predictedDelay = Math.round(totalScore * 0.5); // days

        // Predict overrun (simplified model)
        const pendingCOValue = Number(coResult?.totalValue || 0);
        const predictedOverrun = (pendingCOValue / Number(po.totalValue || 1)) * 100;

        results.push({
            poId: po.id,
            poNumber: po.poNumber || "N/A",
            supplierName: po.supplier?.name || "Unknown",
            riskScore: Math.round(totalScore),
            riskLevel,
            riskFactors,
            predictedDelay,
            predictedOverrun: Math.round(predictedOverrun * 10) / 10,
        });
    }

    return results.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Get cashflow forecast for next 30/60/90 days
 */
export async function getCashflowForecast(filters: ReportFilters): Promise<CashflowForecast[]> {
    const { organizationId, projectId } = filters;

    const poConditions = [
        eq(purchaseOrder.organizationId, organizationId),
        eq(purchaseOrder.isDeleted, false),
        not(eq(purchaseOrder.status, "CANCELLED")),
    ];
    if (projectId) poConditions.push(eq(purchaseOrder.projectId, projectId));

    const pos = await db.query.purchaseOrder.findMany({
        where: and(...poConditions),
        with: {
            milestones: {
                where: eq(milestone.isDeleted, false),
                with: {
                    invoices: {
                        where: and(
                            eq(invoice.isDeleted, false),
                            not(eq(invoice.status, "PAID"))
                        ),
                    },
                },
            },
        },
    });

    const now = new Date();
    const periods = [
        { label: "Next 30 Days", days: 30 },
        { label: "30-60 Days", days: 60 },
        { label: "60-90 Days", days: 90 },
    ];

    const results: CashflowForecast[] = [];
    let cumulativeExposure = 0;

    for (let i = 0; i < periods.length; i++) {
        const periodStart = i === 0 ? now : new Date(now.getTime() + periods[i - 1].days * 24 * 60 * 60 * 1000);
        const periodEnd = new Date(now.getTime() + periods[i].days * 24 * 60 * 60 * 1000);

        let expectedPayments = 0;
        let pendingInvoices = 0;
        let projectedCommitments = 0;

        for (const po of pos) {
            for (const ms of po.milestones) {
                // Check if milestone expected in this period
                if (ms.expectedDate) {
                    const expectedDate = new Date(ms.expectedDate);
                    if (expectedDate >= periodStart && expectedDate < periodEnd) {
                        const msValue = ms.amount ? Number(ms.amount) : 0;
                        projectedCommitments += msValue;
                    }
                }

                // Check pending invoices
                for (const inv of ms.invoices) {
                    if (inv.dueDate) {
                        const dueDate = new Date(inv.dueDate);
                        if (dueDate >= periodStart && dueDate < periodEnd) {
                            const invValue = Number(inv.amount || 0);
                            if (inv.status === "PENDING" || inv.status === "SUBMITTED") {
                                pendingInvoices += invValue;
                            } else if (inv.status === "APPROVED") {
                                expectedPayments += invValue;
                            }
                        }
                    }
                }
            }
        }

        cumulativeExposure += expectedPayments + pendingInvoices;

        results.push({
            period: periods[i].label,
            expectedPayments,
            pendingInvoices,
            projectedCommitments,
            cumulativeExposure,
        });
    }

    return results;
}
