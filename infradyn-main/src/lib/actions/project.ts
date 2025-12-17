"use server";

import db from "../../../db/drizzle";
import { project, member } from "../../../db/schema";
import { auth } from "../../../auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createProjectSchema } from "../schemas/project";
import { eq, and } from "drizzle-orm";

export async function createProject(formData: FormData) {
    // 1. Get Session
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    // 2. Parse Input
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

    const { name, code, organizationId, budget, location, currency, startDate, endDate, materialCategories: categoriesJson } = validatedFields.data;

    // 3. Verify Membership (Security check)
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
    // Ideally check if role is 'admin' or 'pm', but simple membership check for now for MVP

    let materialCategories: string[] = [];
    if (categoriesJson) {
        try {
            materialCategories = JSON.parse(categoriesJson);
        } catch (e) {
            console.error("Failed to parse material categories", e);
        }
    }

    try {
        // 4. Create Project
        const [newProject] = await db.insert(project).values({
            name,
            code,
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
    } catch (error) {
        console.error("Failed to create project:", error);
        return { error: "Failed to create project." };
    }

    // redirect("/dashboard/projects"); // Removing redirect to keep user on list page with modal
    return { success: true };
}

export async function getUserProjects() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return [];
    }

    // Fetch projects for organizations the user is a member of.
    // Logic: User -> Memberships -> Organization IDs -> Projects
    // We can use a join query or two steps.
    // Drizzle query builder is best:

    // First get the organization IDs the user belongs to
    const memberships = await db.query.member.findMany({
        where: (members, { eq }) => eq(members.userId, session.user.id),
        columns: {
            organizationId: true,
        }
    });

    const organizationIds = memberships.map(m => m.organizationId);

    if (organizationIds.length === 0) {
        return [];
    }

    // Then find projects in those organizations
    const projects = await db.query.project.findMany({
        where: (projects, { inArray }) => inArray(projects.organizationId, organizationIds),
        with: {
            organization: true // Include org details for display
        }
    });

    return projects;
}
