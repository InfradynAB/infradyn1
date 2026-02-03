"use server";

import db from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { headers } from "next/headers";

/**
 * Returns the appropriate dashboard route based on user role.
 * - ADMIN -> /dashboard/admin
 * - SUPPLIER -> /dashboard/supplier
 * - Others -> /dashboard
 */
export async function getRoleBasedDashboardRoute(): Promise<string> {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        return "/sign-in";
    }

    const currentUser = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
        columns: { role: true }
    });

    if (!currentUser) {
        return "/dashboard";
    }

    switch (currentUser.role) {
        case "ADMIN":
        case "SUPER_ADMIN":
            return "/dashboard/admin";
        case "SUPPLIER":
            return "/dashboard/supplier";
        default:
            return "/dashboard";
    }
}

/**
 * Get the user's role from the database.
 */
export async function getUserRoleForRedirect(userId: string): Promise<string | null> {
    const currentUser = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { role: true }
    });

    return currentUser?.role || null;
}
