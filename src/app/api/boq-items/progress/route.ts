import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { updateQuantityInstalled, certifyQuantity } from "@/lib/actions/change-order-engine";

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { action, boqItemId, quantityInstalled, quantityCertified } = body;

        if (!boqItemId) {
            return NextResponse.json({ error: "BOQ item ID required" }, { status: 400 });
        }

        switch (action) {
            case "updateInstalled": {
                if (quantityInstalled === undefined) {
                    return NextResponse.json({ error: "quantityInstalled required" }, { status: 400 });
                }
                const result = await updateQuantityInstalled({
                    boqItemId,
                    quantityInstalled: Number(quantityInstalled),
                });
                return NextResponse.json(result);
            }

            case "certify": {
                if (quantityCertified === undefined) {
                    return NextResponse.json({ error: "quantityCertified required" }, { status: 400 });
                }
                const result = await certifyQuantity({
                    boqItemId,
                    quantityCertified: Number(quantityCertified),
                });
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("[POST /api/boq-items/progress] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
