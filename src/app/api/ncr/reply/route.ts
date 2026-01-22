import { NextRequest, NextResponse } from "next/server";
import {
    getNCRViaMagicLink,
    validateMagicLink,
    addComment,
    recordMagicLinkAction,
} from "@/lib/actions/ncr-comments";

// GET /api/ncr/reply?token=xxx - View NCR via magic link (no auth required)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json({ error: "Missing token" }, { status: 400 });
        }

        const result = await getNCRViaMagicLink(token);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[GET /api/ncr/reply] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/ncr/reply - Submit response via magic link (no auth required)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, content, attachmentUrls, voiceNoteUrl } = body;

        if (!token) {
            return NextResponse.json({ error: "Missing token" }, { status: 400 });
        }

        if (!content && !attachmentUrls?.length && !voiceNoteUrl) {
            return NextResponse.json(
                { error: "Response must have content, attachments, or voice note" },
                { status: 400 }
            );
        }

        // Get NCR via magic link to extract ncrId
        const ncrResult = await getNCRViaMagicLink(token);
        if (!ncrResult.success || !ncrResult.data) {
            return NextResponse.json({ error: ncrResult.error || "Invalid token" }, { status: 400 });
        }

        // Add comment as supplier
        const result = await addComment({
            ncrId: ncrResult.data.id,
            magicLinkToken: token,
            content,
            attachmentUrls,
            voiceNoteUrl,
            authorRole: "SUPPLIER",
            isInternal: false,
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Record action for audit
        await recordMagicLinkAction(token);

        return NextResponse.json(result);
    } catch (error) {
        console.error("[POST /api/ncr/reply] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
