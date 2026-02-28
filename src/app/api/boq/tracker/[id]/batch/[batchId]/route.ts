import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import db from "@/db/drizzle";
import { boqDeliveryBatch } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { recalculateBoqDeliveredQuantity } from "@/lib/actions/boq-tracker";

interface RouteParams {
  params: Promise<{ id: string; batchId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id, batchId } = await params;
    const body = await request.json();

    const updatePayload: Partial<typeof boqDeliveryBatch.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.batchLabel !== undefined) updatePayload.batchLabel = body.batchLabel;
    if (body.expectedDate !== undefined) updatePayload.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;
    if (body.actualDate !== undefined) updatePayload.actualDate = body.actualDate ? new Date(body.actualDate) : null;
    if (body.quantityExpected !== undefined) updatePayload.quantityExpected = String(Number(body.quantityExpected) || 0);
    if (body.quantityDelivered !== undefined) updatePayload.quantityDelivered = String(Number(body.quantityDelivered) || 0);
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.notes !== undefined) updatePayload.notes = body.notes;

    const updated = await db
      .update(boqDeliveryBatch)
      .set(updatePayload)
      .where(and(eq(boqDeliveryBatch.id, batchId), eq(boqDeliveryBatch.boqItemId, id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    await recalculateBoqDeliveredQuantity(id);

    return NextResponse.json({ success: true, batch: updated[0] });
  } catch (error) {
    console.error("[PATCH /api/boq/tracker/[id]/batch/[batchId]] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
