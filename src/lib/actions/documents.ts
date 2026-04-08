"use server";

import db from "@/db/drizzle";
import { document } from "@/db/schema";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { logAuditEvent } from "@/lib/audit/log-audit-event";

interface CreateDocumentInput {
    organizationId: string;
    projectId: string;
    parentId: string;
    parentType: "PO" | "BOQ" | "INVOICE" | "PACKING_LIST" | "CMR" | "NCR" | "EVIDENCE";
    fileName: string;
    fileUrl: string;
    mimeType: string;
    documentType?: "INVOICE" | "PACKING_LIST" | "CMR" | "NCR_REPORT" | "EVIDENCE" | "PROGRESS_REPORT" | "OTHER";
}

type DocumentParentType = CreateDocumentInput["parentType"];

/**
 * Create a document record after file upload.
 */
export async function createDocument(input: CreateDocumentInput) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" };
        }

        const [doc] = await db.transaction(async (tx) => {
            const [createdDocument] = await tx.insert(document).values({
                organizationId: input.organizationId,
                projectId: input.projectId,
                parentId: input.parentId,
                parentType: input.parentType,
                fileName: input.fileName,
                fileUrl: input.fileUrl,
                mimeType: input.mimeType,
                documentType: input.documentType || "EVIDENCE",
                uploadedBy: session.user.id,
            }).returning();

            await logAuditEvent({
                executor: tx,
                action: "document.created",
                entityType: "document",
                entityId: createdDocument.id,
                organizationId: input.organizationId,
                actor: {
                    id: session.user.id,
                    name: session.user.name,
                    email: session.user.email,
                    role: session.user.role,
                },
                target: {
                    entityType: "document",
                    entityId: createdDocument.id,
                    label: createdDocument.fileName,
                    userId: session.user.id,
                },
                sourceModule: "documents",
                metadata: {
                    projectId: input.projectId,
                    parentId: input.parentId,
                    parentType: input.parentType,
                    fileName: input.fileName,
                    mimeType: input.mimeType,
                    documentType: input.documentType || "EVIDENCE",
                    fileUrl: input.fileUrl,
                },
            });

            return [createdDocument];
        });

        revalidatePath("/dashboard/procurement");
        revalidatePath("/dashboard/supplier");

        return { success: true, data: doc };
    } catch (error: unknown) {
        console.error("[CREATE_DOCUMENT]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to create document" };
    }
}

/**
 * Get all documents for a parent (e.g., PO, Invoice, etc.)
 */
export async function getDocumentsByParentId(parentId: string, parentType: DocumentParentType = "PO") {
    try {
        const docs = await db.query.document.findMany({
            where: and(
                eq(document.parentId, parentId),
                eq(document.parentType, parentType)
            ),
            orderBy: desc(document.createdAt),
        });

        return { success: true, data: docs };
    } catch (error: unknown) {
        console.error("[GET_DOCUMENTS_BY_PARENT]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to get documents", data: [] };
    }
}

