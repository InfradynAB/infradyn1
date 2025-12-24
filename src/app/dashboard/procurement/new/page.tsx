import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import db from "@/db/drizzle";
import { project, supplier } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import POWizard from "@/components/procurement/po-wizard";

async function getFormData() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        redirect("/sign-in");
    }

    // 1. Get the organization IDs the user belongs to
    const memberships = await db.query.member.findMany({
        where: (members, { eq }) => eq(members.userId, session.user.id),
        columns: {
            organizationId: true,
        }
    });

    const organizationIds = memberships.map(m => m.organizationId);

    if (organizationIds.length === 0) {
        return { projects: [], suppliers: [] };
    }

    // 2. Fetch projects and suppliers filtered by those organizations
    const [projects, suppliers] = await Promise.all([
        db.query.project.findMany({
            where: and(
                inArray(project.organizationId, organizationIds),
                eq(project.isDeleted, false)
            ),
            columns: { id: true, name: true, organizationId: true, currency: true },
        }),
        db.query.supplier.findMany({
            where: and(
                inArray(supplier.organizationId, organizationIds),
                eq(supplier.isDeleted, false)
            ),
            columns: { id: true, name: true },
        }),
    ]);

    return { projects, suppliers };
}

export default async function NewPOPage() {
    const { projects, suppliers } = await getFormData();

    return (
        <POWizard
            projects={projects}
            suppliers={suppliers}
        />
    );
}

