'use server';

import db from "../../../db/drizzle";
import { supplier, user } from "../../../db/schema";
import { eq } from "drizzle-orm";

interface SupplierWithOrg {
    id: string;
    name: string;
    organizationId: string;
    contactEmail: string | null;
    userId: string | null;
    status: string;
    readinessScore: string | null;
    isVerified: boolean | null;
    organization: {
        id: string;
        name: string;
    };
}

/**
 * Finds a supplier record for a user using multiple fallback methods:
 * 1. By supplier.userId matching the user's ID
 * 2. By user.supplierId if set on the user  
 * 3. By matching user email to supplier.contactEmail
 * 
 * If found via method 2 or 3, automatically links the supplier for faster future lookups.
 */
export async function findSupplierForUser(
    userId: string,
    userEmail: string | null | undefined,
    userSupplierId: string | null | undefined
): Promise<{ supplier: SupplierWithOrg | null; method: string }> {

    // Method 1: Lookup by userId (normal flow when invite was properly accepted)
    let supplierData = await db.query.supplier.findFirst({
        where: eq(supplier.userId, userId),
        with: {
            organization: true
        }
    });

    if (supplierData) {
        return { supplier: supplierData as unknown as SupplierWithOrg, method: 'userId' };
    }

    // Method 2: Fallback - lookup by user.supplierId if set
    if (userSupplierId) {
        supplierData = await db.query.supplier.findFirst({
            where: eq(supplier.id, userSupplierId),
            with: {
                organization: true
            }
        });

        if (supplierData) {
            // Auto-link for future lookups
            await db.update(supplier)
                .set({ userId: userId })
                .where(eq(supplier.id, supplierData.id));
            console.log("[findSupplierForUser] Linked supplier via user.supplierId");
            return { supplier: supplierData as unknown as SupplierWithOrg, method: 'supplierId' };
        }
    }

    // Method 3: Fallback - lookup by matching email
    if (userEmail) {
        supplierData = await db.query.supplier.findFirst({
            where: eq(supplier.contactEmail, userEmail),
            with: {
                organization: true
            }
        });

        if (supplierData) {
            // Auto-link for future lookups
            await db.update(supplier)
                .set({ userId: userId })
                .where(eq(supplier.id, supplierData.id));

            // Also update the user's supplierId for reference
            await db.update(user)
                .set({ supplierId: supplierData.id })
                .where(eq(user.id, userId));

            console.log("[findSupplierForUser] Linked supplier via email match:", userEmail);
            return { supplier: supplierData as unknown as SupplierWithOrg, method: 'email' };
        }
    }

    return { supplier: null, method: 'none' };
}
