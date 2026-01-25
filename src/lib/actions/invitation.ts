'use server';

import db from "../../../db/drizzle";
import { invitation, member, organization, supplier, user } from "../../../db/schema";
import { auth } from "../../../auth";
import { headers } from "next/headers";
import { eq, and, inArray } from "drizzle-orm";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { render } from "@react-email/render";
import InvitationEmail from "@/emails/invitation-email";
import { setActiveOrganizationId, getActiveOrganizationId, forceSetActiveOrganizationId } from "@/lib/utils/org-context";

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to get all organization IDs for the user
async function getUserOrganizationIds(userId: string): Promise<string[]> {
    const memberships = await db.query.member.findMany({
        where: eq(member.userId, userId),
        columns: { organizationId: true }
    });
    return memberships.map(m => m.organizationId);
}

export async function getTeamMembers() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return [];
    }

    // Use active organization context
    const activeOrgId = await getActiveOrganizationId();
    
    if (activeOrgId) {
        const members = await db.query.member.findMany({
            where: eq(member.organizationId, activeOrgId),
            with: { user: true }
        });
        return members;
    }

    // Fallback to all orgs
    const orgIds = await getUserOrganizationIds(session.user.id);
    if (orgIds.length === 0) {
        return [];
    }

    const members = await db.query.member.findMany({
        where: inArray(member.organizationId, orgIds),
        with: {
            user: true
        }
    });

    return members;
}

export async function getPendingInvitations() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return [];
    }

    // Use active organization context
    const activeOrgId = await getActiveOrganizationId();
    
    if (activeOrgId) {
        return await db.select().from(invitation).where(
            and(
                eq(invitation.organizationId, activeOrgId),
                eq(invitation.status, "PENDING")
            )
        );
    }

    // Fallback to all orgs
    const orgIds = await getUserOrganizationIds(session.user.id);
    if (orgIds.length === 0) {
        return [];
    }

    return await db.select().from(invitation).where(
        and(
            inArray(invitation.organizationId, orgIds),
            eq(invitation.status, "PENDING")
        )
    );
}

/**
 * Core invitation logic reusable by other actions
 */
export async function performInvitation({
    orgId,
    email,
    role,
    supplierId,
    inviterName
}: {
    orgId: string;
    email: string;
    role: string;
    supplierId?: string;
    inviterName: string;
}) {
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

    // Fetch org name for the email
    const org = await db.query.organization.findFirst({
        where: eq(organization.id, orgId),
        columns: { name: true }
    });

    const orgName = org?.name || "Infradyn Organization";

    try {
        await db.insert(invitation).values({
            organizationId: orgId,
            email,
            role,
            token,
            expiresAt,
            status: "PENDING",
            supplierId: supplierId || null
        });

        const inviteUrl = `${process.env.BETTER_AUTH_URL}/invite/${token}`;

        const emailHtml = await render(
            InvitationEmail({
                organizationName: orgName,
                role: role,
                inviteLink: inviteUrl,
                inviterName: inviterName
            })
        );

        const result = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
            to: email,
            subject: `Join ${orgName} on Infradyn`,
            html: emailHtml
        });

        if (result.error) {
            console.error("[INVITE] Resend Error:", result.error);
            return {
                success: false,
                error: `Failed to send email: ${result.error.message || "Unknown error"}`
            };
        }

        return { success: true };

    } catch (error) {
        console.error("[INVITE] Error:", error);
        return { success: false, error: "Failed to send invitation" };
    }
}

export async function inviteMember(formData: FormData) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized: No session" };
    }

    // Use active organization for inviting
    const activeOrgId = await getActiveOrganizationId();
    const orgId = activeOrgId || (await getUserOrganizationIds(session.user.id))[0];
    
    if (!orgId) {
        return { success: false, error: "Unauthorized: You must be a member of an organization to invite others." };
    }

    const email = formData.get("email") as string;
    const role = formData.get("role") as string || "MEMBER";
    const supplierId = formData.get("supplierId") as string;

    if (!email) {
        return { success: false, error: "Email is required" };
    }

    const result = await performInvitation({
        orgId,
        email,
        role,
        supplierId,
        inviterName: session.user.name || "A team member"
    });

    if (result.success) {
        revalidatePath("/dashboard/settings/team");
    }

    return result;
}

export async function revokeInvitation(invitationId: string) {
    await db.delete(invitation).where(eq(invitation.id, invitationId));
    revalidatePath("/dashboard/settings/team");
    return { success: true };
}

export async function acceptInvitation(token: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "You must be logged in to accept an invitation." };
    }

    // 1. Find Invitation
    const invite = await db.query.invitation.findFirst({
        where: eq(invitation.token, token)
    });

    if (!invite) {
        return { success: false, error: "Invalid or expired invitation." };
    }

    if (invite.status !== "PENDING") {
        return { success: false, error: "This invitation has already been used." };
    }

    if (new Date() > invite.expiresAt) {
        return { success: false, error: "This invitation has expired." };
    }

    // 2. Verify Email Match (Optional but recommended)
    // if (invite.email !== session.user.email) { ... }

    // 3. Check if user already has an organization (multi-org scenario)
    const existingUser = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
        columns: { organizationId: true }
    });
    const isFirstOrg = !existingUser?.organizationId;

    // 4. Link user to organization and add to members
    try {
        // Check if already a member of this org
        const existingMembership = await db.query.member.findFirst({
            where: and(
                eq(member.userId, session.user.id),
                eq(member.organizationId, invite.organizationId)
            )
        });

        if (existingMembership) {
            // Already a member, just update invitation status
            await db.update(invitation)
                .set({ status: "ACCEPTED" })
                .where(eq(invitation.id, invite.id));
            
            // Set this org as active so they land on the right dashboard
            const cookieSet = await forceSetActiveOrganizationId(invite.organizationId);
            console.log("[acceptInvitation] Existing member - Cookie set result:", cookieSet, "for org:", invite.organizationId);
            
            return { success: true, role: invite.role, organizationId: invite.organizationId };
        }

        // If this is user's first organization, set it as default
        if (isFirstOrg) {
            await db.update(user)
                .set({ 
                    organizationId: invite.organizationId,
                    role: invite.role as any 
                })
                .where(eq(user.id, session.user.id));
        }
        // Note: If user already has an org, we DON'T overwrite their default organizationId
        // They can switch orgs via the org switcher

        // 5. Add to Members table
        await db.insert(member).values({
            organizationId: invite.organizationId,
            userId: session.user.id,
            role: invite.role as any,
        });

        // 6. Update Invitation Status
        await db.update(invitation)
            .set({ status: "ACCEPTED" })
            .where(eq(invitation.id, invite.id));

        // 7. Set the invited org as active so user lands on correct dashboard
        // Use forceSet since we just added them - skip the access check
        const cookieSet = await forceSetActiveOrganizationId(invite.organizationId);
        console.log("[acceptInvitation] Cookie set result:", cookieSet, "for org:", invite.organizationId);

        // 8. Handle Supplier Linking if applicable
        if (invite.role === "SUPPLIER" && invite.supplierId) {
            await db.update(supplier)
                .set({
                    userId: session.user.id,
                    status: 'ONBOARDING'
                })
                .where(eq(supplier.id, invite.supplierId))

            // Update user.supplierId for direct access
            await db.update(user)
                .set({ supplierId: invite.supplierId })
                .where(eq(user.id, session.user.id));
        }

        return { success: true, role: invite.role, organizationId: invite.organizationId };

    } catch (error) {
        console.error("Accept Invite Error:", error);
        return { success: false, error: "Failed to join organization." };
    }
}

