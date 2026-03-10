import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { findSupplierForUser } from "@/lib/actions/supplier-lookup";
import { getSupplierAnalyticsData } from "@/lib/services/supplier-analytics";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SUPPLIER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    const { supplier } = await findSupplierForUser(
      session.user.id,
      session.user.email,
      session.user.supplierId,
    );

    if (!supplier) {
      return NextResponse.json({ error: "Supplier context not found" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId") || undefined;
    const dateFrom = searchParams.get("dateFrom")
      ? new Date(searchParams.get("dateFrom")!)
      : undefined;
    const dateTo = searchParams.get("dateTo")
      ? new Date(searchParams.get("dateTo")!)
      : undefined;

    const data = await getSupplierAnalyticsData({
      organizationId,
      supplierId: supplier.id,
      projectId,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Supplier Analytics API Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier analytics" },
      { status: 500 },
    );
  }
}
