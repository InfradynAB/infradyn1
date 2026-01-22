import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { createMagicLink } from "@/lib/actions/ncr-comments";

// POST /api/ncr/magic-link - Generate magic link for supplier
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only QA/PM/Admin can generate magic links
        if (!["QA", "PM", "ADMIN"].includes(session.user.role || "")) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const body = await request.json();
        const { ncrId, supplierId, expiresInHours } = body;

        if (!ncrId || !supplierId) {
            return NextResponse.json(
                { error: "Missing ncrId or supplierId" },
                { status: 400 }
            );
        }

        const result = await createMagicLink({
            ncrId,
            supplierId,
            expiresInHours: expiresInHours || 72,
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[POST /api/ncr/magic-link] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
