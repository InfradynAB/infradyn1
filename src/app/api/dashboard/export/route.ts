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
import { auditLog, supplier } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildTrafficCacheKey, getOrSetTrafficCache } from "@/lib/services/traffic-cache";

type ExportSource = "executive" | "pm" | "supplier";

function resolveTimeframeDates(timeframe: string | null): { dateFrom?: Date } {
    if (!timeframe || timeframe === "all") return {};
    const now = new Date();
    if (timeframe === "30d") return { dateFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    if (timeframe === "90d") return { dateFrom: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
    if (timeframe === "ytd") return { dateFrom: new Date(now.getFullYear(), 0, 1) };
    return {};
}

function assertSourceAccess(role: string | undefined, source: ExportSource): boolean {
    if (role === "SUPER_ADMIN" || role === "ADMIN") return true;
    if (role === "PM") return source === "pm";
    if (role === "SUPPLIER") return source === "supplier";
    return source === "pm";
}

async function resolveSupplierIdForUser(userId: string, fallbackSupplierId?: string | null): Promise<string | undefined> {
    if (fallbackSupplierId) return fallbackSupplierId;
    const sup = await db.query.supplier.findFirst({
        where: eq(supplier.userId, userId),
        columns: { id: true },
    });
    return sup?.id;
}

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
        const source = (searchParams.get("source") || "executive") as ExportSource;
        const reportType = (searchParams.get("type") || "detailed") as "summary" | "detailed";
        const projectId = searchParams.get("projectId") || undefined;
        const timeframe = searchParams.get("timeframe");
        const { dateFrom } = resolveTimeframeDates(timeframe);

        if (!assertSourceAccess(session.user.role, source)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const requestedSupplierId = searchParams.get("supplierId") || undefined;
        const sessionSupplierId = await resolveSupplierIdForUser(session.user.id, session.user.supplierId || undefined);
        const supplierId = source === "supplier"
            ? (session.user.role === "SUPPLIER" ? sessionSupplierId : requestedSupplierId)
            : undefined;

        if (source === "supplier" && session.user.role === "SUPPLIER" && !supplierId) {
            return NextResponse.json({ error: "Supplier context not found" }, { status: 400 });
        }

        const cacheKey = buildTrafficCacheKey("dashboard:export-data", [
            orgId,
            source,
            reportType,
            projectId,
            supplierId,
            dateFrom?.toISOString(),
        ]);

        const cached = await getOrSetTrafficCache(cacheKey, 30, async () => {
            const filters = { organizationId: orgId, projectId, supplierId, dateFrom };
            const [kpis, sCurve, coBreakdown, milestones, supplierProgress] = await Promise.all([
                getDashboardKPIs(filters),
                getSCurveData(filters),
                getCOBreakdown(filters),
                getMilestoneTrackerData(filters),
                getSupplierProgressData(filters),
            ]);

            const normalizedSupplierProgress = supplierId
                ? supplierProgress.filter((row) => row.supplierId === supplierId)
                : supplierProgress;

            const exportData: DashboardExportData = {
                kpis,
                sCurve,
                coBreakdown,
                milestones,
                supplierProgress: normalizedSupplierProgress,
            };

            return exportData;
        });

        const exportData = cached.value;

        void db.insert(auditLog).values({
            userId: session.user.id,
            action: "DASHBOARD_EXPORT",
            entityType: "REPORT",
            entityId: orgId,
            metadata: JSON.stringify({
                format,
                reportType,
                source,
                timeframe,
                projectId,
                supplierId,
                organizationId: orgId,
                cache: `${cached.cache}:${cached.layer}`,
            }),
        }).catch((error) => {
            console.error("Dashboard export audit log error:", error);
        });

        // Generate export based on format
        if (format === "xlsx" || format === "excel") {
            const buffer = await generateExcelReport(exportData, reportType, {
                generatedBy: session.user.name || session.user.email || "Unknown",
            });
            
            return new NextResponse(new Uint8Array(buffer), {
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": `attachment; filename="${source}-dashboard-report-${new Date().toISOString().slice(0, 10)}.xlsx"`,
                },
            });
        }

        if (format === "csv") {
            const csv = generateCSVReport(exportData);
            return new NextResponse(csv, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="${source}-dashboard-${reportType}-${new Date().toISOString().slice(0, 10)}.csv"`,
                },
            });
        }

        if (format === "json") {
            return NextResponse.json({
                success: true,
                data: exportData,
                exportedAt: new Date().toISOString(),
            }, {
                headers: {
                    "x-infradyn-cache": `${cached.cache}:${cached.layer}`,
                },
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
                source,
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
