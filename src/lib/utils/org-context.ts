"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { member, organization, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
    blockReasonForOrgStatus,
    isOrgProductAccessAllowed,
    type OrgAccessBlockReason,
} from "@/lib/constants/organization-lifecycle";

const ACTIVE_ORG_COOKIE = "active_organization_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type UserOrganizationSummary = {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    role: string;
};

/**
 * Member or legacy `user.organization_id` match, and organization is not SUSPENDED/TERMINATED.
 */
export async function verifyOrgAccess(userId: string, orgId: string): Promise<boolean> {
    const membership = await db.query.member.findFirst({
        where: (members, { eq, and }) => and(eq(members.userId, userId), eq(members.organizationId, orgId)),
        columns: { id: true },
    });

    const userRow = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { organizationId: true },
    });

    const affiliated = !!membership || userRow?.organizationId === orgId;
    if (!affiliated) {
        return false;
    }

    const org = await db.query.organization.findFirst({
        where: eq(organization.id, orgId),
        columns: { status: true },
    });

    return org ? isOrgProductAccessAllowed(org.status) : false;
}

/**
 * Resolve active org for a logged-in user without calling `getSession` again (use from API routes).
 */
export async function resolveActiveOrganizationForUser(params: {
    userId: string;
    sessionOrganizationId: string | null | undefined;
}): Promise<string | null> {
    const { userId, sessionOrganizationId } = params;

    const cookieStore = await cookies();
    const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

    if (cookieOrgId) {
        const hasAccess = await verifyOrgAccess(userId, cookieOrgId);
        if (hasAccess) {
            return cookieOrgId;
        }
        cookieStore.delete(ACTIVE_ORG_COOKIE);
    }

    if (sessionOrganizationId) {
        const ok = await verifyOrgAccess(userId, sessionOrganizationId);
        if (ok) {
            return sessionOrganizationId;
        }
    }

    const memberships = await db.query.member.findMany({
        where: eq(member.userId, userId),
        with: { organization: true },
    });

    for (const m of memberships) {
        if (m.organization && isOrgProductAccessAllowed(m.organization.status)) {
            return m.organizationId;
        }
    }

    return null;
}

/**
 * Get the active organization ID from cookie, falling back to user's default org.
 * Only returns orgs that are allowed for product access (not SUSPENDED/TERMINATED).
 */
export async function getActiveOrganizationId(): Promise<string | null> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return null;
    }

    return resolveActiveOrganizationForUser({
        userId: session.user.id,
        sessionOrganizationId: session.user.organizationId,
    });
}

/**
 * Set the active organization in cookie
 */
export async function setActiveOrganizationId(orgId: string): Promise<boolean> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return false;
    }

    const hasAccess = await verifyOrgAccess(session.user.id, orgId);
    if (!hasAccess) {
        return false;
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
    });

    return true;
}

/**
 * Force set the active organization in cookie (skip access check)
 * Use this only after you've just added the user to the org
 */
export async function forceSetActiveOrganizationId(orgId: string): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: COOKIE_MAX_AGE,
            path: "/",
        });
        return true;
    } catch (error) {
        console.error("[forceSetActiveOrganizationId] Error:", error);
        return false;
    }
}

/**
 * Clear the active organization cookie
 */
export async function clearActiveOrganization(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(ACTIVE_ORG_COOKIE);
}

function toSummary(
    org: { id: string; name: string; slug: string; logo: string | null },
    role: string
): UserOrganizationSummary {
    return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        role,
    };
}

/**
 * Organizations the user may switch to (product-allowed status only).
 * When the user is tied to orgs but all are suspended/terminated, `allOrganizationsBlocked` is true.
 */
export async function getUserOrganizationsWithActive(): Promise<{
    organizations: UserOrganizationSummary[];
    activeOrgId: string | null;
    allOrganizationsBlocked: boolean;
    blockedReason: OrgAccessBlockReason | null;
}> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return { organizations: [], activeOrgId: null, allOrganizationsBlocked: false, blockedReason: null };
    }

    const userId = session.user.id;

    const memberships = await db.query.member.findMany({
        where: eq(member.userId, userId),
        with: {
            organization: true,
        },
    });

    const userRow = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { organizationId: true },
    });

    const summaries: UserOrganizationSummary[] = [];
    const seen = new Set<string>();

    for (const m of memberships) {
        if (!m.organization) continue;
        if (!isOrgProductAccessAllowed(m.organization.status)) continue;
        if (seen.has(m.organizationId)) continue;
        seen.add(m.organizationId);
        summaries.push(toSummary(m.organization, m.role));
    }

    if (userRow?.organizationId && !seen.has(userRow.organizationId)) {
        const org = await db.query.organization.findFirst({
            where: eq(organization.id, userRow.organizationId),
        });
        if (org && isOrgProductAccessAllowed(org.status)) {
            summaries.push({
                id: org.id,
                name: org.name,
                slug: org.slug,
                logo: org.logo,
                role: "MEMBER",
            });
        }
    }

    const hasAffiliation = memberships.length > 0 || !!userRow?.organizationId;
    const allOrganizationsBlocked = hasAffiliation && summaries.length === 0;

    let blockedReason: OrgAccessBlockReason | null = null;
    if (allOrganizationsBlocked) {
        for (const m of memberships) {
            if (m.organization && !isOrgProductAccessAllowed(m.organization.status)) {
                blockedReason = blockReasonForOrgStatus(m.organization.status);
                if (blockedReason) break;
            }
        }
        if (!blockedReason && userRow?.organizationId) {
            const org = await db.query.organization.findFirst({
                where: eq(organization.id, userRow.organizationId),
                columns: { status: true },
            });
            if (org) {
                blockedReason = blockReasonForOrgStatus(org.status);
            }
        }
        blockedReason = blockedReason ?? "org_suspended";
    }

    const activeOrgId = await getActiveOrganizationId();

    return {
        organizations: summaries,
        activeOrgId,
        allOrganizationsBlocked,
        blockedReason,
    };
}
