"use server";

import { cookies } from "next/headers";
import db from "@/db/drizzle";
import { project, purchaseOrder } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

const SUPPLIER_PROJECT_COOKIE = "supplier_active_project_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const ALL_PROJECTS = "ALL";

/**
 * Get the active supplier project ID from cookie
 * Returns null if "All Projects" is selected or no project is set
 */
export async function getSupplierActiveProjectId(): Promise<string | null> {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(SUPPLIER_PROJECT_COOKIE)?.value;

    if (!cookieValue || cookieValue === ALL_PROJECTS) {
        return null; // All Projects
    }

    return cookieValue;
}

/**
 * Set the active supplier project in cookie
 * Pass null to select "All Projects"
 */
export async function setSupplierActiveProjectId(projectId: string | null): Promise<boolean> {
    try {
        const cookieStore = await cookies();

        if (!projectId || projectId === ALL_PROJECTS) {
            cookieStore.set(SUPPLIER_PROJECT_COOKIE, ALL_PROJECTS, {
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

        cookieStore.set(SUPPLIER_PROJECT_COOKIE, projectId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: COOKIE_MAX_AGE,
            path: "/"
        });

        return true;
    } catch (error) {
        console.error("[setSupplierActiveProjectId] Error:", error);
        return false;
    }
}

/**
 * Get all projects a supplier is assigned to (via POs)
 * Optionally filter by organization
 */
export async function getSupplierProjects(supplierId: string, organizationId?: string | null) {
    // Get all unique project IDs from supplier's POs
    // If organizationId is provided, only get POs from that org
    const supplierPOs = await db.query.purchaseOrder.findMany({
        where: organizationId
            ? and(
                eq(purchaseOrder.supplierId, supplierId),
                eq(purchaseOrder.organizationId, organizationId)
            )
            : eq(purchaseOrder.supplierId, supplierId),
        columns: { projectId: true },
    });

    const uniqueProjectIds = [...new Set(supplierPOs.map(po => po.projectId))];

    if (uniqueProjectIds.length === 0) {
        return [];
    }

    // Fetch project details
    const projects = await db.query.project.findMany({
        where: and(
            inArray(project.id, uniqueProjectIds),
            eq(project.isDeleted, false)
        ),
        columns: {
            id: true,
            name: true,
            code: true,
        },
        orderBy: (project, { asc }) => [asc(project.name)]
    });

    return projects;
}
