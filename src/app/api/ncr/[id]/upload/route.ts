import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getUploadPresignedUrl } from "@/lib/services/s3";
import db from "@/db/drizzle";
import { ncrAttachment, ncr } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

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
        // Extract base MIME type (remove codec info like ";codecs=opus")
        const baseMimeType = fileType.split(";")[0].trim();
        
        const allowedTypes = [
            "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp",
            "application/pdf",
            "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav",
            "audio/x-m4a", "audio/aac", "audio/mp3", "audio/x-wav"
        ];

        // Be more flexible with audio types
        const isAudio = baseMimeType.startsWith("audio/");
        const isAllowed = allowedTypes.includes(baseMimeType) || isAudio;

        if (!isAllowed) {
            return NextResponse.json(
                { error: `File type not allowed: ${fileType}` },
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
        const key = `ncr/${ncrId}/${crypto.randomUUID()}.${ext}`;

        // Get presigned URL - use normalized MIME type
        const { uploadUrl, fileUrl } = await getUploadPresignedUrl(key, baseMimeType);

        // Create attachment record
        const [attachment] = await db.insert(ncrAttachment).values({
            ncrId,
            fileUrl,
            fileName,
            mimeType: baseMimeType, // Store normalized type
            fileSize: fileSize || 0,
            category: baseMimeType.startsWith("image/") ? "EVIDENCE" : "OTHER",
            uploadedBy: session.user.id,
        }).returning();

        return NextResponse.json({
            success: true,
            uploadUrl,
            fileUrl,
            key,
            attachmentId: attachment.id,
            contentType: baseMimeType, // Return for client to use in upload
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
