import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldWarning } from "@phosphor-icons/react/dist/ssr";
import { RaiseNCRForm } from "./raise-ncr-form";
import { getReceiverPOTracking } from "@/lib/actions/receiver-actions";
import db from "@/db/drizzle";
import { boqItem } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export const metadata = { title: "Raise NCR | Site Receiver" };

export default async function RaiseNCRPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/sign-in");
    if (session.user.role !== "SITE_RECEIVER") redirect("/dashboard");

    // Fetch POs for dropdown
    const pos = await getReceiverPOTracking();
    const poOptions = pos.map((po) => ({
        id: po.id,
        poNumber: po.poNumber,
        supplierName: (po as any).supplier?.name ?? "—",
    }));

    // Fetch BOQ items grouped by PO
    const poIds = pos.map((p) => p.id);
    const boqItemsByPO: Record<string, { id: string; description: string; itemNumber: string }[]> = {};

    if (poIds.length > 0) {
        const items = await db.query.boqItem.findMany({
            where: inArray(boqItem.purchaseOrderId, poIds),
            columns: { id: true, description: true, itemNumber: true, purchaseOrderId: true },
        });

        for (const item of items) {
            if (!boqItemsByPO[item.purchaseOrderId]) boqItemsByPO[item.purchaseOrderId] = [];
            boqItemsByPO[item.purchaseOrderId].push({
                id: item.id,
                description: item.description,
                itemNumber: item.itemNumber,
            });
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-16">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                    <ShieldWarning className="h-5 w-5 text-red-500" weight="fill" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Raise NCR</h1>
                    <p className="text-sm text-muted-foreground">
                        Report a non-conformance for a delivery on your site.
                    </p>
                </div>
            </div>

            {poOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-xl border border-border/60 p-6 text-center">
                    No purchase orders found. You need an active PO to raise an NCR.
                </p>
            ) : (
                <RaiseNCRForm pos={poOptions} boqItemsByPO={boqItemsByPO} />
            )}
        </div>
    );
}
