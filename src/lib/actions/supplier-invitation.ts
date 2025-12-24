'use server';

import db from "../../../db/drizzle";
import { invitation, member, organization, supplier } from "../../../db/schema";
import { auth } from "../../../auth";
import { headers } from "next/headers";
import { eq, and, inArray } from "drizzle-orm";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { render } from "@react-email/render";
import InvitationEmail from "@/emails/invitation-email";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Fetch org name
    const org = await db.query.organization.findFirst({
        where: eq(organization.id, orgId),
        columns: { name: true }
    });
    const orgName = org?.name || "Infradyn Organization";

    try {
        await db.insert(invitation).values({
            organizationId: orgId,
            email,
            role: "SUPPLIER",
            token,
            expiresAt,
            status: "PENDING",
            supplierId: supplierId
        });

        const inviteUrl = `${process.env.BETTER_AUTH_URL}/invite/${token}`;

        const emailHtml = await render(
            InvitationEmail({
                organizationName: orgName,
                role: "Supplier Representative",
                inviteLink: inviteUrl,
                inviterName: session.user.name || "Project Manager"
            })
        );

        const result = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
            to: email,
            subject: `Invitation to join ${orgName} as a Supplier on Infradyn`,
            html: emailHtml
        });

        if (result.error) {
            console.error("[SUPPLIER INVITE] Resend Error:", result.error);
            return {
                success: false,
                error: `Failed to send email: ${result.error.message || "Unknown error"}`
            };
        }

        revalidatePath("/dashboard/suppliers");
        return { success: true };

    } catch (error) {
        console.error("[SUPPLIER INVITE] Error:", error);
        return { success: false, error: "Failed to send invitation" };
    }
}
