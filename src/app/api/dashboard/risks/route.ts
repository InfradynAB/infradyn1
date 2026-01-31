/**
 * Phase 8: Risk Assessment API
 * Returns risk assessments and cashflow forecasts
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getRiskAssessments, getCashflowForecast, getSupplierProgressData } from "@/lib/services/report-engine";

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
        const projectId = searchParams.get("projectId") || undefined;

        const filters = { organizationId: orgId, projectId };

        const [risks, cashflow, supplierProgress] = await Promise.all([
            getRiskAssessments(filters),
            getCashflowForecast(filters),
            getSupplierProgressData(filters),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                risks,
                cashflow,
                supplierProgress,
            },
        });
    } catch (error) {
        console.error("Risk assessment API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch risk data" },
            { status: 500 }
        );
    }
}
