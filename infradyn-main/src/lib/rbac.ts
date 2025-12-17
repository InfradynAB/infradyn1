import { auth } from "../../auth"; // or relative path if needed, but @/auth works usually if baseUrl=./
import { headers } from "next/headers";

// Define Roles and Permissions
export type Role = "ADMIN" | "PM" | "SUPPLIER" | "QA" | "SITE_RECEIVER";

export const ROLES = {
    ADMIN: "ADMIN",
    PM: "PM",
    SUPPLIER: "SUPPLIER",
    QA: "QA",
    SITE_RECEIVER: "SITE_RECEIVER",
} as const;

/**
 * Checks if a user has a specific global role.
 */
export function hasRole(user: { role: string }, role: Role): boolean {
    return user.role === role;
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

// TODO: Organization-level permission checks (using member table)
// This will likely require db queries, so keep it separate or pass membership data.
