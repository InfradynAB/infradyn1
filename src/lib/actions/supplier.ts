'use server';

import db from "@/db/drizzle";
import { supplier, member } from "@/db/schema";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as XLSX from 'xlsx';

// Helper to get all organization IDs for the user
async function getUserOrganizationIds(userId: string): Promise<string[]> {
    const memberships = await db.query.member.findMany({
        where: eq(member.userId, userId),
        columns: { organizationId: true }
    });
    return memberships.map(m => m.organizationId);
}

export async function getSuppliers() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return [];
    }

    const orgIds = await getUserOrganizationIds(session.user.id);
    if (orgIds.length === 0) {
        return [];
    }

    return await db.select().from(supplier).where(inArray(supplier.organizationId, orgIds));
}

export async function importSuppliers(formData: FormData) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized: No session" };
    }

    const orgIds = await getUserOrganizationIds(session.user.id);
    const orgId = orgIds[0];
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

import { performInvitation } from "./invitation";

// Schema for creating a single supplier
interface CreateSupplierInput {
    name: string;
    contactEmail?: string;
    taxId?: string;
    inviteNow?: boolean;
}

/**
 * Create a single supplier manually
 */
export async function createSupplier(input: CreateSupplierInput) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized" };
    }

    const orgIds = await getUserOrganizationIds(session.user.id);
    const orgId = orgIds[0];
    if (!orgId) {
        return { success: false, error: "You must be a member of an organization first." };
    }

    if (!input.name || input.name.trim().length === 0) {
        return { success: false, error: "Supplier name is required" };
    }

    const trimmedEmail = input.contactEmail?.trim();

    try {
        const [newSupplier] = await db.insert(supplier).values({
            organizationId: orgId,
            name: input.name.trim(),
            contactEmail: trimmedEmail || null,
            taxId: input.taxId?.trim() || null,
            status: 'INACTIVE',
        }).returning();

        // Automatically invite if email is provided
        if (trimmedEmail) {
            const inviteResult = await performInvitation({
                orgId,
                email: trimmedEmail,
                role: "SUPPLIER",
                supplierId: newSupplier.id,
                inviterName: session.user.name || "A team member"
            });

            if (!inviteResult.success) {
                // We created the supplier but failed to invite. 
                // Return success but with a warning.
                return {
                    success: true,
                    supplier: newSupplier,
                    warning: `Supplier created, but invitation failed: ${inviteResult.error}`
                };
            }
        }

        revalidatePath("/dashboard/suppliers");
        revalidatePath("/dashboard/procurement/new");

        return { success: true, supplier: newSupplier, invited: !!trimmedEmail };
    } catch (error) {
        console.error("[createSupplier] Error:", error);
        return { success: false, error: "Failed to create supplier" };
    }
}

/**
 * Bulk invite all suppliers that have emails but haven't been invited yet
 */
export async function bulkInviteSuppliers() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized" };
    }

    const orgIds = await getUserOrganizationIds(session.user.id);
    if (orgIds.length === 0) {
        return { success: false, error: "You must be a member of an organization." };
    }

    try {
        // Get all inactive suppliers with valid emails
        const pendingSuppliers = await db
            .select()
            .from(supplier)
            .where(inArray(supplier.organizationId, orgIds));

        const toInvite = pendingSuppliers.filter(
            s => s.status === 'INACTIVE' && s.contactEmail && s.contactEmail.includes('@')
        );

        if (toInvite.length === 0) {
            return { success: false, error: "No pending suppliers with valid emails to invite." };
        }

        let successCount = 0;
        let failCount = 0;

        for (const s of toInvite) {
            try {
                const inviteResult = await performInvitation({
                    orgId: s.organizationId,
                    email: s.contactEmail!,
                    role: "SUPPLIER",
                    supplierId: s.id,
                    inviterName: session.user.name || "A team member"
                });

                if (inviteResult.success) {
                    // Update status
                    await db.update(supplier)
                        .set({ status: 'INVITED' })
                        .where(eq(supplier.id, s.id));
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                console.error(`Failed to invite ${s.contactEmail}:`, err);
                failCount++;
            }
        }

        revalidatePath("/dashboard/suppliers");

        return {
            success: true,
            invited: successCount,
            failed: failCount,
            total: toInvite.length
        };
    } catch (error) {
        console.error("[bulkInviteSuppliers] Error:", error);
        return { success: false, error: "Failed to process bulk invitations" };
    }
}

/**
 * Delete a supplier by ID
 */
export async function deleteSupplier(supplierId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized" };
    }

    const orgIds = await getUserOrganizationIds(session.user.id);
    if (orgIds.length === 0) {
        return { success: false, error: "You must be a member of an organization." };
    }

    try {
        // Verify supplier belongs to user's org
        const [existing] = await db
            .select()
            .from(supplier)
            .where(eq(supplier.id, supplierId));

        if (!existing || !orgIds.includes(existing.organizationId)) {
            return { success: false, error: "Supplier not found" };
        }

        await db.delete(supplier).where(eq(supplier.id, supplierId));

        revalidatePath("/dashboard/suppliers");
        return { success: true };
    } catch (error) {
        console.error("[deleteSupplier] Error:", error);
        return { success: false, error: "Failed to delete supplier" };
    }
}

/**
 * Invite selected suppliers by their IDs
 */
export async function inviteSelectedSuppliers(supplierIds: string[]) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized" };
    }

    if (!supplierIds || supplierIds.length === 0) {
        return { success: false, error: "No suppliers selected" };
    }

    const orgIds = await getUserOrganizationIds(session.user.id);
    if (orgIds.length === 0) {
        return { success: false, error: "You must be a member of an organization." };
    }

    try {
        // Get selected suppliers
        const selectedSuppliers = await db
            .select()
            .from(supplier)
            .where(inArray(supplier.id, supplierIds));

        // Filter to only ones in user's orgs with valid emails
        const toInvite = selectedSuppliers.filter(
            s => orgIds.includes(s.organizationId) &&
                s.status === 'INACTIVE' &&
                s.contactEmail &&
                s.contactEmail.includes('@')
        );

        if (toInvite.length === 0) {
            return { success: false, error: "No valid suppliers to invite" };
        }

        let successCount = 0;
        let failCount = 0;

        for (const s of toInvite) {
            try {
                const inviteResult = await performInvitation({
                    orgId: s.organizationId,
                    email: s.contactEmail!,
                    role: "SUPPLIER",
                    supplierId: s.id,
                    inviterName: session.user.name || "A team member"
                });

                if (inviteResult.success) {
                    await db.update(supplier)
                        .set({ status: 'INVITED' })
                        .where(eq(supplier.id, s.id));
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                console.error(`Failed to invite ${s.contactEmail}:`, err);
                failCount++;
            }
        }

        revalidatePath("/dashboard/suppliers");

        return {
            success: true,
            invited: successCount,
            failed: failCount,
            total: toInvite.length
        };
    } catch (error) {
        console.error("[inviteSelectedSuppliers] Error:", error);
        return { success: false, error: "Failed to process invitations" };
    }
}

