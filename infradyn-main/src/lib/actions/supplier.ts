'use server';

import db from "@/db/drizzle";
import { supplier, member } from "@/db/schema";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as XLSX from 'xlsx';

// Helper to get user's first organization from membership
async function getUserOrgId(userId: string): Promise<string | null> {
    const membership = await db.query.member.findFirst({
        where: eq(member.userId, userId),
        columns: { organizationId: true }
    });
    return membership?.organizationId || null;
}

export async function getSuppliers() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return [];
    }

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
        return [];
    }

    return await db.select().from(supplier).where(eq(supplier.organizationId, orgId));
}

export async function importSuppliers(formData: FormData) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized: No session" };
    }

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
        return { success: false, error: "Unauthorized: You must be a member of an organization first." };
    }

    const file = formData.get("file") as File;
    if (!file) {
        return { success: false, error: "No file provided" };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (!data || data.length === 0) {
            return { success: false, error: "Empty file or invalid format" };
        }

        const suppliersToInsert = data.map((row: any) => ({
            organizationId: orgId,
            name: row['Supplier Name'] || row['name'] || row['Name'],
            contactEmail: row['Contact Email'] || row['email'] || row['Email'],
            taxId: row['Tax ID'] || row['tax_id'] || row['TaxId'],
            status: 'INACTIVE' // Default status for imported suppliers
        })).filter(s => s.name); // Ensure name exists

        if (suppliersToInsert.length === 0) {
            return { success: false, error: "No valid suppliers found in file. Ensure columns are 'Supplier Name', 'Contact Email', etc." };
        }

        await db.insert(supplier).values(suppliersToInsert);

        revalidatePath("/dashboard/suppliers");
        return { success: true, count: suppliersToInsert.length };

    } catch (error) {
        console.error("Import error:", error);
        return { success: false, error: "Failed to parse file" };
    }
}

