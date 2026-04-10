import { NextResponse } from "next/server";
import { ensureActiveOrgForApi } from "@/lib/server/org-access";
import db from "@/db/drizzle";
import { project } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getActiveOrganizationId } from "@/lib/utils/org-context";
import { getActiveProjectId } from "@/lib/utils/project-context";

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

        const orgGate = await ensureActiveOrgForApi(session);
        if (!orgGate.ok) return orgGate.response;


        const activeOrgId = await getActiveOrganizationId();
        const activeProjectId = await getActiveProjectId();

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
            data: {
                projects,
                activeProjectId,
            },
        });
    } catch (error) {
        console.error("Error fetching projects:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch projects" },
            { status: 500 }
        );
    }
}
