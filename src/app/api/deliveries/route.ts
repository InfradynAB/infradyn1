import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import {
    confirmDelivery,
    getDeliveryReceipt,
    listDeliveriesByPO,
    getRemainingDeliveryQty,
    addDeliveryEvidence
} from "@/lib/actions/delivery-engine";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get("action");
        const receiptId = searchParams.get("receiptId");
        const purchaseOrderId = searchParams.get("purchaseOrderId");

        switch (action) {
            case "list": {
                if (!purchaseOrderId) {
                    return NextResponse.json({ error: "purchaseOrderId required" }, { status: 400 });
                }
                const deliveries = await listDeliveriesByPO(purchaseOrderId);
                return NextResponse.json({ deliveries });
            }

            case "get": {
                if (!receiptId) {
                    return NextResponse.json({ error: "receiptId required" }, { status: 400 });
                }
                const receipt = await getDeliveryReceipt(receiptId);
                if (!receipt) {
                    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
                }
                return NextResponse.json({ receipt });
            }

            case "remaining": {
                if (!purchaseOrderId) {
                    return NextResponse.json({ error: "purchaseOrderId required" }, { status: 400 });
                }
                const remaining = await getRemainingDeliveryQty(purchaseOrderId);
                return NextResponse.json({ remaining });
            }

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("[GET /api/deliveries] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { action, ...data } = body;

        switch (action) {
            case "confirm": {
                const result = await confirmDelivery({
                    shipmentId: data.shipmentId,
                    receivedBy: session.user.id,
                    receivedAt: data.receivedAt ? new Date(data.receivedAt) : undefined,
                    items: data.items,
                    isPartial: data.isPartial,
                    photoDocIds: data.photoDocIds,
                    notes: data.notes,
                });
                return NextResponse.json(result);
            }

            case "addEvidence": {
                const result = await addDeliveryEvidence(data.receiptId, data.photoDocIds);
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("[POST /api/deliveries] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
