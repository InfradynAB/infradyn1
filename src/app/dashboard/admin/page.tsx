import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { member, invitation, organization, project, purchaseOrder, user } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { getActiveOrganizationId } from "@/lib/utils/org-context";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export default async function AdminDashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        redirect("/sign-in");
    }

    // Check if user is an Admin
    const currentUser = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
        columns: { role: true, organizationId: true }
    });

    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN")) {
        // Not an admin, redirect to regular dashboard
        redirect("/dashboard");
    }

    // Get active organization
    const activeOrgId = await getActiveOrganizationId();
    if (!activeOrgId) {
        redirect("/dashboard");
    }

    // Fetch organization details
    const org = await db.query.organization.findFirst({
        where: eq(organization.id, activeOrgId),
    });

    if (!org) {
        redirect("/dashboard");
    }

    // Fetch members
    const members = await db.query.member.findMany({
        where: eq(member.organizationId, activeOrgId),
        with: {
            user: {
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    isDeleted: true,
                }
            }
        },
        orderBy: (member, { desc }) => [desc(member.createdAt)]
    });

    // Fetch invitations (all statuses)
    const invites = await db.query.invitation.findMany({
        where: eq(invitation.organizationId, activeOrgId),
        orderBy: (invitation, { desc }) => [desc(invitation.createdAt)]
    });

    // Calculate stats
    const [projectCount, poCount] = await Promise.all([
        db.select({ count: count() })
            .from(project)
            .where(and(
                eq(project.organizationId, activeOrgId),
                eq(project.isDeleted, false)
            )),
        db.select({ count: count() })
            .from(purchaseOrder)
            .where(and(
                eq(purchaseOrder.organizationId, activeOrgId),
                eq(purchaseOrder.isDeleted, false)
            ))
    ]);

    const stats = {
        totalMembers: members.length,
        pendingInvites: invites.filter((invite) => invite.status === "PENDING").length,
        activeProjects: projectCount[0]?.count || 0,
        activePOs: poCount[0]?.count || 0,
    };

    return (
        <AdminDashboardClient
            organization={{
                id: org.id,
                name: org.name,
                slug: org.slug,
                logo: org.logo,
                contactEmail: org.contactEmail,
                phone: org.phone,
                website: org.website,
                industry: org.industry,
                size: org.size,
                description: org.description,
            }}
            members={members}
            pendingInvites={invites}
            stats={stats}
        />
    );
}
