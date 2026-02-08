import { NextResponse } from "next/server";
import db from "@/db/drizzle";
import { project } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getActiveOrganizationId } from "@/lib/utils/org-context";

/**
 * GET /api/projects/list
 * Returns a list of projects for the current organization
 */
export async function GET() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const activeOrgId = await getActiveOrganizationId();

        if (!activeOrgId) {
            return NextResponse.json({ 
                success: true, 
                data: { projects: [] } 
            });
        }

        const projects = await db
            .select({
                id: project.id,
                name: project.name,
            })
            .from(project)
            .where(eq(project.organizationId, activeOrgId));

        return NextResponse.json({
            success: true,
            data: { projects },
        });
    } catch (error) {
        console.error("Error fetching projects:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch projects" },
            { status: 500 }
        );
    }
}
