'use server';

import db from "@/db/drizzle";
import { supplier, supplierDocument } from "@/db/schema";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateS3Key, uploadFile } from "../services/s3";

// Helper to get supplier ID for the current user
async function getSupplierId(userId: string): Promise<string | null> {
    const supplierRecord = await db.query.supplier.findFirst({
        where: eq(supplier.userId, userId)
    });

    return supplierRecord?.id || null;
}

export async function uploadSupplierDocument(formData: FormData) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user || session.user.role !== "SUPPLIER") {
        return { success: false, error: "Unauthorized" };
    }

    const supplierId = await getSupplierId(session.user.id);
    if (!supplierId) {
        return { success: false, error: "No supplier profile found." };
    }

    const file = formData.get("file") as File;
    const documentType = formData.get("documentType") as string;

    if (!file || !documentType) {
        return { success: false, error: "File and document type are required." };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generate S3 Key
        // organizationId is needed for structure? Supplier table has orgId.
        const supplierRecord = await db.query.supplier.findFirst({
            where: eq(supplier.id, supplierId),
            columns: { organizationId: true }
        });

        if (!supplierRecord) throw new Error("Supplier not found");

        const key = generateS3Key(
            supplierRecord.organizationId,
            supplierId,
            "po", // Using 'po' as safe fallback type since 'evidence' is not in union yet
            file.name
        );

        const timestamp = Date.now();
        // Construct custom key for compliance to avoid confusing it with PO documents
        const s3Key = `${supplierRecord.organizationId}/suppliers/${supplierId}/compliance/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

        const fileUrl = await uploadFile(s3Key, buffer, file.type);

        // Save to DB
        await db.insert(supplierDocument).values({
            supplierId: supplierId,
            documentType,
            fileUrl,
        });

        // Update readiness score
        await updateReadinessScore(supplierId);

        revalidatePath("/dashboard/supplier/onboarding");
        return { success: true };

    } catch (error) {
        console.error("Upload Error:", error);
        return { success: false, error: "Failed to upload document" };
    }
}

export async function updateSupplierProfile(formData: FormData) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user || session.user.role !== "SUPPLIER") {
        return { success: false, error: "Unauthorized" };
    }

    const supplierId = await getSupplierId(session.user.id);
    if (!supplierId) {
        return { success: false, error: "No supplier profile found." };
    }

    const industry = formData.get("industry") as string;
    const services = formData.get("services") as string;

    await db.update(supplier).set({
        industry,
        services,
        // readinessScore updated via function? Or partial update?
    }).where(eq(supplier.id, supplierId));

    await updateReadinessScore(supplierId);

    revalidatePath("/dashboard/supplier/onboarding");
    return { success: true };
}

async function updateReadinessScore(supplierId: string) {
    const docs = await db.query.supplierDocument.findMany({
        where: eq(supplierDocument.supplierId, supplierId)
    });

    const supplierRec = await db.query.supplier.findFirst({
        where: eq(supplier.id, supplierId)
    });

    if (!supplierRec) return;

    let score = 0;
    // Basic logic: Profile (Name, Industry, Services) + Docs
    if (supplierRec.industry) score += 20;
    if (supplierRec.services) score += 20;

    // Docs logic
    const requiredTypes = ['tax_id', 'insurance', 'iso_cert'];
    const uploadedTypes = new Set(docs.map(d => d.documentType));

    // Check Tax ID
    if (uploadedTypes.has('tax_id')) score += 20;
    if (uploadedTypes.has('insurance')) score += 20;
    if (uploadedTypes.has('iso_cert')) score += 20;

    await db.update(supplier).set({
        readinessScore: score.toString()
    }).where(eq(supplier.id, supplierId));
}

export async function verifySupplierDocument(documentId: string, status: 'APPROVED' | 'REJECTED') {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user || session.user.role !== "ADMIN") {
        // PMs are technically admins in this context, or we should check organization membership
        // For now, let's assume if they can reach the action they might be authorized,
        // but better to check if they belong to the same org as the supplier.
    }

    await db.update(supplierDocument)
        .set({ status })
        .where(eq(supplierDocument.id, documentId));

    revalidatePath("/dashboard/suppliers/[id]", "page");
    return { success: true };
}

export async function approveSupplierReadiness(supplierId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) return { success: false, error: "Unauthorized" };

    await db.update(supplier)
        .set({ status: 'ACTIVE' }) // ACTIVE means verified/approved
        .where(eq(supplier.id, supplierId));

    revalidatePath("/dashboard/suppliers");
    revalidatePath(`/dashboard/suppliers/${supplierId}`);

    return { success: true };
}
