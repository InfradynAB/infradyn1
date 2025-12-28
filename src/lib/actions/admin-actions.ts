"use server";

import db from "@/db/drizzle";
import { organization, user, supplier, purchaseOrder, project, invitation, member } from "@/db/schema";
import { eq, count, sql, desc, and, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import InvitationEmail from "@/emails/invitation-email";

const resend = new Resend(process.env.RESEND_API_KEY);

// --- Create Organization ---
interface CreateOrgInput {
    name: string;
    industry?: string;
    size?: string;
    contactEmail?: string;
    phone?: string;
    website?: string;
    description?: string;
}

export async function createOrganization(input: CreateOrgInput) {
    try {
        const slug = input.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") + "-" + nanoid(6);

        const [org] = await db.insert(organization).values({
            name: input.name,
            slug,
            industry: input.industry,
            size: input.size,
            contactEmail: input.contactEmail,
            phone: input.phone,
            website: input.website,
            description: input.description,
        }).returning();

        revalidatePath("/dashboard/admin");
        revalidatePath("/dashboard/admin/organizations");

        return { success: true, data: org };
    } catch (error: any) {
        console.error("[CREATE_ORG]", error);
        return { success: false, error: error.message || "Failed to create organization" };
    }
}

// --- Update Organization ---
interface UpdateOrgInput extends CreateOrgInput {
    id: string;
}

export async function updateOrganization(input: UpdateOrgInput) {
    try {
        const [org] = await db.update(organization)
            .set({
                name: input.name,
                industry: input.industry,
                size: input.size,
                contactEmail: input.contactEmail,
                phone: input.phone,
                website: input.website,
                description: input.description,
                updatedAt: new Date(),
            })
            .where(eq(organization.id, input.id))
            .returning();

        revalidatePath("/dashboard/admin");
        revalidatePath("/dashboard/admin/organizations");

        return { success: true, data: org };
    } catch (error: any) {
        console.error("[UPDATE_ORG]", error);
        return { success: false, error: error.message || "Failed to update organization" };
    }
}

// --- Archive Organization ---
export async function archiveOrganization(id: string) {
    try {
        await db.update(organization)
            .set({ isDeleted: true, updatedAt: new Date() })
            .where(eq(organization.id, id));

        revalidatePath("/dashboard/admin");
        revalidatePath("/dashboard/admin/organizations");

        return { success: true };
    } catch (error: any) {
        console.error("[ARCHIVE_ORG]", error);
        return { success: false, error: error.message || "Failed to archive organization" };
    }
}

// --- Invite PM to Organization ---
interface InvitePMInput {
    email: string;
    organizationId: string;
    organizationName: string;
}

export async function invitePMToOrganization(input: InvitePMInput) {
    try {
        const token = nanoid(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create invitation
        await db.insert(invitation).values({
            email: input.email,
            organizationId: input.organizationId,
            role: "PM",
            token,
            expiresAt,
            status: "PENDING",
        });

        // Send invitation email
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;

        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
            to: input.email,
            subject: `You've been invited to join ${input.organizationName}`,
            react: InvitationEmail({
                organizationName: input.organizationName,
                role: "Project Manager",
                inviteLink,
                inviterName: "Infradyn Admin",
            }),
        });

        revalidatePath("/dashboard/admin/users");

        return { success: true };
    } catch (error: any) {
        console.error("[INVITE_PM]", error);
        return { success: false, error: error.message || "Failed to send invitation" };
    }
}

// --- Get Admin Dashboard Stats ---
export async function getAdminStats() {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Total counts
        const [orgCount] = await db.select({ count: count() })
            .from(organization)
            .where(eq(organization.isDeleted, false));

        const [userCount] = await db.select({ count: count() })
            .from(user)
            .where(eq(user.isDeleted, false));

        const [supplierCount] = await db.select({ count: count() })
            .from(supplier)
            .where(eq(supplier.isDeleted, false));

        const [poCount] = await db.select({ count: count() })
            .from(purchaseOrder)
            .where(eq(purchaseOrder.isDeleted, false));

        const [projectCount] = await db.select({ count: count() })
            .from(project)
            .where(eq(project.isDeleted, false));

        // Counts for last 30 days (for trends)
        const [newOrgsThisMonth] = await db.select({ count: count() })
            .from(organization)
            .where(and(
                eq(organization.isDeleted, false),
                gte(organization.createdAt, thirtyDaysAgo)
            ));

        const [newUsersThisMonth] = await db.select({ count: count() })
            .from(user)
            .where(and(
                eq(user.isDeleted, false),
                gte(user.createdAt, thirtyDaysAgo)
            ));

        // Total PO value
        const [poValueResult] = await db.select({
            total: sql<number>`COALESCE(SUM(CAST(${purchaseOrder.totalValue} AS NUMERIC)), 0)`,
        }).from(purchaseOrder).where(eq(purchaseOrder.isDeleted, false));

        // User distribution by role
        const roleDistribution = await db.select({
            role: user.role,
            count: count(),
        })
            .from(user)
            .where(eq(user.isDeleted, false))
            .groupBy(user.role);

        return {
            success: true,
            data: {
                totalOrganizations: orgCount?.count || 0,
                totalUsers: userCount?.count || 0,
                totalSuppliers: supplierCount?.count || 0,
                totalPurchaseOrders: poCount?.count || 0,
                totalProjects: projectCount?.count || 0,
                totalPOValue: poValueResult?.total || 0,
                newOrgsThisMonth: newOrgsThisMonth?.count || 0,
                newUsersThisMonth: newUsersThisMonth?.count || 0,
                roleDistribution: roleDistribution.map(r => ({
                    name: r.role || "Unknown",
                    value: r.count,
                })),
            },
        };
    } catch (error: any) {
        console.error("[GET_ADMIN_STATS]", error);
        return { success: false, error: error.message };
    }
}

// --- List All Organizations ---
export async function listOrganizations() {
    try {
        const orgs = await db.query.organization.findMany({
            where: eq(organization.isDeleted, false),
            orderBy: [desc(organization.createdAt)],
        });

        // Get member counts for each org
        const orgsWithCounts = await Promise.all(
            orgs.map(async (org) => {
                const [memberCount] = await db.select({ count: count() })
                    .from(member)
                    .where(eq(member.organizationId, org.id));

                const [projectTotal] = await db.select({ count: count() })
                    .from(project)
                    .where(and(
                        eq(project.organizationId, org.id),
                        eq(project.isDeleted, false)
                    ));

                return {
                    ...org,
                    memberCount: memberCount?.count || 0,
                    projectCount: projectTotal?.count || 0,
                };
            })
        );

        return { success: true, data: orgsWithCounts };
    } catch (error: any) {
        console.error("[LIST_ORGS]", error);
        return { success: false, error: error.message };
    }
}

// --- List All Users ---
export async function listAllUsers() {
    try {
        const users = await db.query.user.findMany({
            where: eq(user.isDeleted, false),
            orderBy: [desc(user.createdAt)],
            with: {
                organization: true,
            },
        });

        return { success: true, data: users };
    } catch (error: any) {
        console.error("[LIST_USERS]", error);
        return { success: false, error: error.message };
    }
}

// --- Get Recent Activity ---
export async function getRecentActivity(limit = 10) {
    try {
        // Get recent users
        const recentUsers = await db.query.user.findMany({
            where: eq(user.isDeleted, false),
            orderBy: [desc(user.createdAt)],
            limit: 5,
        });

        // Get recent POs
        const recentPOs = await db.query.purchaseOrder.findMany({
            where: eq(purchaseOrder.isDeleted, false),
            orderBy: [desc(purchaseOrder.createdAt)],
            limit: 5,
            with: {
                project: true,
                supplier: true,
            },
        });

        // Get recent orgs
        const recentOrgs = await db.query.organization.findMany({
            where: eq(organization.isDeleted, false),
            orderBy: [desc(organization.createdAt)],
            limit: 5,
        });

        // Combine and sort by date
        const activities = [
            ...recentUsers.map(u => ({
                type: "user_signup" as const,
                title: `${u.name} joined`,
                subtitle: u.email,
                timestamp: u.createdAt,
            })),
            ...recentPOs.map(po => ({
                type: "po_created" as const,
                title: `PO ${po.poNumber} created`,
                subtitle: po.project?.name || "Unknown Project",
                timestamp: po.createdAt,
            })),
            ...recentOrgs.map(org => ({
                type: "org_created" as const,
                title: `${org.name} organization created`,
                subtitle: org.industry || "No industry",
                timestamp: org.createdAt,
            })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);

        return { success: true, data: activities };
    } catch (error: any) {
        console.error("[GET_RECENT_ACTIVITY]", error);
        return { success: false, error: error.message };
    }
}
