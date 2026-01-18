import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { createClientInstruction } from "@/lib/actions/change-order-engine";

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
