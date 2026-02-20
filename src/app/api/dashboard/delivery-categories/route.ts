import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import {
    getDeliveryCategorySummary,
    getMaterialClassSummary,
    getMaterialClassDetail,
} from "@/lib/actions/delivery-analytics";

/**
 * GET /api/dashboard/delivery-categories
 *
 * Auth: session required — resolves organizationId from session.
 *
 * Query params:
 *   projectId      (optional) — filter to a specific project
 *   discipline     (optional) — if present, returns L2 material class summary
 *   materialClass  (optional) — if present WITH discipline, returns L3 item detail
 *
 * Levels:
 *   L1 — no discipline/materialClass     → DisciplineSummaryRow[]
 *   L2 — discipline only                 → MaterialClassRow[]
 *   L3 — discipline + materialClass      → Weekly delivery batches (MaterialClassDetailRow[])
 */
export async function GET(req: NextRequest) {
    try {
        // ── Auth ──────────────────────────────────────────────────────────
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organizationId = (session.user as any).organizationId as string | undefined;
        if (!organizationId) {
            return NextResponse.json({ error: "No organization context" }, { status: 400 });
        }

        // ── Query params ──────────────────────────────────────────────────
        const { searchParams } = req.nextUrl;
        const projectId = searchParams.get("projectId");
        const discipline = searchParams.get("discipline");
        const materialClass = searchParams.get("materialClass");

        if (!projectId) {
            return NextResponse.json(
                { success: false, error: "projectId is required" },
                { status: 400 },
            );
        }

        // ── Route to appropriate level ────────────────────────────────────

        // L3 — full item detail for a specific material class
        if (discipline && materialClass) {
            const data = await getMaterialClassDetail(projectId, discipline, materialClass);
            return NextResponse.json({ success: true, level: 3, data });
        }

        // L2 — material class breakdown within a discipline
        if (discipline) {
            const data = await getMaterialClassSummary(projectId, discipline);
            return NextResponse.json({ success: true, level: 2, data });
        }

        // L1 — executive discipline summary
        const data = await getDeliveryCategorySummary(projectId);
        return NextResponse.json({ success: true, level: 1, data });
    } catch (error) {
        console.error("[delivery-categories] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch delivery category data" },
            { status: 500 },
        );
    }
}
