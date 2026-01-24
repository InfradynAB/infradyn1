"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { member } from "@/db/schema";
import { eq } from "drizzle-orm";

const ACTIVE_ORG_COOKIE = "active_organization_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Get the active organization ID from cookie, falling back to user's default org
 */
export async function getActiveOrganizationId(): Promise<string | null> {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        return null;
    }

    // First check cookie
    const cookieStore = await cookies();
    const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

    if (cookieOrgId) {
        // Verify user still has access to this org
        const hasAccess = await verifyOrgAccess(session.user.id, cookieOrgId);
        if (hasAccess) {
            return cookieOrgId;
        }
        // Cookie is stale, clear it
        cookieStore.delete(ACTIVE_ORG_COOKIE);
    }

    // Fallback to user's default organization
    if (session.user.organizationId) {
        return session.user.organizationId;
    }

    // If no default, get first available org
    const firstOrg = await db.query.member.findFirst({
        where: eq(member.userId, session.user.id),
        columns: { organizationId: true }
    });

    return firstOrg?.organizationId || null;
}

/**
 * Set the active organization in cookie
 */
export async function setActiveOrganizationId(orgId: string): Promise<boolean> {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        return false;
    }

    // Verify user has access to this org
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
        path: "/"
    });

    return true;
}

/**
 * Clear the active organization cookie
 */
export async function clearActiveOrganization(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(ACTIVE_ORG_COOKIE);
}

/**
 * Verify user has membership in an organization
 */
export async function verifyOrgAccess(userId: string, orgId: string): Promise<boolean> {
    const membership = await db.query.member.findFirst({
        where: (members, { eq, and }) => and(
            eq(members.userId, userId),
            eq(members.organizationId, orgId)
        ),
        columns: { id: true }
    });

    return !!membership;
}

/**
 * Get all organizations the user has access to
 */
export async function getUserOrganizationsWithActive() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        return { organizations: [], activeOrgId: null };
    }

    const memberships = await db.query.member.findMany({
        where: eq(member.userId, session.user.id),
        with: {
            organization: true
        }
    });

    const organizations = memberships
        .filter(m => m.organization)
        .map(m => ({
            id: m.organization!.id,
            name: m.organization!.name,
            slug: m.organization!.slug,
            logo: m.organization!.logo,
            role: m.role
        }));

    const activeOrgId = await getActiveOrganizationId();

    return { organizations, activeOrgId };
}
