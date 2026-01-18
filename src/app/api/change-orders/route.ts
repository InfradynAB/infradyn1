import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import {
    submitChangeOrder,
    getChangeOrder,
    reviewChangeOrder,
    approveChangeOrder,
    rejectChangeOrder,
    getPendingChangeOrders,
    getCOImpactSummary,
    getChangeOrdersForPO,
    createVariationOrder,
    createDeScope,
} from "@/lib/actions/change-order-engine";

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { action, ...data } = body;

        switch (action) {
            case "submit": {
                const result = await submitChangeOrder({
                    purchaseOrderId: data.purchaseOrderId,
                    reason: data.reason,
                    amountDelta: Number(data.amountDelta),
                    scopeChange: data.scopeChange,
                    scheduleImpactDays: data.scheduleImpactDays ? Number(data.scheduleImpactDays) : undefined,
                    affectedMilestoneIds: data.affectedMilestoneIds,
                });
                return NextResponse.json(result);
            }

            case "review": {
                const result = await reviewChangeOrder(data.changeOrderId);
                return NextResponse.json(result);
            }

            case "approve": {
                const result = await approveChangeOrder({
                    changeOrderId: data.changeOrderId,
                    notes: data.notes,
                });
                return NextResponse.json(result);
            }

            case "reject": {
                const result = await rejectChangeOrder({
                    changeOrderId: data.changeOrderId,
                    rejectionReason: data.rejectionReason,
                });
                return NextResponse.json(result);
            }

            case "create_variation": {
                const result = await createVariationOrder({
                    purchaseOrderId: data.purchaseOrderId,
                    clientInstructionId: data.clientInstructionId,
                    reason: data.reason,
                    items: data.items,
                });
                return NextResponse.json(result);
            }

            case "create_descope": {
                const result = await createDeScope({
                    purchaseOrderId: data.purchaseOrderId,
                    clientInstructionId: data.clientInstructionId,
                    reason: data.reason,
                    items: data.items,
                });
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("[POST /api/change-orders] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get("action");
        const changeOrderId = searchParams.get("id");
        const purchaseOrderId = searchParams.get("purchaseOrderId");
        const projectId = searchParams.get("projectId");

        switch (action) {
            case "get": {
                if (!changeOrderId) {
                    return NextResponse.json({ error: "Missing id" }, { status: 400 });
                }
                const result = await getChangeOrder(changeOrderId);
                return NextResponse.json(result);
            }

            case "pending": {
                const result = await getPendingChangeOrders(purchaseOrderId || undefined);
                return NextResponse.json(result);
            }

            case "list": {
                if (!purchaseOrderId) {
                    return NextResponse.json({ error: "Missing purchaseOrderId" }, { status: 400 });
                }
                const result = await getChangeOrdersForPO(purchaseOrderId);
                return NextResponse.json(result);
            }

            case "impact": {
                const result = await getCOImpactSummary(
                    projectId || undefined,
                    purchaseOrderId || undefined
                );
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("[GET /api/change-orders] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
