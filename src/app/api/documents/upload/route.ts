import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { document, purchaseOrder } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uploadFile, generateS3Key } from "@/lib/services/s3";

/**
 * POST /api/documents/upload
 * Handles multipart/form-data upload for documents (Invoices, etc.)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const purchaseOrderId = formData.get("purchaseOrderId") as string;
        const documentType = (formData.get("documentType") as any) || "INVOICE";

        if (!file || !purchaseOrderId) {
            return NextResponse.json({ error: "Missing file or purchaseOrderId" }, { status: 400 });
        }

        // 1. Get PO details to find Org and Project
        const po = await db.query.purchaseOrder.findFirst({
            where: eq(purchaseOrder.id, purchaseOrderId),
            columns: {
                organizationId: true,
                projectId: true,
            }
        });

        if (!po) {
            return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
        }

        // 2. Upload to S3
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Convert documentType to lowercase for S3 key convention (po, boq, invoice, etc.)
        const s3DocType = documentType.toLowerCase().replace("_report", "") as any;
        const key = generateS3Key(
            po.organizationId,
            po.projectId,
            s3DocType,
            file.name
        );

        const fileUrl = await uploadFile(key, buffer, file.type);

        // 3. Create document record
        const [newDoc] = await db.insert(document).values({
            organizationId: po.organizationId,
            projectId: po.projectId,
            parentId: purchaseOrderId,
            parentType: "PO",
            fileName: file.name,
            fileUrl: fileUrl,
            mimeType: file.type,
            documentType: documentType,
            uploadedBy: session.user.id,
        }).returning();

        return NextResponse.json({
            success: true,
            document: newDoc,
        });
    } catch (error) {
        console.error("[API_DOC_UPLOAD] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Upload failed" },
            { status: 500 }
        );
    }
}
