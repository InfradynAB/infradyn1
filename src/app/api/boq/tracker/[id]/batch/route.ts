import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import db from "@/db/drizzle";
import { boqDeliveryBatch, boqItem } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recalculateBoqDeliveredQuantity } from "@/lib/actions/boq-tracker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const parentItem = await db.query.boqItem.findFirst({ where: eq(boqItem.id, id) });
    if (!parentItem) {
      return NextResponse.json({ success: false, error: "BOQ item not found" }, { status: 404 });
    }

    const body = await request.json();

    const created = await db
      .insert(boqDeliveryBatch)
      .values({
        boqItemId: id,
        linkedPoId: body.linkedPoId ?? parentItem.purchaseOrderId,
        batchLabel: body.batchLabel || "New delivery batch",
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        actualDate: body.actualDate ? new Date(body.actualDate) : null,
        quantityExpected: String(Number(body.quantityExpected) || 0),
        quantityDelivered: String(Number(body.quantityDelivered) || 0),
        status: body.status || "PENDING",
        notes: body.notes || null,
      })
      .returning();

    await recalculateBoqDeliveredQuantity(id);

    return NextResponse.json({ success: true, batch: created[0] });
  } catch (error) {
    console.error("[POST /api/boq/tracker/[id]/batch] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
