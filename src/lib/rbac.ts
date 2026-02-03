import { auth } from "../../auth"; // or relative path if needed, but @/auth works usually if baseUrl=./
import { headers } from "next/headers";

// Define Roles and Permissions
export type Role = "SUPER_ADMIN" | "ADMIN" | "PM" | "SUPPLIER" | "QA" | "SITE_RECEIVER";

export const ROLES = {
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "ADMIN",
    PM: "PM",
    SUPPLIER: "SUPPLIER",
    QA: "QA",
    SITE_RECEIVER: "SITE_RECEIVER",
} as const;

/**
 * Role Hierarchy for Delegation:
 * - SUPER_ADMIN can only invite ADMIN (global platform-level)
 * - ADMIN can invite PM, SUPPLIER, QA, SITE_RECEIVER (organization-level)
 * - PM and below cannot invite anyone
 */
const INVITABLE_ROLES: Record<Role, Role[]> = {
    SUPER_ADMIN: ["ADMIN"],
    ADMIN: ["PM", "SUPPLIER", "QA", "SITE_RECEIVER"],
    PM: [],
    SUPPLIER: [],
    QA: [],
    SITE_RECEIVER: [],
};

/**
 * Checks if a user with `inviterRole` is allowed to invite someone to `targetRole`.
 */
export function canInviteRole(inviterRole: Role, targetRole: Role): boolean {
    const allowedRoles = INVITABLE_ROLES[inviterRole] || [];
    return allowedRoles.includes(targetRole);
}

/**
 * Checks if a user has a specific global role.
 */
export function hasRole(user: { role: string }, role: Role): boolean {
    return user.role === role;
}

/**
 * Checks if user is an organization admin (ADMIN role or higher)
 */
export function isOrgAdmin(user: { role: string }): boolean {
    return user.role === "ADMIN" || user.role === "SUPER_ADMIN";
}

/**
 * Checks if user is a super admin (platform-level)
 */
export function isSuperAdmin(user: { role: string }): boolean {
    return user.role === "SUPER_ADMIN";
}

// Extended user type to include custom fields from our schema
type AppUser = {
    id: string;
    email: string;
    name: string;
    role?: Role;
};

/**
 * Server-side helper to get current session and check role.
 */
export async function requireRole(role: Role): Promise<boolean> {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return false;
    }

    // Cast to our extended type that includes role
    const user = session.user as AppUser;
    return user.role === role;
}

/**
 * Server-side helper to get current user's role.
 */
export async function getCurrentUserRole(): Promise<Role | null> {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return null;
    }

    const user = session.user as AppUser;
    return user.role || null;
}
