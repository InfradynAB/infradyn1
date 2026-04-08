'use server';

import db from "../../../db/drizzle";
import { invitation, member, supplier } from "../../../db/schema";
import { auth } from "../../../auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { performInvitation } from "./invitation";

// Helper to get all organization IDs for the user
async function getUserOrganizationIds(userId: string): Promise<string[]> {
    const memberships = await db.query.member.findMany({
        where: eq(member.userId, userId),
        columns: { organizationId: true }
    });
    return memberships.map(m => m.organizationId);
}

export async function inviteSupplierUser(formData: FormData) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized: No session" };
    }

    const orgIds = await getUserOrganizationIds(session.user.id);
    const orgId = orgIds[0]; // TODO: If user has multiple orgs, should pass orgId in formData or context
    if (!orgId) {
        return { success: false, error: "Unauthorized: You must be a member of an organization to invite suppliers." };
    }

    const email = formData.get("email") as string;
    const supplierId = formData.get("supplierId") as string;

    if (!email) {
        return { success: false, error: "Email is required" };
    }
    if (!supplierId) {
        return { success: false, error: "Supplier ID is required" };
    }

    // Verify supplier belongs to this org
    const targetSupplier = await db.query.supplier.findFirst({
        where: and(
            eq(supplier.id, supplierId),
            eq(supplier.organizationId, orgId)
        )
    });

    if (!targetSupplier) {
        return { success: false, error: "Supplier not found or does not belong to your organization." };
    }

    // Check if already invited
    const existingInvite = await db.query.invitation.findFirst({
        where: and(
            eq(invitation.organizationId, orgId),
            eq(invitation.email, email),
            eq(invitation.status, "PENDING")
        )
    });

    if (existingInvite) {
        return { success: false, error: "Invitation already pending for this email." };
    }

    try {
        const result = await performInvitation({
            orgId,
            email,
            role: "SUPPLIER",
            supplierId,
            inviterName: session.user.name || "Project Manager",
            actor: {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                role: session.user.role,
            },
        });

        if (!result.success) {
            return result;
        }

        revalidatePath("/dashboard/suppliers");
        return { success: true };

    } catch (error) {
        console.error("[SUPPLIER INVITE] Error:", error);
        return { success: false, error: "Failed to send invitation" };
    }
}
