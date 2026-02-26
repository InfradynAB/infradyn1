import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { getBoqItemsList, getBatchesByBoqItemIds } from "@/lib/actions/boq-tracker";

function escapeCsv(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId is required" }, { status: 400 });
    }

    const items = await getBoqItemsList({ projectId });
    const batches = await getBatchesByBoqItemIds(items.map((item) => item.id));
    const batchMap = new Map<string, (typeof batches)>();

    for (const batch of batches) {
      const arr = batchMap.get(batch.boqItemId) ?? [];
      arr.push(batch);
      batchMap.set(batch.boqItemId, arr);
    }

    const header = [
      "PO Number",
      "Item Number",
      "Description",
      "Discipline",
      "Material Class",
      "Required Qty",
      "Delivered Qty",
      "Required By",
      "Criticality",
      "Status",
      "Batch Label",
      "Batch Expected",
      "Batch Actual",
      "Batch Qty Expected",
      "Batch Qty Delivered",
      "Batch Status",
    ];

    const lines: string[] = [header.map(escapeCsv).join(",")];

    for (const item of items) {
      const itemBatches = batchMap.get(item.id) ?? [];
      if (itemBatches.length === 0) {
        lines.push([
          item.poNumber,
          item.itemNumber,
          item.description,
          item.discipline ?? "",
          item.materialClass ?? "",
          item.quantity,
          item.quantityDelivered,
          item.requiredByDate ? new Date(item.requiredByDate).toISOString().slice(0, 10) : "",
          item.criticality ?? "",
          item.status,
          "",
          "",
          "",
          "",
          "",
          "",
        ].map(escapeCsv).join(","));
        continue;
      }

      for (const batch of itemBatches) {
        lines.push([
          item.poNumber,
          item.itemNumber,
          item.description,
          item.discipline ?? "",
          item.materialClass ?? "",
          item.quantity,
          item.quantityDelivered,
          item.requiredByDate ? new Date(item.requiredByDate).toISOString().slice(0, 10) : "",
          item.criticality ?? "",
          item.status,
          batch.batchLabel,
          batch.expectedDate ? new Date(batch.expectedDate).toISOString().slice(0, 10) : "",
          batch.actualDate ? new Date(batch.actualDate).toISOString().slice(0, 10) : "",
          batch.quantityExpected,
          batch.quantityDelivered,
          batch.status,
        ].map(escapeCsv).join(","));
      }
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="boq-tracker-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/boq/tracker/export] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
