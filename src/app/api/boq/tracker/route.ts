import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import {
  getBoqDisciplineSummary,
  getBoqItemsList,
  getBoqMaterialSummary,
  getBatchesByBoqItemIds,
  type BoqTrackerStatus,
} from "@/lib/actions/boq-tracker";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const discipline = searchParams.get("discipline");
    const materialClass = searchParams.get("materialClass");
    const search = searchParams.get("search");
    const status = searchParams.get("status") as BoqTrackerStatus | null;
    const includeItems = searchParams.get("includeItems") === "1";

    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId is required" }, { status: 400 });
    }

    if (discipline && materialClass) {
      const items = await getBoqItemsList({
        projectId,
        discipline,
        materialClass,
        search,
        status,
      });
      const batches = await getBatchesByBoqItemIds(items.map((item) => item.id));
      return NextResponse.json({
        success: true,
        level: 3,
        data: {
          items,
          batches,
        },
      });
    }

    if (discipline) {
      const rows = await getBoqMaterialSummary(projectId, discipline);
      if (!includeItems) {
        return NextResponse.json({ success: true, level: 2, data: rows });
      }

      const items = await getBoqItemsList({
        projectId,
        discipline,
        search,
        status,
      });
      const batches = await getBatchesByBoqItemIds(items.map((item) => item.id));

      return NextResponse.json({
        success: true,
        level: 2,
        data: {
          summary: rows,
          items,
          batches,
        },
      });
    }

    const rows = await getBoqDisciplineSummary(projectId);
    if (!includeItems) {
      return NextResponse.json({ success: true, level: 1, data: rows });
    }

    const items = await getBoqItemsList({
      projectId,
      search,
      status,
    });
    const batches = await getBatchesByBoqItemIds(items.map((item) => item.id));

    return NextResponse.json({
      success: true,
      level: 1,
      data: {
        summary: rows,
        items,
        batches,
      },
    });
  } catch (error) {
    console.error("[GET /api/boq/tracker] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
