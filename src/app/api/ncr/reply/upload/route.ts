import { NextRequest, NextResponse } from "next/server";
import { getUploadPresignedUrl } from "@/lib/services/s3";
import db from "@/db/drizzle";
import { ncrAttachment, ncrMagicLink, ncr } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

/**
 * Token-based upload for suppliers using magic link
 * Allows file uploads without session authentication
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, fileName, fileType, fileSize } = body;

        if (!token) {
            return NextResponse.json({ error: "Token required" }, { status: 401 });
        }

        if (!fileName || !fileType) {
            return NextResponse.json(
                { error: "fileName and fileType required" },
                { status: 400 }
            );
        }

        // Validate magic link token
        const magicLink = await db.query.ncrMagicLink.findFirst({
            where: eq(ncrMagicLink.token, token),
        });

        if (!magicLink) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        if (new Date(magicLink.expiresAt) < new Date()) {
            return NextResponse.json({ error: "Token expired" }, { status: 401 });
        }

        const ncrId = magicLink.ncrId;

        // Validate file type - more permissive for voice notes
        // Extract base MIME type (remove codec info like ";codecs=opus")
        const baseMimeType = fileType.split(";")[0].trim();
        
        const allowedTypes = [
            "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp",
            "application/pdf",
            "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav",
            "audio/x-m4a", "audio/aac", "audio/mp3", "audio/x-wav"
        ];

        // Check if it's an audio or image type (be more flexible)
        const isAudio = baseMimeType.startsWith("audio/");
        const isImage = baseMimeType.startsWith("image/");
        const isAllowed = allowedTypes.includes(baseMimeType) || isAudio || isImage;

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
        const key = `ncr/${ncrId}/supplier/${crypto.randomUUID()}.${ext}`;

        // Get presigned URL - use base MIME type for S3 (without codec info)
        const { uploadUrl, fileUrl } = await getUploadPresignedUrl(key, baseMimeType);

        // Create attachment record
        // Use valid enum values: 'EVIDENCE', 'CORRECTIVE_ACTION', 'INSPECTION_REPORT', 'CREDIT_NOTE', 'OTHER'
        const category = fileType.startsWith("image/") ? "EVIDENCE" : "OTHER";

        const [attachment] = await db.insert(ncrAttachment).values({
            ncrId,
            fileUrl,
            fileName,
            mimeType: fileType,
            fileSize: fileSize || 0,
            category,
            // Note: uploadedBy expects user.id but suppliers via magic link don't have user accounts
            // We'll leave it null and track via magic link audit
            uploadedBy: null,
        }).returning();

        // Update magic link action count
        await db.update(ncrMagicLink)
            .set({
                lastActionAt: new Date(),
                actionsCount: (magicLink.actionsCount || 0) + 1,
            })
            .where(eq(ncrMagicLink.id, magicLink.id));

        return NextResponse.json({
            success: true,
            uploadUrl,
            fileUrl,
            key,
            attachmentId: attachment.id,
            contentType: baseMimeType, // Return normalized content type for upload
        });
    } catch (error) {
        console.error("[NCR_REPLY_UPLOAD]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Upload failed" },
            { status: 500 }
        );
    }
}
