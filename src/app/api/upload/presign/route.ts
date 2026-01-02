import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getUploadPresignedUrl, generateS3Key } from "@/lib/services/s3";
import { z } from "zod";

// Request validation schema
const requestSchema = z.object({
    fileName: z.string().min(1),
    contentType: z.string().min(1),
    docType: z.enum(["po", "boq", "invoice", "packing-list", "evidence", "progress", "other"]),
    orgId: z.string().uuid(),
    projectId: z.string().uuid(),
    parentId: z.string().uuid().optional(), // PO ID for document association
});

/**
 * POST /api/upload/presign
 * Returns a presigned URL for direct S3 upload
 */
export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const parsed = requestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { fileName, contentType, docType, orgId, projectId } = parsed.data;

        // Generate S3 key
        const key = generateS3Key(orgId, projectId, docType, fileName);

        // Get presigned URL
        const { uploadUrl, fileUrl } = await getUploadPresignedUrl(key, contentType);

        return NextResponse.json({
            success: true,
            uploadUrl,
            fileUrl,
            key,
        });
    } catch (error) {
        console.error("[/api/upload/presign] Error:", error);
        return NextResponse.json(
            { error: "Failed to generate upload URL" },
            { status: 500 }
        );
    }
}
