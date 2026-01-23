import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { parseNCRDocument } from "@/lib/actions/ncr-ai-parser";

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { imageUrl, fileName } = body;

        if (!imageUrl) {
            return NextResponse.json(
                { error: "imageUrl required" },
                { status: 400 }
            );
        }

        const result = await parseNCRDocument(imageUrl, fileName);

        return NextResponse.json(result);
    } catch (error) {
        console.error("[NCR_SCAN]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Scan failed" },
            { status: 500 }
        );
    }
}
