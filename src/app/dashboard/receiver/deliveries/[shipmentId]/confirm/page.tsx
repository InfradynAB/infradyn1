import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getShipmentForConfirmation } from "@/lib/actions/receiver-actions";
import { ConfirmDeliveryForm } from "./confirm-delivery-form";
import { Card, CardContent } from "@/components/ui/card";
import { Truck } from "@phosphor-icons/react/dist/ssr";

export const metadata = { title: "Confirm Delivery | Site Receiver" };

export default async function ConfirmDeliveryPage({
    params,
}: {
    params: Promise<{ shipmentId: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/sign-in");
    if (session.user.role !== "SITE_RECEIVER") redirect("/dashboard");

    const { shipmentId } = await params;
    const shipment = await getShipmentForConfirmation(shipmentId);

    if (!shipment || !shipment.purchaseOrder) notFound();

    const po = shipment.purchaseOrder;
    const boqItems = (po.boqItems ?? []).map((item: any) => ({
        id: item.id,
        itemNumber: item.itemNumber,
        description: item.description,
        unit: item.unit,
        quantity: String(item.quantity),
        quantityDelivered: String(item.quantityDelivered ?? 0),
    }));

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-16">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <Truck className="h-5 w-5 text-cyan-600" weight="fill" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Confirm Delivery</h1>
                    <p className="text-sm text-muted-foreground">
                        Log quantities received, condition, and any issues.
                    </p>
                </div>
            </div>

            {boqItems.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        No BOQ items found for this shipment. Contact your project manager.
                    </CardContent>
                </Card>
            ) : (
                <ConfirmDeliveryForm
                    shipmentId={shipmentId}
                    poNumber={po.poNumber}
                    supplierName={po.supplier?.name ?? "—"}
                    projectName={po.project?.name ?? "—"}
                    carrier={shipment.carrier}
                    trackingNumber={shipment.trackingNumber}
                    boqItems={boqItems}
                />
            )}
        </div>
    );
}
