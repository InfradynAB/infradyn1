import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getUploadPresignedUrl } from "@/lib/services/s3";

/**
 * POST /api/support/upload
 * Returns a presigned S3 URL for uploading a support ticket screenshot / attachment.
 * No project or org scope is required — this is a platform-level upload.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { fileName, contentType } = body as { fileName: string; contentType: string };

        if (!fileName || !contentType) {
            return NextResponse.json({ error: "fileName and contentType are required" }, { status: 400 });
        }

        // Only allow images and PDFs
        const allowed = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "application/pdf"];
        if (!allowed.includes(contentType)) {
            return NextResponse.json({ error: "Only images and PDFs are allowed" }, { status: 400 });
        }

        const ts = Date.now();
        const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const key = `support/${session.user.id}/${ts}_${safe}`;

        const { uploadUrl, fileUrl } = await getUploadPresignedUrl(key, contentType);

        return NextResponse.json({ success: true, uploadUrl, fileUrl, key });
    } catch (err: any) {
        console.error("[/api/support/upload]", err);
        return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }
}
