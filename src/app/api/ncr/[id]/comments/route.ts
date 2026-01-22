import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { addComment, getCommentThread } from "@/lib/actions/ncr-comments";

// GET /api/ncr/[id]/comments - Get comment thread
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

        // Suppliers cannot see internal comments
        const includeInternal = session.user.role !== "SUPPLIER";

        const result = await getCommentThread(id, includeInternal);
        return NextResponse.json(result);
    } catch (error) {
        console.error("[GET /api/ncr/[id]/comments] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/ncr/[id]/comments - Add comment
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
        const { content, attachmentUrls, voiceNoteUrl, isInternal } = body;

        if (!content && !attachmentUrls?.length && !voiceNoteUrl) {
            return NextResponse.json(
                { error: "Comment must have content, attachments, or voice note" },
                { status: 400 }
            );
        }

        const result = await addComment({
            ncrId: id,
            userId: session.user.id,
            content,
            attachmentUrls,
            voiceNoteUrl,
            authorRole: session.user.role || "USER",
            isInternal: isInternal || false,
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[POST /api/ncr/[id]/comments] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
