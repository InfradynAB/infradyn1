"use server";

import { eq } from "drizzle-orm";
import db from "../../../db/drizzle";
import { organization, member, user } from "../../../db/schema";
import { auth } from "../../../auth"; // We need to get the session on the server
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createOrgSchema } from "../schemas/organisation";
import { setActiveOrganizationId, getActiveOrganizationId, verifyOrgAccess } from "@/lib/utils/org-context";
import { setActiveProjectId } from "@/lib/utils/project-context";
import { logAuditEvent } from "@/lib/audit/log-audit-event";



export async function createOrganization(formData: FormData) {
    // 1. Get Session
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    // 2. Parse Input
    const rawData = {
        name: formData.get("name"),
        slug: formData.get("slug"),
        logo: formData.get("logo"),
    };

    const validatedFields = createOrgSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            error: "Validation failed. Please check your inputs.",
            details: validatedFields.error.flatten().fieldErrors
        };
    }

    const { name, slug, logo } = validatedFields.data;

    try {
        await db.transaction(async (tx) => {
            const [createdOrg] = await tx.insert(organization).values({
                name,
                slug,
                logo: logo || null,
                metadata: {}, // initialize empty map
            }).returning();

            const [createdMembership] = await tx.insert(member).values({
                organizationId: createdOrg.id,
                userId: session.user.id,
                role: "admin", // Assuming 'admin' is a valid role in your MemberRole enum
            }).returning();

            await logAuditEvent({
                executor: tx,
                action: "organization.created",
                entityType: "organization",
                entityId: createdOrg.id,
                organizationId: createdOrg.id,
                actor: {
                    id: session.user.id,
                    name: session.user.name,
                    email: session.user.email,
                    role: session.user.role,
                },
                target: {
                    entityType: "organization",
                    entityId: createdOrg.id,
                    label: createdOrg.name,
                    userId: session.user.id,
                },
                sourceModule: "organization",
                metadata: {
                    slug: createdOrg.slug,
                    logo: createdOrg.logo ?? null,
                    createdMembershipId: createdMembership.id,
                },
            });

        });

        // 5. Revalidate & Redirect
        revalidatePath("/dashboard/org");
    } catch (error: unknown) {
        // Log for internal debugging
        console.error("Error creating organization:", error);

        const dbError = error as {
            code?: string;
            cause?: { code?: string; message?: string };
            message?: string;
        };

        // Check for unique constraint violation (PostgreSQL code 23505)
        // Neon/Drizzle errors can be wrapped or have the code on a 'cause' property
        const isDuplicate =
            dbError.code === "23505" ||
            dbError.cause?.code === "23505" ||
            dbError.message?.toLowerCase().includes("unique constraint") ||
            dbError.cause?.message?.toLowerCase().includes("unique constraint");

        if (isDuplicate) {
            return { error: "An organization with this slug already exists. Please try a different slug." };
        }

        return { error: "Failed to create organization. Please try again later." };
    }

    return { success: true, slug };
}

export async function getUserOrganizations() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return [];
    }

    // Fetch organizations where user is a member
    // We join member table with organization table
    // Since Drizzle relations are defined, we can use query builder or raw join
    // Using query builder is cleaner if relations are set up

    // However, for speed and specific fields, simpler query:
    const memberships = await db.query.member.findMany({
        where: (members, { eq }) => eq(members.userId, session.user.id),
        with: {
            organization: true
        }
    });

    // Extract organizations
    return memberships.map(m => m.organization);
}

export async function updateOrganization(formData: FormData) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { error: "Unauthorized" };
    }

    const orgId = formData.get("orgId") as string;
    const retentionPolicyDays = formData.get("retentionPolicyDays") as string;
    const contactEmail = formData.get("contactEmail") as string | null;

    if (!orgId) {
        return { error: "Missing required fields" };
    }

    // specific role check: User must be an ADMIN of this org
    const membership = await db.query.member.findFirst({
        where: (members, { eq, and }) => and(
            eq(members.userId, session.user.id),
            eq(members.organizationId, orgId)
            // eq(members.role, "admin") // Enable this when roles are strictly enforced
        )
    });

    if (!membership) {
        return { error: "You do not have permission to update this organization." };
    }

    try {
        const nextRetentionPolicyDays = retentionPolicyDays ? parseInt(retentionPolicyDays) : 365;
        const currentOrganization = await db.query.organization.findFirst({
            where: eq(organization.id, orgId),
            columns: {
                id: true,
                retentionPolicyDays: true,
                contactEmail: true,
            },
        });

        await db.transaction(async (tx) => {
            await tx.update(organization)
                .set({
                    retentionPolicyDays: nextRetentionPolicyDays,
                    contactEmail: contactEmail || null,
                    updatedAt: new Date(),
                })
                .where(eq(organization.id, orgId));

            await logAuditEvent({
                executor: tx,
                action: "organization.settings_updated",
                entityType: "organization",
                entityId: orgId,
                organizationId: orgId,
                actor: {
                    id: session.user.id,
                    name: session.user.name,
                    email: session.user.email,
                    role: session.user.role,
                },
                target: {
                    entityType: "organization",
                    entityId: orgId,
                },
                sourceModule: "organization",
                metadata: {
                    previousValues: {
                        retentionPolicyDays: currentOrganization?.retentionPolicyDays ?? null,
                        contactEmail: currentOrganization?.contactEmail ?? null,
                    },
                    nextValues: {
                        retentionPolicyDays: nextRetentionPolicyDays,
                        contactEmail: contactEmail || null,
                    },
                },
            });
        });

        revalidatePath("/dashboard/settings/organization");
        revalidatePath("/dashboard");
        return { success: true };
    } catch {
        return { error: "Failed to update organization." };
    }
}

/**
 * Switch the active organization context
 */
export async function switchOrganization(orgId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        return { error: "Unauthorized" };
    }

    // Verify user has access to this org
    const hasAccess = await verifyOrgAccess(session.user.id, orgId);
    if (!hasAccess) {
        return { error: "You do not have access to this organization." };
    }

    // Set the active org cookie
    const success = await setActiveOrganizationId(orgId);
    if (!success) {
        return { error: "Failed to switch organization." };
    }

    await logAuditEvent({
        action: "organization.switched",
        entityType: "organization",
        entityId: orgId,
        organizationId: orgId,
        actor: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: session.user.role,
        },
        target: {
            entityType: "organization",
            entityId: orgId,
            userId: session.user.id,
        },
        sourceModule: "organization",
        metadata: {
            action: "active_organization_changed",
        },
    });

    // Reset project scope when organization changes to avoid stale cross-org project context.
    await setActiveProjectId(null);

    // Revalidate all dashboard paths
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/suppliers");
    revalidatePath("/dashboard/procurement");
    revalidatePath("/dashboard/boq");
    revalidatePath("/dashboard/settings");

    return { success: true, organizationId: orgId };
}

/**
 * Set a user's default organization (updates user.organizationId)
 */
export async function setDefaultOrganization(orgId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        return { error: "Unauthorized" };
    }

    // Verify user has access to this org
    const hasAccess = await verifyOrgAccess(session.user.id, orgId);
    if (!hasAccess) {
        return { error: "You do not have access to this organization." };
    }

    try {
        await db.update(user)
            .set({ organizationId: orgId })
            .where(eq(user.id, session.user.id));

        await logAuditEvent({
            action: "organization.default_set",
            entityType: "organization",
            entityId: orgId,
            organizationId: orgId,
            actor: {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                role: session.user.role,
            },
            target: {
                entityType: "organization",
                entityId: orgId,
                userId: session.user.id,
            },
            sourceModule: "organization",
            metadata: {
                targetUserId: session.user.id,
            },
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Set Default Org Error:", error);
        return { error: "Failed to set default organization." };
    }
}

/**
 * Get the current active organization details
 */
export async function getActiveOrganization() {
    const activeOrgId = await getActiveOrganizationId();
    
    if (!activeOrgId) {
        return null;
    }

    const org = await db.query.organization.findFirst({
        where: eq(organization.id, activeOrgId)
    });

    return org;
}
