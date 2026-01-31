/**
 * Phase 8: Dashboard Export API
 * Exports dashboard data to Excel/CSV/JSON formats
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import {
    getDashboardKPIs,
    getSCurveData,
    getCOBreakdown,
} from "@/lib/services/kpi-engine";
import { getMilestoneTrackerData, getSupplierProgressData } from "@/lib/services/report-engine";
import { generateExcelReport, generateCSVReport, type DashboardExportData } from "@/lib/utils/excel-export";
import db from "@/db/drizzle";
import { auditLog } from "@/db/schema";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgId = session.user.organizationId;
        if (!orgId) {
            return NextResponse.json({ error: "No active organization" }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const format = searchParams.get("format") || "xlsx";
        const reportType = (searchParams.get("type") || "detailed") as "summary" | "detailed";
        const projectId = searchParams.get("projectId") || undefined;

        // Get all dashboard data
        const filters = { organizationId: orgId, projectId };
        const [kpis, sCurve, coBreakdown, milestones, supplierProgress] = await Promise.all([
            getDashboardKPIs(filters),
            getSCurveData(filters),
            getCOBreakdown(filters),
            getMilestoneTrackerData(filters),
            getSupplierProgressData(filters),
        ]);

        // Log export action
        await db.insert(auditLog).values({
            userId: session.user.id,
            action: "DASHBOARD_EXPORT",
            entityType: "REPORT",
            entityId: orgId,
            metadata: JSON.stringify({ format, reportType, projectId, organizationId: orgId }),
        });

        // Prepare export data
        const exportData: DashboardExportData = {
            kpis,
            sCurve,
            coBreakdown,
            milestones,
            supplierProgress,
        };

        // Generate export based on format
        if (format === "xlsx" || format === "excel") {
            const buffer = await generateExcelReport(exportData, reportType, {
                generatedBy: session.user.name || session.user.email || "Unknown",
            });
            
            return new NextResponse(new Uint8Array(buffer), {
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": `attachment; filename="dashboard-report-${new Date().toISOString().slice(0, 10)}.xlsx"`,
                },
            });
        }

        if (format === "csv") {
            const csv = generateCSVReport(exportData);
            return new NextResponse(csv, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="dashboard-${reportType}-${new Date().toISOString().slice(0, 10)}.csv"`,
                },
            });
        }

        if (format === "json") {
            return NextResponse.json({
                success: true,
                data: exportData,
                exportedAt: new Date().toISOString(),
            });
        }

        // Default: return JSON
        return NextResponse.json({
            success: true,
            data: exportData,
            metadata: {
                generatedAt: new Date().toISOString(),
                generatedBy: session.user.name || session.user.email,
                reportType,
                format,
            },
        });
    } catch (error) {
        console.error("Dashboard export error:", error);
        return NextResponse.json(
            { error: "Failed to export dashboard data" },
            { status: 500 }
        );
    }
}
