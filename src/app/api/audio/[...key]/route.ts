import { NextRequest, NextResponse } from "next/server";
import { getDownloadPresignedUrl } from "@/lib/services/s3";

/**
 * Proxy route to get presigned download URL for S3 files (audio, documents, images)
 * This bypasses CORS/access issues with direct S3 URLs on private buckets
 * 
 * GET /api/audio/ncr/123/supplier/abc.webm → redirects to presigned S3 URL
 * GET /api/audio/ncr/123/file.pdf → redirects to presigned S3 URL
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ key: string[] }> }
) {
    try {
        const { key: keyParts } = await params;
        const key = keyParts.join("/");

        if (!key) {
            return NextResponse.json({ error: "Key required" }, { status: 400 });
        }

        // Security: Only allow files from expected paths
        const allowedPrefixes = ["ncr/", "audio/", "documents/", "evidence/", "projects/", "support/"];
        const isAllowed = allowedPrefixes.some(prefix => key.startsWith(prefix));

        if (!isAllowed) {
            return NextResponse.json({ error: "Invalid path" }, { status: 403 });
        }

        // Generate presigned URL (valid for 1 hour)
        const presignedUrl = await getDownloadPresignedUrl(key, 3600);

        // Redirect to presigned URL
        return NextResponse.redirect(presignedUrl);
    } catch (error) {
        console.error("[FILE_PROXY]", error);
        return NextResponse.json(
            { error: "Could not retrieve file" },
            { status: 500 }
        );
    }
}
