import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Log the region to debug env setup
const region = process.env.AWS_REGION || "us-east-1";
console.log(`[S3 Service] Initializing with Region: ${region}, Bucket: ${process.env.AWS_S3_BUCKET}`);

const s3Client = new S3Client({
    region: region,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "infradyn-storage";

export async function getUploadPresignedUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600 // 1 hour
): Promise<{ uploadUrl: string; fileUrl: string }> {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });

    try {
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
        // Standard https S3 URL format
        const fileUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;

        return { uploadUrl, fileUrl };
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        throw new Error("Could not generate upload URL");
    }
}

export async function getDownloadPresignedUrl(
    key: string,
    expiresIn: number = 3600 // 1 hour
): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    try {
        return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
        console.error("Error generating download URL:", error);
        throw new Error("Could not generate download URL");
    }
}

export async function deleteS3Object(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    try {
        await s3Client.send(command);
    } catch (error) {
        console.error("Error deleting S3 object:", error);
        throw new Error("Could not delete file from storage");
    }
}

export function generateS3Key(
    orgId: string,
    projectId: string,
    docType: "po" | "boq" | "invoice" | "packing-list",
    fileName: string
): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    return `${orgId}/${projectId}/${docType}/${timestamp}-${sanitizedFileName}`;
}

/**
 * Extracts the S3 Key from a full S3 URL
 */
export function extractS3KeyFromUrl(url: string): string | null {
    try {
        const urlObj = new URL(url);
        // For s3.amazonaws.com URLs, the path starts with /
        // We remove the leading slash to get the key
        return urlObj.pathname.startsWith("/")
            ? urlObj.pathname.slice(1)
            : urlObj.pathname;
    } catch (e) {
        console.error("Error parsing S3 URL:", e);
        return null;
    }
}
