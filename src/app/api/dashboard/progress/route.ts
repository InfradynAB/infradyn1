import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getPaymentSummary, calculateBudgetExposure, getPendingInvoices } from "@/lib/actions/finance-engine";
import { getCOImpactSummary, getPendingChangeOrders } from "@/lib/actions/change-order-engine";
import db from "@/db/drizzle";
import { purchaseOrder, milestone, progressRecord, supplier } from "@/db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";

interface SupplierProgress {
    supplierId: string;
    supplierName: string;
    totalMilestones: number;
    avgProgress: number;
    completedMilestones: number;
}

/**
 * GET /api/dashboard/progress
 * Returns comprehensive progress and financial dashboard data
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get("projectId");
        const section = searchParams.get("section");

        // PMs see org data, Suppliers see their specific data
        const isSupplier = session.user.role === "SUPPLIER";
        let supplierId: string | undefined;

        if (isSupplier) {
            const supplierProfile = await db.query.supplier.findFirst({
                where: eq(supplier.userId, session.user.id)
            });
            if (!supplierProfile) {
                return NextResponse.json({ error: "Supplier profile not found" }, { status: 404 });
            }
            supplierId = supplierProfile.id;
        }

        // Helper to wrap global queries with the correct scoping
        const options = {
            projectId: projectId || undefined,
            supplierId
        };

        // If specific section requested
        if (section) {
            switch (section) {
                case "payments":
                    const payments = await getPaymentSummary(options.projectId, options.supplierId, undefined);
                    return NextResponse.json(payments);

                case "budget":
                    if (!projectId) {
                        return NextResponse.json({ error: "projectId required for budget" }, { status: 400 });
                    }
                    const budget = await calculateBudgetExposure(projectId); // Budget is always project-scoped
                    return NextResponse.json(budget);

                case "pending-invoices":
                    const invoices = await getPendingInvoices(options.projectId, options.supplierId, undefined);
                    return NextResponse.json(invoices);

                case "pending-cos":
                    const cos = await getPendingChangeOrders(options.projectId, options.supplierId, undefined);
                    return NextResponse.json(cos);

                case "co-impact":
                    const impact = await getCOImpactSummary(options.projectId, options.supplierId, undefined);
                    return NextResponse.json(impact);

                case "supplier-progress":
                    const supplierProgress = await getSupplierProgress(options.projectId, options.supplierId);
                    return NextResponse.json({ success: true, data: supplierProgress });

                default:
                    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
            }
        }

        // Return full dashboard data
        const [
            paymentData,
            budgetData,
            pendingInvoices,
            pendingCOs,
            coImpact,
            supplierProgress,
        ] = await Promise.all([
            getPaymentSummary(options.projectId, options.supplierId, undefined),
            projectId ? calculateBudgetExposure(projectId) : Promise.resolve({ success: true, data: null }),
            getPendingInvoices(options.projectId, options.supplierId, undefined),
            getPendingChangeOrders(options.projectId, options.supplierId, undefined),
            getCOImpactSummary(options.projectId, options.supplierId, undefined),
            getSupplierProgress(options.projectId, options.supplierId),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                payments: paymentData.data,
                budget: budgetData.data,
                pendingInvoices: pendingInvoices.data,
                pendingCOs: pendingCOs.data,
                coImpact: coImpact.data,
                supplierProgress,
            },
        });
    } catch (error) {
        console.error("[GET /api/dashboard/progress] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * Calculate progress metrics grouped by supplier
 */
async function getSupplierProgress(projectId?: string, supplierId?: string): Promise<SupplierProgress[]> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return [];

    // Get all POs with their milestones and progress
    let whereClause = and(
        projectId ? eq(purchaseOrder.projectId, projectId) : sql`1=1`,
        supplierId ? eq(purchaseOrder.supplierId, supplierId) : sql`1=1`,
        eq(purchaseOrder.organizationId, session.user.organizationId as string)
    );

    const pos = await db.query.purchaseOrder.findMany({
        where: whereClause,
        with: {
            supplier: true,
            milestones: {
                with: {
                    progressRecords: {
                        orderBy: [desc(progressRecord.createdAt)],
                        limit: 1,
                    },
                },
            },
        },
    });

    // Group by supplier
    const supplierMap = new Map<string, {
        supplierName: string;
        milestones: Array<{ progress: number; status: string }>;
    }>();

    for (const po of pos) {
        if (!po.supplier) continue;

        const existing = supplierMap.get(po.supplierId) || {
            supplierName: po.supplier.name,
            milestones: [],
        };

        for (const ms of po.milestones) {
            const latestProgress = ms.progressRecords[0];
            existing.milestones.push({
                progress: Number(latestProgress?.percentComplete || 0),
                status: ms.status || "PENDING",
            });
        }

        supplierMap.set(po.supplierId, existing);
    }

    // Calculate aggregates
    const result: SupplierProgress[] = [];
    for (const [sId, data] of supplierMap) {
        const totalMilestones = data.milestones.length;
        const completedMilestones = data.milestones.filter(m => m.progress >= 100).length;
        const avgProgress = totalMilestones > 0
            ? data.milestones.reduce((sum, m) => sum + m.progress, 0) / totalMilestones
            : 0;

        result.push({
            supplierId: sId,
            supplierName: data.supplierName,
            totalMilestones,
            avgProgress: Math.round(avgProgress * 10) / 10,
            completedMilestones,
        });
    }

    // Sort by avg progress descending
    return result.sort((a, b) => b.avgProgress - a.avgProgress);
}
