import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { project, purchaseOrder, changeOrder, invoice } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { getActiveOrganizationId } from "@/lib/utils/org-context";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const activeOrgId = await getActiveOrganizationId();
        if (!activeOrgId) {
            return NextResponse.json({ success: false, error: "No active organization" }, { status: 400 });
        }

        // Fetch all projects for the organization
        const projects = await db.query.project.findMany({
            where: eq(project.organizationId, activeOrgId),
            with: {
                organization: true,
            },
        });

        // Calculate metrics for each project
        const projectSummaries = await Promise.all(
            projects.map(async (proj) => {
                // Get PO totals
                const poTotals = await db
                    .select({
                        totalValue: sql<number>`COALESCE(SUM(${purchaseOrder.totalValue}), 0)`.as("totalValue"),
                        totalCount: count(purchaseOrder.id).as("totalCount"),
                    })
                    .from(purchaseOrder)
                    .where(eq(purchaseOrder.projectId, proj.id));

                // Get paid invoices total
                const paidInvoices = await db
                    .select({
                        totalPaid: sql<number>`COALESCE(SUM(${invoice.paidAmount}), 0)`.as("totalPaid"),
                    })
                    .from(invoice)
                    .innerJoin(purchaseOrder, eq(invoice.purchaseOrderId, purchaseOrder.id))
                    .where(eq(purchaseOrder.projectId, proj.id));

                // Get change order impact (amountDelta is the column name)
                const coImpact = await db
                    .select({
                        totalImpact: sql<number>`COALESCE(SUM(CAST(${changeOrder.amountDelta} AS DECIMAL)), 0)`.as("totalImpact"),
                    })
                    .from(changeOrder)
                    .innerJoin(purchaseOrder, eq(changeOrder.purchaseOrderId, purchaseOrder.id))
                    .where(
                        and(
                            eq(purchaseOrder.projectId, proj.id),
                            eq(changeOrder.status, "APPROVED")
                        )
                    );

                const totalValue = Number(poTotals[0]?.totalValue) || 0;
                const totalPaid = Number(paidInvoices[0]?.totalPaid) || 0;
                const changeOrderImpact = Number(coImpact[0]?.totalImpact) || 0;
                const adjustedTotal = totalValue + changeOrderImpact;

                // Calculate financial progress (physical progress would need milestone data)
                const financialProgress = adjustedTotal > 0 ? Math.min((totalPaid / adjustedTotal) * 100, 100) : 0;
                // Use financial progress as a proxy since project doesn't have physicalProgress
                const physicalProgress = financialProgress; // Placeholder - would integrate with milestones

                // Determine status based on financial progress
                let status: "on-track" | "at-risk" | "delayed" = "on-track";
                if (financialProgress < 30) {
                    status = "delayed";
                } else if (financialProgress < 60) {
                    status = "at-risk";
                }

                // Calculate percentage share of total portfolio
                const allProjectsTotal = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
                const percentage = allProjectsTotal > 0 ? ((Number(proj.budget) || 0) / allProjectsTotal) * 100 : 0;

                return {
                    id: proj.id,
                    name: proj.name,
                    code: proj.code,
                    spend: totalPaid,
                    totalValue: adjustedTotal,
                    percentage,
                    status,
                    physicalProgress,
                    financialProgress,
                    poCount: Number(poTotals[0]?.totalCount) || 0,
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: projectSummaries,
        });
    } catch (error) {
        console.error("Dashboard projects API error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch project summaries" },
            { status: 500 }
        );
    }
}
