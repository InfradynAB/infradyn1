'use server';

import db from "../../../db/drizzle";
import { invitation, member, organization } from "../../../db/schema";
import { auth } from "../../../auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { render } from "@react-email/render";
import InvitationEmail from "@/emails/invitation-email";

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to get user's first organization from membership
async function getUserOrgId(userId: string): Promise<string | null> {
    const membership = await db.query.member.findFirst({
        where: eq(member.userId, userId),
        columns: { organizationId: true }
    });
    return membership?.organizationId || null;
}

export async function getTeamMembers() {
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

    const members = await db.query.member.findMany({
        where: eq(member.organizationId, orgId),
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

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
        return [];
    }

    return await db.select().from(invitation).where(
        and(
            eq(invitation.organizationId, orgId),
            eq(invitation.status, "PENDING")
        )
    );
}

export async function inviteMember(formData: FormData) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized: No session" };
    }

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
        return { success: false, error: "Unauthorized: You must be a member of an organization to invite others." };
    }

    const email = formData.get("email") as string;
    const role = formData.get("role") as string || "MEMBER";

    if (!email) {
        return { success: false, error: "Email is required" };
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
            status: "PENDING"
        });

        const inviteUrl = `${process.env.BETTER_AUTH_URL}/invite/${token}`;

        const emailHtml = await render(
            InvitationEmail({
                organizationName: orgName,
                role: role,
                inviteLink: inviteUrl,
                inviterName: session.user.name || "A team member"
            })
        );

        const result = await resend.emails.send({
            from: "Infradyn <onboarding@resend.dev>", // Replace with your domain in Prod
            to: email,
            subject: `Join ${orgName} on Infradyn`,
            html: emailHtml
        });


        revalidatePath("/dashboard/settings/team");
        return { success: true };

    } catch (error) {
        console.error("[INVITE] Error:", error);
        return { success: false, error: "Failed to send invitation" };
    }
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

    // 3. Add to Members
    try {
        await db.insert(member).values({
            organizationId: invite.organizationId,
            userId: session.user.id,
            role: invite.role as any,
        });

        // 4. Update Invitation Status
        await db.update(invitation)
            .set({ status: "ACCEPTED" })
            .where(eq(invitation.id, invite.id));

        return { success: true };

    } catch (error) {
        console.error("Accept Invite Error:", error);
        return { success: false, error: "Failed to join organization." };
    }
}

