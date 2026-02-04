"use server";

import db from "../../../db/drizzle";
import { project, member, user } from "../../../db/schema";
import { auth } from "../../../auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createProjectSchema, updateProjectSchema } from "../schemas/project";
import { eq, and, inArray, like, desc } from "drizzle-orm";
import { getActiveOrganizationId } from "@/lib/utils/org-context";

/**
 * Generate a unique project code in format PRJ-YYYY-XXX
 * Where YYYY is current year and XXX is a sequential number
 */
async function generateProjectCode(organizationId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `PRJ-${currentYear}-`;

    // Find the highest sequence number for this org and year
    const existingProjects = await db.query.project.findMany({
        where: and(
            eq(project.organizationId, organizationId),
            like(project.code, `${prefix}%`)
        ),
        orderBy: [desc(project.code)],
        limit: 1,
    });

    let nextSeq = 1;
    if (existingProjects.length > 0 && existingProjects[0].code) {
        const lastCode = existingProjects[0].code;
        const lastSeq = parseInt(lastCode.replace(prefix, ""), 10);
        if (!isNaN(lastSeq)) {
            nextSeq = lastSeq + 1;
        }
    }

    // Pad to 3 digits (001, 002, etc.)
    return `${prefix}${nextSeq.toString().padStart(3, "0")}`;
}

export async function createProject(formData: FormData) {
    // 1. Get Session
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    // 2. Check if user is ADMIN - only ADMINs can create projects
    const currentUser = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
        columns: { role: true }
    });

    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN")) {
        return { error: "Permission Denied: Only organization administrators can create projects." };
    }

    // 3. Parse Input
    const rawData = {
        name: formData.get("name"),
        code: formData.get("code"),
        organizationId: formData.get("organizationId"),
        budget: formData.get("budget"),
        location: formData.get("location"),
        currency: formData.get("currency"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
    };

    const validatedFields = createProjectSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            error: "Validation failed.",
            details: validatedFields.error.flatten().fieldErrors
        };
    }

    const { name, organizationId, budget, location, currency, startDate, endDate, materialCategories: categoriesJson } = validatedFields.data;

    // 4. Verify Membership (Security check)
    // User must be a member of the organization to create a project there
    const membership = await db.query.member.findFirst({
        where: and(
            eq(member.userId, session.user.id),
            eq(member.organizationId, organizationId)
        )
    });

    if (!membership) {
        return { error: "You do not have permission to create projects in this organization." };
    }

    let materialCategories: string[] = [];
    if (categoriesJson) {
        try {
            materialCategories = JSON.parse(categoriesJson);
        } catch (e) {
            console.error("Failed to parse material categories", e);
        }
    }

    // Generate unique project code
    const generatedCode = await generateProjectCode(organizationId);

    try {
        // 4. Create Project
        const [newProject] = await db.insert(project).values({
            name,
            code: generatedCode, // Use auto-generated code
            organizationId,
            budget: budget ? budget.toString() : null,
            location: location || null,
            currency: currency || "USD",
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            materialCategories: materialCategories,
        }).returning();

        // 5. Revalidate
        revalidatePath("/dashboard/projects");
        revalidatePath("/dashboard/org"); // Maybe list updates

        return { success: true, projectId: newProject.id, projectCode: generatedCode };
    } catch (error) {
        console.error("Failed to create project:", error);
        return { error: "Failed to create project." };
    }
}

export async function getUserProjects() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return [];
    }

    // Get active organization ID (from cookie or default)
    const activeOrgId = await getActiveOrganizationId();

    if (activeOrgId) {
        // Fetch projects only for the active organization
        const projects = await db.query.project.findMany({
            where: eq(project.organizationId, activeOrgId),
            with: {
                organization: true
            }
        });
        return projects;
    }

    // Fallback: Fetch projects for ALL organizations the user is a member of
    const memberships = await db.query.member.findMany({
        where: eq(member.userId, session.user.id),
        columns: {
            organizationId: true,
        }
    });

    const organizationIds = memberships.map(m => m.organizationId);

    if (organizationIds.length === 0) {
        return [];
    }

    const projects = await db.query.project.findMany({
        where: inArray(project.organizationId, organizationIds),
        with: {
            organization: true
        }
    });

    return projects;
}

/**
 * Get a single project by ID with full details
 */
export async function getProjectById(projectId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return null;
    }

    const projectData = await db.query.project.findFirst({
        where: eq(project.id, projectId),
        with: {
            organization: true,
        }
    });

    if (!projectData) {
        return null;
    }

    // Verify user has access (is member of the organization)
    const membership = await db.query.member.findFirst({
        where: and(
            eq(member.userId, session.user.id),
            eq(member.organizationId, projectData.organizationId)
        )
    });

    if (!membership) {
        return null; // User doesn't have access
    }

    return projectData;
}

/**
 * Update an existing project
 */
export async function updateProject(projectId: string, formData: FormData) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { error: "Unauthorized" };
    }

    // Get the project first
    const existingProject = await db.query.project.findFirst({
        where: eq(project.id, projectId),
    });

    if (!existingProject) {
        return { error: "Project not found" };
    }

    // Verify membership
    const membership = await db.query.member.findFirst({
        where: and(
            eq(member.userId, session.user.id),
            eq(member.organizationId, existingProject.organizationId)
        )
    });

    if (!membership) {
        return { error: "You do not have permission to edit this project" };
    }

    const rawData = {
        name: formData.get("name"),
        budget: formData.get("budget"),
        location: formData.get("location"),
        currency: formData.get("currency"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
    };

    const validatedFields = updateProjectSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            error: "Validation failed.",
            details: validatedFields.error.flatten().fieldErrors
        };
    }

    const { name, budget, location, currency, startDate, endDate } = validatedFields.data;

    try {
        const [updated] = await db.update(project)
            .set({
                name,
                budget: budget ? budget.toString() : null,
                location: location || null,
                currency: currency || "USD",
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                updatedAt: new Date(),
            })
            .where(eq(project.id, projectId))
            .returning();

        revalidatePath("/dashboard/projects");
        revalidatePath(`/dashboard/projects/${projectId}`);

        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to update project:", error);
        return { error: "Failed to update project" };
    }
}

/**
 * Delete a project (soft delete by setting isDeleted = true)
 */
export async function deleteProject(projectId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { error: "Unauthorized" };
    }

    const existingProject = await db.query.project.findFirst({
        where: eq(project.id, projectId),
    });

    if (!existingProject) {
        return { error: "Project not found" };
    }

    // Verify membership (ideally check for admin/owner role)
    const membership = await db.query.member.findFirst({
        where: and(
            eq(member.userId, session.user.id),
            eq(member.organizationId, existingProject.organizationId)
        )
    });

    if (!membership) {
        return { error: "You do not have permission to delete this project" };
    }

    try {
        // Soft delete - set isDeleted flag
        await db.update(project)
            .set({
                isDeleted: true,
                updatedAt: new Date(),
            })
            .where(eq(project.id, projectId));

        revalidatePath("/dashboard/projects");

        return { success: true };
    } catch (error) {
        console.error("Failed to delete project:", error);
        return { error: "Failed to delete project" };
    }
}
