import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { document, purchaseOrder, project } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uploadFile, generateS3Key } from "@/lib/services/s3";

/**
 * POST /api/documents/upload
 * Handles multipart/form-data upload for documents (Invoices, Client Instructions, etc.)
 * Supports both PO-level uploads (purchaseOrderId) and project-level uploads (projectId)
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
        const purchaseOrderId = formData.get("purchaseOrderId") as string | null;
        const projectId = formData.get("projectId") as string | null;
        const documentType = (formData.get("documentType") as any) || "INVOICE";

        if (!file) {
            return NextResponse.json({ error: "Missing file" }, { status: 400 });
        }

        let organizationId: string;
        let targetProjectId: string;
        let parentId: string | null = null;
        let parentType: "PO" | "BOQ" | "INVOICE" | "PACKING_LIST" | "CMR" | "NCR" | "EVIDENCE" = "PO";

        // Handle PO-level uploads
        if (purchaseOrderId) {
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

            organizationId = po.organizationId;
            targetProjectId = po.projectId;
            parentId = purchaseOrderId;
            parentType = "PO";
        }
        // Handle project-level uploads (e.g., Client Instructions)
        else if (projectId) {
            const proj = await db.query.project.findFirst({
                where: eq(project.id, projectId),
                columns: {
                    organizationId: true,
                    id: true,
                }
            });

            if (!proj) {
                return NextResponse.json({ error: "Project not found" }, { status: 404 });
            }

            organizationId = proj.organizationId;
            targetProjectId = proj.id;
            parentId = projectId;
            parentType = "EVIDENCE"; // Use EVIDENCE for client instruction attachments
        }
        else {
            return NextResponse.json({ error: "Missing purchaseOrderId or projectId" }, { status: 400 });
        }

        // 2. Upload to S3
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Convert documentType to lowercase for S3 key convention (po, boq, invoice, etc.)
        const s3DocType = documentType.toLowerCase().replace("_report", "") as any;
        const key = generateS3Key(
            organizationId,
            targetProjectId,
            s3DocType,
            file.name
        );

        const fileUrl = await uploadFile(key, buffer, file.type);

        // 3. Create document record
        const [newDoc] = await db.insert(document).values({
            organizationId: organizationId,
            projectId: targetProjectId,
            parentId: parentId,
            parentType: parentType,
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

