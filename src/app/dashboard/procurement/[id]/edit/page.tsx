import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import db from "@/db/drizzle";
import { purchaseOrder, project, supplier } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import POWizard from "@/components/procurement/po-wizard";
import { getPurchaseOrder } from "@/lib/actions/procurement";

async function getEditData(id: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        redirect("/sign-in");
    }

    // Fetch PO with all relations
    const poResult = await getPurchaseOrder(id);
    if (!poResult.success || !poResult.data) {
        return null;
    }

    // Fetch projects and suppliers filtered by user's organization
    const [projects, suppliers] = await Promise.all([
        db.query.project.findMany({
            where: and(
                eq(project.organizationId, session.user.organizationId as any),
                eq(project.isDeleted, false)
            ),
            columns: { id: true, name: true, organizationId: true, currency: true },
        }),
        db.query.supplier.findMany({
            where: and(
                eq(supplier.organizationId, session.user.organizationId as any),
                eq(supplier.isDeleted, false)
            ),
            columns: { id: true, name: true },
        }),
    ]);

    return {
        po: poResult.data,
        projects,
        suppliers
    };
}

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditPOPage({ params }: PageProps) {
    const { id } = await params;
    const data = await getEditData(id);

    if (!data) {
        notFound();
    }

    return (
        <POWizard
            mode="edit"
            initialData={{
                ...data.po,
                totalValue: Number(data.po.totalValue),
                retentionPercentage: Number(data.po.retentionPercentage || 0),
                milestones: (data.po as any).milestones || [],
                boqItems: (data.po as any).boqItems || [],
            }}
            projects={data.projects}
            suppliers={data.suppliers}
        />
    );
}
