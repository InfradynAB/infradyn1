/**
 * Phase 8: Dashboard Analytics API
 * Returns all KPIs and chart data for the analytics dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import {
    getDashboardKPIs,
    getSCurveData,
    getCOBreakdown,
} from "@/lib/services/kpi-engine";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organizationId = session.user.organizationId;
        if (!organizationId) {
            return NextResponse.json(
                { error: "No organization context" },
                { status: 400 }
            );
        }

        // Parse query params
        const searchParams = request.nextUrl.searchParams;
        const projectId = searchParams.get("projectId") || undefined;
        const supplierId = searchParams.get("supplierId") || undefined;
        const dateFrom = searchParams.get("dateFrom")
            ? new Date(searchParams.get("dateFrom")!)
            : undefined;
        const dateTo = searchParams.get("dateTo")
            ? new Date(searchParams.get("dateTo")!)
            : undefined;

        const filters = {
            organizationId,
            projectId,
            supplierId,
            dateFrom,
            dateTo,
        };

        // Fetch all data in parallel
        const [kpis, sCurve, coBreakdown] = await Promise.all([
            getDashboardKPIs(filters),
            getSCurveData(filters),
            getCOBreakdown(filters),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                kpis,
                charts: {
                    sCurve,
                    coBreakdown,
                },
            },
        });
    } catch (error) {
        console.error("[Dashboard Analytics API Error]", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics data" },
            { status: 500 }
        );
    }
}
