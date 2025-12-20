import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import db from "@/db/drizzle";
import { project, supplier } from "@/db/schema";
import { eq } from "drizzle-orm";
import POWizard from "@/components/procurement/po-wizard";

async function getFormData() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        redirect("/sign-in");
    }

    // Fetch projects (with orgId and currency) and suppliers for dropdowns
    const [projects, suppliers] = await Promise.all([
        db.query.project.findMany({
            where: eq(project.isDeleted, false),
            columns: { id: true, name: true, organizationId: true, currency: true },
        }),
        db.query.supplier.findMany({
            where: eq(supplier.isDeleted, false),
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

