import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { project, clientInstruction } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClientInstruction } from "@/lib/actions/change-order-engine";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get("projectId");

        if (!projectId) {
            return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
        }

        const instructions = await db.query.clientInstruction.findMany({
            where: eq(clientInstruction.projectId, projectId),
            orderBy: (ci, { desc }) => [desc(ci.createdAt)],
        });

        // Generate presigned URLs for viewing
        const instructionsWithUrls = await Promise.all(instructions.map(async (inst) => {
            if (inst.attachmentUrl) {
                // Extract key from URL or use as is if it's already a key (legacy support)
                let key = inst.attachmentUrl;
                try {
                    const url = new URL(inst.attachmentUrl);
                    if (url.hostname.includes("amazonaws.com")) {
                        key = url.pathname.substring(1); // Remove leading slash
                    }
                } catch (e) {
                    // Not a URL, treat as key
                }

                try {
                    const { getDownloadPresignedUrl } = await import("@/lib/services/s3");
                    const presignedUrl = await getDownloadPresignedUrl(key);
                    return { ...inst, attachmentUrl: presignedUrl };
                } catch (e) {
                    console.error(`Failed to sign URL for instruction ${inst.id}`, e);
                    return inst;
                }
            }
            return inst;
        }));

        return NextResponse.json({ success: true, data: instructionsWithUrls });
    } catch (error) {
        console.error("[GET /api/client-instructions] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { projectId, instructionNumber, type, dateReceived, description, attachmentUrl } = body;

        if (!projectId || !instructionNumber || !type || !attachmentUrl) {
            return NextResponse.json(
                { error: "Missing required fields: projectId, instructionNumber, type, attachmentUrl" },
                { status: 400 }
            );
        }

        const result = await createClientInstruction({
            projectId,
            instructionNumber,
            type,
            dateReceived: new Date(dateReceived),
            description,
            attachmentUrl,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("[POST /api/client-instructions] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
