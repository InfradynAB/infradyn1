import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getNetContractSummary } from "@/lib/actions/change-order-engine";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: projectId } = await params;

        if (!projectId) {
            return NextResponse.json({ error: "Project ID required" }, { status: 400 });
        }

        const result = await getNetContractSummary(projectId);
        return NextResponse.json(result);
    } catch (error) {
        console.error("[GET /api/projects/[id]/contract-summary] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
