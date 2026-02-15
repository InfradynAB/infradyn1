"use server";

import db from "@/db/drizzle";
import { member, organization, user } from "@/db/schema";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getActiveOrganizationId } from "@/lib/utils/org-context";

async function requireAdminOrgAccess() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
        return { error: "Unauthorized" as const };
    }

    const activeOrgId = await getActiveOrganizationId();
    if (!activeOrgId) {
        return { error: "No active organization selected" as const };
    }

    const currentMembership = await db.query.member.findFirst({
        where: and(
            eq(member.organizationId, activeOrgId),
            eq(member.userId, session.user.id)
        ),
        columns: { role: true }
    });

    if (!currentMembership || (currentMembership.role !== "ADMIN" && currentMembership.role !== "SUPER_ADMIN")) {
        return { error: "Permission denied" as const };
    }

    return {
        orgId: activeOrgId,
        actorUserId: session.user.id,
    };
}

export async function updateOrganizationMemberEmail(memberId: string, email: string) {
    const access = await requireAdminOrgAccess();
    if ("error" in access) {
        return { success: false, error: access.error };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
        return { success: false, error: "Please provide a valid email address." };
    }

    const targetMember = await db.query.member.findFirst({
        where: and(eq(member.id, memberId), eq(member.organizationId, access.orgId)),
        columns: { userId: true },
    });

    if (!targetMember) {
        return { success: false, error: "Member not found in this organization." };
    }

    try {
        await db.update(user)
            .set({
                email: normalizedEmail,
                updatedAt: new Date(),
            })
            .where(eq(user.id, targetMember.userId));

        revalidatePath("/dashboard/admin");
        return { success: true };
    } catch (error: unknown) {
        const dbError = error as { code?: string };
        if (dbError?.code === "23505") {
            return { success: false, error: "This email is already in use." };
        }
        return { success: false, error: "Failed to update member email." };
    }
}

export async function removeOrganizationMember(memberId: string) {
    const access = await requireAdminOrgAccess();
    if ("error" in access) {
        return { success: false, error: access.error };
    }

    const targetMember = await db.query.member.findFirst({
        where: and(eq(member.id, memberId), eq(member.organizationId, access.orgId)),
        columns: { userId: true, role: true },
    });

    if (!targetMember) {
        return { success: false, error: "Member not found in this organization." };
    }

    if (targetMember.userId === access.actorUserId) {
        return { success: false, error: "You cannot remove your own membership." };
    }

    if (targetMember.role === "ADMIN" || targetMember.role === "SUPER_ADMIN") {
        const adminCount = await db.query.member.findMany({
            where: and(eq(member.organizationId, access.orgId)),
            columns: { id: true, role: true },
        });

        const remainingAdmins = adminCount.filter(m => (m.role === "ADMIN" || m.role === "SUPER_ADMIN") && m.id !== memberId).length;
        if (remainingAdmins === 0) {
            return { success: false, error: "At least one admin must remain in the organization." };
        }
    }

    await db.delete(member).where(and(eq(member.id, memberId), eq(member.organizationId, access.orgId)));

    revalidatePath("/dashboard/admin");
    return { success: true };
}

export async function updateAdminOrganizationDetails(formData: FormData) {
    const access = await requireAdminOrgAccess();
    if ("error" in access) {
        return { success: false, error: access.error };
    }

    const orgId = formData.get("orgId")?.toString();
    if (!orgId || orgId !== access.orgId) {
        return { success: false, error: "Invalid organization context." };
    }

    const contactEmail = formData.get("contactEmail")?.toString().trim() || null;
    const phone = formData.get("phone")?.toString().trim() || null;
    const website = formData.get("website")?.toString().trim() || null;
    const industry = formData.get("industry")?.toString().trim() || null;
    const size = formData.get("size")?.toString().trim() || null;
    const description = formData.get("description")?.toString().trim() || null;

    await db.update(organization)
        .set({
            contactEmail,
            phone,
            website,
            industry,
            size,
            description,
            updatedAt: new Date(),
        })
        .where(eq(organization.id, access.orgId));

    revalidatePath("/dashboard/admin");
    return { success: true };
}
