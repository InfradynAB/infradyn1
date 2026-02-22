import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { boqItem } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get("action");
        const purchaseOrderId = searchParams.get("purchaseOrderId");

        if (action !== "list") {
            return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
        }

        if (!purchaseOrderId) {
            return NextResponse.json({ success: false, error: "purchaseOrderId required" }, { status: 400 });
        }

        const items = await db.query.boqItem.findMany({
            where: eq(boqItem.purchaseOrderId, purchaseOrderId),
            orderBy: (t, { asc }) => [asc(t.itemNumber)],
        });

        return NextResponse.json({ success: true, items });
    } catch (error) {
        console.error("[GET /api/boq-items] Error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
