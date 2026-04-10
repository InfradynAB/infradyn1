import db from "@/db/drizzle";
import { member, organization, user } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { isOrgProductAccessAllowed } from "@/lib/constants/organization-lifecycle";

/**
 * Organization IDs the user may access for live product data (excludes SUSPENDED/TERMINATED).
 */
export async function getProductAllowedOrgIdsForUser(userId: string): Promise<string[]> {
    const ids = new Set<string>();

    const memberships = await db.query.member.findMany({
        where: eq(member.userId, userId),
        with: { organization: true },
    });
    for (const m of memberships) {
        if (m.organization && isOrgProductAccessAllowed(m.organization.status)) {
            ids.add(m.organizationId);
        }
    }

    const u = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { organizationId: true },
    });
    if (u?.organizationId) {
        const org = await db.query.organization.findFirst({
            where: eq(organization.id, u.organizationId),
            columns: { status: true },
        });
        if (org && isOrgProductAccessAllowed(org.status)) {
            ids.add(u.organizationId);
        }
    }

    return [...ids];
}

/**
 * Collect organization IDs tied to a user (member rows + legacy `user.organization_id`).
 */
export async function collectUserOrganizationIds(userId: string): Promise<string[]> {
    const ids = new Set<string>();

    const memberships = await db.query.member.findMany({
        where: eq(member.userId, userId),
        columns: { organizationId: true },
    });
    for (const m of memberships) {
        ids.add(m.organizationId);
    }

    const u = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { organizationId: true },
    });
    if (u?.organizationId) {
        ids.add(u.organizationId);
    }

    return [...ids];
}

/**
 * True if the user belongs to at least one org that is not SUSPENDED/TERMINATED.
 * Used to allow session creation on sign-in when the user has any usable org.
 */
export async function userHasAnyProductAllowedOrg(userId: string): Promise<boolean> {
    const orgIds = await collectUserOrganizationIds(userId);
    if (orgIds.length === 0) {
        return true;
    }

    const orgs = await db.query.organization.findMany({
        where: inArray(organization.id, orgIds),
        columns: { status: true },
    });

    return orgs.some((o) => isOrgProductAccessAllowed(o.status));
}

export async function getOrganizationStatus(orgId: string): Promise<string | null> {
    const row = await db.query.organization.findFirst({
        where: eq(organization.id, orgId),
        columns: { status: true },
    });
    return row?.status ?? null;
}
