"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { project, member } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const ACTIVE_PROJECT_COOKIE = "active_project_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Special value for "All Projects" (not exported - use null for All Projects from client)
const ALL_PROJECTS = "ALL";

/**
 * Get the active project ID from cookie
 * Returns null if "All Projects" is selected or no project is set
 */
export async function getActiveProjectId(): Promise<string | null> {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value;

    if (!cookieValue || cookieValue === ALL_PROJECTS) {
        return null; // All Projects
    }

    // Verify project still exists and user has access
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        return null;
    }

    // Check if project exists
    const projectExists = await db.query.project.findFirst({
        where: and(
            eq(project.id, cookieValue),
            eq(project.isDeleted, false)
        ),
        columns: { id: true, organizationId: true }
    });

    if (!projectExists) {
        // Project doesn't exist, clear cookie
        cookieStore.delete(ACTIVE_PROJECT_COOKIE);
        return null;
    }

    // Verify user has access to this project's organization
    const hasMembership = await db.query.member.findFirst({
        where: and(
            eq(member.userId, session.user.id),
            eq(member.organizationId, projectExists.organizationId)
        ),
        columns: { id: true }
    });

    if (!hasMembership) {
        cookieStore.delete(ACTIVE_PROJECT_COOKIE);
        return null;
    }

    return cookieValue;
}

/**
 * Set the active project in cookie
 * Pass null or ALL_PROJECTS to select "All Projects"
 */
export async function setActiveProjectId(projectId: string | null): Promise<boolean> {
    try {
        const cookieStore = await cookies();

        if (!projectId || projectId === ALL_PROJECTS) {
            // Set to ALL_PROJECTS
            cookieStore.set(ACTIVE_PROJECT_COOKIE, ALL_PROJECTS, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: COOKIE_MAX_AGE,
                path: "/"
            });
            return true;
        }

        // Verify project exists
        const projectData = await db.query.project.findFirst({
            where: and(
                eq(project.id, projectId),
                eq(project.isDeleted, false)
            ),
            columns: { id: true }
        });

        if (!projectData) {
            return false;
        }

        cookieStore.set(ACTIVE_PROJECT_COOKIE, projectId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: COOKIE_MAX_AGE,
            path: "/"
        });

        return true;
    } catch (error) {
        console.error("[setActiveProjectId] Error:", error);
        return false;
    }
}

/**
 * Clear the active project cookie (resets to All Projects)
 */
export async function clearActiveProject(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(ACTIVE_PROJECT_COOKIE);
}

/**
 * Get all projects for the current organization with active project info
 */
export async function getProjectsWithActive(organizationId: string) {
    const projects = await db.query.project.findMany({
        where: and(
            eq(project.organizationId, organizationId),
            eq(project.isDeleted, false)
        ),
        columns: {
            id: true,
            name: true,
            code: true,
        },
        orderBy: (project, { desc }) => [desc(project.createdAt)]
    });

    const activeProjectId = await getActiveProjectId();

    return {
        projects,
        activeProjectId, // null means "All Projects"
    };
}
