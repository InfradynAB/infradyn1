import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import {
    createNCR,
    getNCRsByPO,
    getNCRDashboard,
} from "@/lib/actions/ncr-engine";

// GET /api/ncr - List NCRs (filtered by query params)
export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const purchaseOrderId = searchParams.get("purchaseOrderId");
        const organizationId = searchParams.get("organizationId");

        // If purchaseOrderId provided, get NCRs for that PO
        if (purchaseOrderId) {
            const result = await getNCRsByPO(purchaseOrderId);
            return NextResponse.json(result);
        }

        // Otherwise get dashboard data for organization
        if (organizationId) {
            const result = await getNCRDashboard(organizationId);
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Missing purchaseOrderId or organizationId" }, { status: 400 });
    } catch (error) {
        console.error("[GET /api/ncr] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/ncr - Create new NCR
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            organizationId,
            projectId,
            purchaseOrderId,
            supplierId,
            title,
            description,
            severity,
            issueType,
            affectedBoqItemId,
            batchId,
            qaInspectionTaskId,
            sourceDocumentId,
        } = body;

        if (!organizationId || !projectId || !purchaseOrderId || !supplierId || !title || !severity || !issueType) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const result = await createNCR({
            organizationId,
            projectId,
            purchaseOrderId,
            supplierId,
            title,
            description,
            severity,
            issueType,
            affectedBoqItemId,
            batchId,
            reportedBy: session.user.id,
            qaInspectionTaskId,
            sourceDocumentId,
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[POST /api/ncr] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
