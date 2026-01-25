import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import db from "@/db/drizzle";
import { project, organization, member } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateProjectSchema } from "@/lib/schemas/project";
import { headers } from "next/headers";

// GET /api/projects/[id] - Get project by ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Get project with organization
        const projectData = await db
            .select({
                id: project.id,
                name: project.name,
                code: project.code,
                budget: project.budget,
                location: project.location,
                currency: project.currency,
                startDate: project.startDate,
                endDate: project.endDate,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                organization: {
                    id: organization.id,
                    name: organization.name,
                },
            })
            .from(project)
            .innerJoin(organization, eq(project.organizationId, organization.id))
            .where(and(eq(project.id, id), eq(project.isDeleted, false)))
            .limit(1);

        if (projectData.length === 0) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Check user has access to this organization
        const membership = await db
            .select({ id: member.id })
            .from(member)
            .where(
                and(
                    eq(member.userId, session.user.id),
                    eq(member.organizationId, projectData[0].organization.id)
                )
            )
            .limit(1);

        if (membership.length === 0) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        return NextResponse.json(projectData[0]);
    } catch (error) {
        console.error("Error fetching project:", error);
        return NextResponse.json(
            { error: "Failed to fetch project" },
            { status: 500 }
        );
    }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const formData = await request.formData();

        // Get project to check access
        const existingProject = await db
            .select({
                id: project.id,
                organizationId: project.organizationId,
            })
            .from(project)
            .where(and(eq(project.id, id), eq(project.isDeleted, false)))
            .limit(1);

        if (existingProject.length === 0) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Check user has admin/owner access
        const membership = await db
            .select({ role: member.role })
            .from(member)
            .where(
                and(
                    eq(member.userId, session.user.id),
                    eq(member.organizationId, existingProject[0].organizationId)
                )
            )
            .limit(1);

        if (membership.length === 0) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (!["admin", "owner"].includes(membership[0].role)) {
            return NextResponse.json(
                { error: "Only admins can update projects" },
                { status: 403 }
            );
        }

        // Parse and validate form data
        const data = {
            name: formData.get("name") as string,
            budget: formData.get("budget") as string | null,
            location: formData.get("location") as string | null,
            currency: formData.get("currency") as string | null,
            startDate: formData.get("startDate") as string | null,
            endDate: formData.get("endDate") as string | null,
        };

        const validated = updateProjectSchema.safeParse(data);
        if (!validated.success) {
            return NextResponse.json(
                { error: "Invalid data", details: validated.error.flatten() },
                { status: 400 }
            );
        }

        // Update project
        const updateData: Record<string, unknown> = {
            name: validated.data.name,
            updatedAt: new Date(),
        };

        if (validated.data.budget !== undefined) {
            updateData.budget = validated.data.budget || null;
        }
        if (validated.data.location !== undefined) {
            updateData.location = validated.data.location || null;
        }
        if (validated.data.currency !== undefined) {
            updateData.currency = validated.data.currency || null;
        }
        if (validated.data.startDate !== undefined) {
            updateData.startDate = validated.data.startDate
                ? new Date(validated.data.startDate)
                : null;
        }
        if (validated.data.endDate !== undefined) {
            updateData.endDate = validated.data.endDate
                ? new Date(validated.data.endDate)
                : null;
        }

        await db.update(project).set(updateData).where(eq(project.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating project:", error);
        return NextResponse.json(
            { error: "Failed to update project" },
            { status: 500 }
        );
    }
}

// DELETE /api/projects/[id] - Soft delete project
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Get project to check access
        const existingProject = await db
            .select({
                id: project.id,
                organizationId: project.organizationId,
                name: project.name,
            })
            .from(project)
            .where(and(eq(project.id, id), eq(project.isDeleted, false)))
            .limit(1);

        if (existingProject.length === 0) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Check user has owner access (only owners can delete)
        const membership = await db
            .select({ role: member.role })
            .from(member)
            .where(
                and(
                    eq(member.userId, session.user.id),
                    eq(member.organizationId, existingProject[0].organizationId)
                )
            )
            .limit(1);

        if (membership.length === 0) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (!["owner", "admin"].includes(membership[0].role)) {
            return NextResponse.json(
                { error: "Only owners and admins can delete projects" },
                { status: 403 }
            );
        }

        // Soft delete project
        await db
            .update(project)
            .set({ isDeleted: true, updatedAt: new Date() })
            .where(eq(project.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting project:", error);
        return NextResponse.json(
            { error: "Failed to delete project" },
            { status: 500 }
        );
    }
}
