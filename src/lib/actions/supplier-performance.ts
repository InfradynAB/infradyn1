"use server";

import db from "@/db/drizzle";
import {
    supplier,
    purchaseOrder,
    progressRecord,
    conflictRecord,
    milestone,
    invitation,
} from "@/db/schema";
import { eq, and, desc, gte, count, sql } from "drizzle-orm";

// --- Types ---
interface SupplierPerformanceMetrics {
    supplierId: string;
    supplierName: string;
    // Adoption Metrics
    portalAdoption: {
        hasLoggedIn: boolean;
        lastLoginAt: Date | null;
        totalLogins: number;
    };
    // Response Metrics
    responseRate: number; // % of update requests responded to
    avgResponseTime: number; // hours
    missedUpdates: number; // >3 triggers flag
    // Accuracy Metrics
    reportingAccuracy: number; // % of reports matching IRP within 10%
    conflictRate: number; // % of milestones with conflicts
    // Overall Score
    reliabilityScore: number; // 0-100
}

interface SupplierHistoryItem {
    type: "progress" | "conflict" | "milestone" | "document";
    date: Date;
    title: string;
    description: string;
    projectName?: string;
    poNumber?: string;
    metadata?: Record<string, any>;
}

// --- Supplier Performance Metrics ---

/**
 * Calculate comprehensive performance metrics for a supplier.
 * Used in the Supplier Performance Dashboard.
 */
export async function getSupplierPerformance(supplierId: string): Promise<{
    success: boolean;
    data?: SupplierPerformanceMetrics;
    error?: string;
}> {
    try {
        // Get supplier info
        const supplierData = await db.query.supplier.findFirst({
            where: eq(supplier.id, supplierId),
        });

        if (!supplierData) {
            return { success: false, error: "Supplier not found" };
        }

        // Get all POs for this supplier
        const supplierPOs = await db.query.purchaseOrder.findMany({
            where: and(
                eq(purchaseOrder.supplierId, supplierId),
                eq(purchaseOrder.isDeleted, false)
            ),
            with: {
                milestones: {
                    with: {
                        progressRecords: true,
                    },
                },
            },
        });

        // Calculate metrics
        let totalProgressRecords = 0;
        let srpRecords = 0;
        let irpRecords = 0;
        let matchingRecords = 0;
        let totalMilestones = 0;
        let milestonesWithConflict = 0;
        let totalResponseTimeHours = 0;
        let responseCount = 0;

        for (const po of supplierPOs) {
            for (const m of po.milestones) {
                totalMilestones++;
                totalProgressRecords += m.progressRecords.length;

                const srpList = m.progressRecords.filter((r) => r.source === "SRP");
                const irpList = m.progressRecords.filter((r) => r.source === "IRP");

                srpRecords += srpList.length;
                irpRecords += irpList.length;

                // Check accuracy: compare latest SRP vs IRP
                if (srpList.length > 0 && irpList.length > 0) {
                    const latestSrp = Number(srpList[0].percentComplete);
                    const latestIrp = Number(irpList[0].percentComplete);
                    if (Math.abs(latestSrp - latestIrp) <= 10) {
                        matchingRecords++;
                    } else {
                        milestonesWithConflict++;
                    }
                }

                // Calculate response time (time between IRP and SRP)
                if (srpList.length > 0 && irpList.length > 0) {
                    const srpDate = new Date(srpList[0].reportedDate);
                    const irpDate = new Date(irpList[0].reportedDate);
                    const diffHours = Math.abs(srpDate.getTime() - irpDate.getTime()) / (1000 * 60 * 60);
                    totalResponseTimeHours += diffHours;
                    responseCount++;
                }
            }
        }

        // Calculate final metrics (all capped at 100%)
        const responseRate = totalMilestones > 0
            ? Math.min(100, (srpRecords / totalMilestones) * 100)
            : 0;
        const avgResponseTime = responseCount > 0 ? totalResponseTimeHours / responseCount : 0;
        const reportingAccuracy = (srpRecords > 0 && irpRecords > 0)
            ? Math.min(100, (matchingRecords / Math.min(srpRecords, irpRecords)) * 100)
            : 0;
        const conflictRate = totalMilestones > 0
            ? Math.min(100, (milestonesWithConflict / totalMilestones) * 100)
            : 0;

        // Calculate reliability score (weighted average, capped at 100)
        const reliabilityScore = Math.min(100, Math.round(
            (responseRate * 0.3) +
            (reportingAccuracy * 0.4) +
            ((100 - conflictRate) * 0.3)
        ));

        // Count missed updates (milestones without SRP for 7+ days)
        const [missedCountResult] = await db.select({ count: count() })
            .from(conflictRecord)
            .where(and(
                eq(conflictRecord.type, "PROGRESS_MISMATCH"),
                eq(conflictRecord.state, "OPEN")
            ));

        const missedUpdates = missedCountResult?.count || 0;

        return {
            success: true,
            data: {
                supplierId,
                supplierName: supplierData.name,
                portalAdoption: {
                    hasLoggedIn: supplierData.status === "ACTIVE",
                    lastLoginAt: null, // Would come from session tracking
                    totalLogins: 0, // Would come from audit logs
                },
                responseRate: Math.round(responseRate),
                avgResponseTime: Math.round(avgResponseTime * 10) / 10,
                missedUpdates,
                reportingAccuracy: Math.round(reportingAccuracy),
                conflictRate: Math.round(conflictRate),
                reliabilityScore,
            },
        };
    } catch (error: any) {
        console.error("[SUPPLIER_PERFORMANCE]", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get aggregated performance metrics for all suppliers in an organization.
 */
export async function getOrganizationSupplierMetrics(organizationId: string) {
    try {
        const suppliers = await db.query.supplier.findMany({
            where: and(
                eq(supplier.organizationId, organizationId),
                eq(supplier.isDeleted, false)
            ),
        });

        const metrics = await Promise.all(
            suppliers.map(async (s) => {
                const result = await getSupplierPerformance(s.id);
                return result.success ? result.data : null;
            })
        );

        const validMetrics = metrics.filter(Boolean) as SupplierPerformanceMetrics[];

        // Aggregate stats
        const avgReliability = validMetrics.length > 0
            ? Math.round(validMetrics.reduce((sum, m) => sum + m.reliabilityScore, 0) / validMetrics.length)
            : 0;

        const flaggedSuppliers = validMetrics.filter((m) => m.missedUpdates >= 3);
        const lowPerformers = validMetrics.filter((m) => m.reliabilityScore < 50);
        const highPerformers = validMetrics.filter((m) => m.reliabilityScore >= 80);

        return {
            success: true,
            data: {
                totalSuppliers: suppliers.length,
                averageReliabilityScore: avgReliability,
                flaggedSuppliers: flaggedSuppliers.length,
                lowPerformers: lowPerformers.length,
                highPerformers: highPerformers.length,
                suppliers: validMetrics,
            },
        };
    } catch (error: any) {
        console.error("[ORG_SUPPLIER_METRICS]", error);
        return { success: false, error: error.message };
    }
}

// --- Consolidated Supplier History ---

/**
 * Get consolidated history for a supplier across all projects.
 * Critical for Phase 5 supplier assessment.
 */
export async function getSupplierHistory(
    supplierId: string,
    limit = 50
): Promise<{ success: boolean; data?: SupplierHistoryItem[]; error?: string }> {
    try {
        // Get all POs for this supplier
        const supplierPOs = await db.query.purchaseOrder.findMany({
            where: and(
                eq(purchaseOrder.supplierId, supplierId),
                eq(purchaseOrder.isDeleted, false)
            ),
            with: {
                project: true,
                milestones: {
                    with: {
                        progressRecords: {
                            orderBy: [desc(progressRecord.reportedDate)],
                            limit: 10,
                        },
                    },
                },
            },
            orderBy: [desc(purchaseOrder.createdAt)],
        });

        // Get conflicts
        const conflicts = await db.query.conflictRecord.findMany({
            where: eq(conflictRecord.purchaseOrderId, supplierPOs[0]?.id ?? ""),
            orderBy: [desc(conflictRecord.createdAt)],
            limit: 20,
        });

        // Build consolidated history
        const history: SupplierHistoryItem[] = [];

        // Add progress records
        for (const po of supplierPOs) {
            for (const m of po.milestones) {
                for (const pr of m.progressRecords) {
                    history.push({
                        type: "progress",
                        date: new Date(pr.reportedDate),
                        title: `${m.title}: ${pr.percentComplete}%`,
                        description: pr.comment || `Updated via ${pr.source}`,
                        projectName: po.project?.name,
                        poNumber: po.poNumber,
                        metadata: {
                            source: pr.source,
                            trustLevel: pr.trustLevel,
                            isForecast: pr.isForecast,
                        },
                    });
                }

                // Add milestone itself
                history.push({
                    type: "milestone",
                    date: new Date(m.createdAt),
                    title: `Milestone Created: ${m.title}`,
                    description: `${m.paymentPercentage}% payment milestone`,
                    projectName: po.project?.name,
                    poNumber: po.poNumber,
                });
            }
        }

        // Add conflicts
        for (const c of conflicts) {
            const po = supplierPOs.find((p) => p.id === c.purchaseOrderId);
            history.push({
                type: "conflict",
                date: new Date(c.createdAt),
                title: `Conflict: ${c.type.replace(/_/g, " ")}`,
                description: c.description || `Deviation: ${c.deviationPercent}%`,
                projectName: po?.project?.name,
                poNumber: po?.poNumber,
                metadata: {
                    state: c.state,
                    escalationLevel: c.escalationLevel,
                },
            });
        }

        // Sort by date descending
        history.sort((a, b) => b.date.getTime() - a.date.getTime());

        return {
            success: true,
            data: history.slice(0, limit),
        };
    } catch (error: any) {
        console.error("[SUPPLIER_HISTORY]", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get supplier summary across all projects (for quick view).
 */
export async function getSupplierSummary(supplierId: string) {
    try {
        const [poCount] = await db.select({ count: count() })
            .from(purchaseOrder)
            .where(and(
                eq(purchaseOrder.supplierId, supplierId),
                eq(purchaseOrder.isDeleted, false)
            ));

        const [conflictCount] = await db.select({ count: count() })
            .from(conflictRecord)
            .where(eq(conflictRecord.state, "OPEN"));

        const supplierData = await db.query.supplier.findFirst({
            where: eq(supplier.id, supplierId),
            with: {
                organization: true,
            },
        });

        const performanceResult = await getSupplierPerformance(supplierId);

        return {
            success: true,
            data: {
                supplier: {
                    id: supplierData?.id,
                    name: supplierData?.name,
                    status: supplierData?.status,
                    isVerified: supplierData?.isVerified,
                    readinessScore: supplierData?.readinessScore,
                },
                stats: {
                    totalPOs: poCount?.count || 0,
                    openConflicts: conflictCount?.count || 0,
                    reliabilityScore: performanceResult.data?.reliabilityScore || 0,
                    responseRate: performanceResult.data?.responseRate || 0,
                },
            },
        };
    } catch (error: any) {
        console.error("[SUPPLIER_SUMMARY]", error);
        return { success: false, error: error.message };
    }
}
