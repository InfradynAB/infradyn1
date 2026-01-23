import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getUploadPresignedUrl } from "@/lib/services/s3";
import db from "@/db/drizzle";
import { ncrAttachment, ncr } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: ncrId } = await params;
        const body = await request.json();
        const { fileName, fileType, fileSize } = body;

        if (!fileName || !fileType) {
            return NextResponse.json(
                { error: "fileName and fileType required" },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = [
            "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp",
            "application/pdf",
            "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg"
        ];

        if (!allowedTypes.includes(fileType)) {
            return NextResponse.json(
                { error: "File type not allowed" },
                { status: 400 }
            );
        }

        // Check NCR exists
        const ncrRecord = await db.query.ncr.findFirst({
            where: eq(ncr.id, ncrId),
        });

        if (!ncrRecord) {
            return NextResponse.json({ error: "NCR not found" }, { status: 404 });
        }

        // Generate unique key
        const ext = fileName.split(".").pop() || "bin";
        const key = `ncr/${ncrId}/${uuidv4()}.${ext}`;

        // Get presigned URL
        const { uploadUrl, fileUrl } = await getUploadPresignedUrl(key, fileType);

        // Create attachment record
        const [attachment] = await db.insert(ncrAttachment).values({
            ncrId,
            fileUrl,
            fileName,
            mimeType: fileType,
            fileSize: fileSize || 0,
            category: fileType.startsWith("audio/") ? "VOICE_NOTE" :
                fileType === "application/pdf" ? "DOCUMENT" : "PHOTO",
            uploadedBy: session.user.id,
        }).returning();

        return NextResponse.json({
            success: true,
            uploadUrl,
            fileUrl,
            key,
            attachmentId: attachment.id,
        });
    } catch (error) {
        console.error("[NCR_UPLOAD]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Upload failed" },
            { status: 500 }
        );
    }
}

// GET - List attachments for NCR
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: ncrId } = await params;

        const attachments = await db.query.ncrAttachment.findMany({
            where: eq(ncrAttachment.ncrId, ncrId),
            orderBy: (a, { desc }) => [desc(a.createdAt)],
        });

        return NextResponse.json({ success: true, data: attachments });
    } catch (error) {
        console.error("[NCR_ATTACHMENTS_LIST]", error);
        return NextResponse.json(
            { error: "Failed to list attachments" },
            { status: 500 }
        );
    }
}
