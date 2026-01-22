import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import {
    getNCRById,
    updateNCRStatus,
    closeNCR,
    reopenNCR,
} from "@/lib/actions/ncr-engine";

// GET /api/ncr/[id] - Get NCR details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Check if user can see internal comments (not supplier)
        const includeInternal = session.user.role !== "SUPPLIER";

        const result = await getNCRById(id, includeInternal);
        return NextResponse.json(result);
    } catch (error) {
        console.error("[GET /api/ncr/[id]] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH /api/ncr/[id] - Update NCR status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action, newStatus, closedReason, proofOfFixDocId, creditNoteDocId, reopenReason } = body;

        let result;

        switch (action) {
            case "update_status":
                if (!newStatus) {
                    return NextResponse.json({ error: "newStatus required" }, { status: 400 });
                }
                result = await updateNCRStatus({
                    ncrId: id,
                    newStatus,
                    userId: session.user.id,
                    reason: body.reason,
                });
                break;

            case "close":
                if (!closedReason) {
                    return NextResponse.json({ error: "closedReason required" }, { status: 400 });
                }
                result = await closeNCR({
                    ncrId: id,
                    userId: session.user.id,
                    closedReason,
                    proofOfFixDocId,
                    creditNoteDocId,
                });
                break;

            case "reopen":
                if (!reopenReason) {
                    return NextResponse.json({ error: "reopenReason required" }, { status: 400 });
                }
                result = await reopenNCR(id, session.user.id, reopenReason);
                break;

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[PATCH /api/ncr/[id]] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
