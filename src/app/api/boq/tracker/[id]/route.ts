import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import db from "@/db/drizzle";
import { boqItem } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recalculatePurchaseOrderTotal } from "@/lib/actions/boq-tracker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.query.boqItem.findFirst({ where: eq(boqItem.id, id) });
    if (!existing) {
      return NextResponse.json({ success: false, error: "BOQ item not found" }, { status: 404 });
    }

    const payload: Partial<typeof boqItem.$inferInsert> = {
      updatedAt: new Date(),
    };

    const nextQuantity = body.quantity !== undefined ? Number(body.quantity) || 0 : Number(existing.quantity ?? 0);
    const nextUnitPrice = body.unitPrice !== undefined ? Number(body.unitPrice) || 0 : Number(existing.unitPrice ?? 0);

    if (body.requiredByDate !== undefined) {
      payload.requiredByDate = body.requiredByDate ? new Date(body.requiredByDate) : null;
    }

    if (body.criticality !== undefined) {
      payload.criticality = body.criticality;
    }

    if (body.scheduleActivityRef !== undefined) {
      payload.scheduleActivityRef = body.scheduleActivityRef;
    }

    if (body.scheduleDaysAtRisk !== undefined) {
      payload.scheduleDaysAtRisk = Number(body.scheduleDaysAtRisk) || 0;
    }

    if (body.quantityDelivered !== undefined) {
      payload.quantityDelivered = String(Number(body.quantityDelivered) || 0);
    }

    if (body.deliveryPercent !== undefined) {
      const percent = Math.min(100, Math.max(0, Number(body.deliveryPercent) || 0));
      const deliveredQtyFromPercent = (nextQuantity * percent) / 100;
      payload.quantityDelivered = String(deliveredQtyFromPercent);
    }

    if (body.itemNumber !== undefined) {
      payload.itemNumber = String(body.itemNumber || "").trim();
    }

    if (body.unit !== undefined) {
      payload.unit = String(body.unit || "").trim();
    }

    if (body.quantity !== undefined) {
      payload.quantity = String(nextQuantity);
    }

    if (body.unitPrice !== undefined) {
      payload.unitPrice = String(nextUnitPrice);
    }

    if (body.quantity !== undefined || body.unitPrice !== undefined) {
      payload.totalPrice = String(nextQuantity * nextUnitPrice);
    }

    const updated = await db
      .update(boqItem)
      .set(payload)
      .where(eq(boqItem.id, id))
      .returning();

    const poTotalValue = await recalculatePurchaseOrderTotal(existing.purchaseOrderId);

    return NextResponse.json({ success: true, item: updated[0], poTotalValue });
  } catch (error) {
    console.error("[PATCH /api/boq/tracker/[id]] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
