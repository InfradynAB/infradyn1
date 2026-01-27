import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { markCommentsAsRead, getUnreadCommentCount } from "@/lib/actions/ncr-comments";

// POST /api/ncr/[id]/comments/read - Mark comments as read
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { commentIds } = body;

        if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
            return NextResponse.json(
                { error: "commentIds array is required" },
                { status: 400 }
            );
        }

        const result = await markCommentsAsRead({
            ncrId: id,
            commentIds,
            userId: session.user.id,
            userRole: session.user.role || "USER",
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[POST /api/ncr/[id]/comments/read] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

// GET /api/ncr/[id]/comments/read - Get unread count for the current user
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const includeInternal = session.user.role !== "SUPPLIER";

        const result = await getUnreadCommentCount(id, session.user.id, includeInternal);
        return NextResponse.json(result);
    } catch (error) {
        console.error("[GET /api/ncr/[id]/comments/read] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
