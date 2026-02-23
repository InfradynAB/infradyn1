import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    FileText,
    Truck,
    CheckCircle,
    Clock,
    Package,
} from "@phosphor-icons/react/dist/ssr";
import { getReceiverPOTracking } from "@/lib/actions/receiver-actions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const metadata = { title: "PO Tracking | Site Receiver" };

const PO_STATUS_MAP: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "Draft", cls: "bg-muted text-muted-foreground border-border" },
    ISSUED: { label: "Issued", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    PENDING_RESPONSE: { label: "Pending", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    ACCEPTED: { label: "Accepted", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    IN_PROGRESS: { label: "In Progress", cls: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
    COMPLETED: { label: "Completed", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
    CANCELLED: { label: "Cancelled", cls: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const SHIPMENT_STATUS_MAP: Record<string, { icon: React.ElementType; cls: string; label: string }> = {
    PENDING: { icon: Clock, cls: "text-muted-foreground", label: "Pending" },
    DISPATCHED: { icon: Truck, cls: "text-indigo-500", label: "Dispatched" },
    IN_TRANSIT: { icon: Truck, cls: "text-blue-500", label: "In Transit" },
    OUT_FOR_DELIVERY: { icon: Truck, cls: "text-cyan-500", label: "Out for Delivery" },
    DELIVERED: { icon: CheckCircle, cls: "text-emerald-500", label: "Delivered" },
    PARTIALLY_DELIVERED: { icon: Package, cls: "text-amber-500", label: "Partial" },
    FAILED: { icon: Clock, cls: "text-red-500", label: "Failed" },
};

export default async function ReceiverPOTrackingPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/sign-in");
    if (session.user.role !== "SITE_RECEIVER") redirect("/dashboard");

    const pos = await getReceiverPOTracking();

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-16">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">PO Tracking</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Read-only view of all active purchase orders and their delivery status.
                </p>
            </div>

            {pos.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p className="font-medium text-muted-foreground">No purchase orders found</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {pos.map((po) => {
                        const statusInfo = PO_STATUS_MAP[po.status] ?? { label: po.status, cls: "bg-muted text-muted-foreground border-border" };
                        const progress = Math.round(Number(po.progressPercentage) || 0);
                        const shipments = (po as any).shipments ?? [];

                        return (
                            <Card key={po.id} className="border-border/70">
                                <CardContent className="py-4 space-y-3">
                                    {/* Header */}
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold">{po.poNumber}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {(po as any).supplier?.name ?? "—"} · {(po as any).project?.name ?? "—"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusInfo.cls)}>
                                                {statusInfo.label}
                                            </span>
                                            {po.incoterms && (
                                                <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground">
                                                    {po.incoterms}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Delivery Progress</span>
                                            <span className="font-semibold tabular-nums">{progress}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all", progress >= 100 ? "bg-emerald-500" : progress >= 50 ? "bg-blue-500" : "bg-amber-500")}
                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Shipments */}
                                    {shipments.length > 0 && (
                                        <div className="space-y-1.5">
                                            {shipments.slice(0, 3).map((ship: any) => {
                                                const sInfo = SHIPMENT_STATUS_MAP[ship.status] ?? { icon: Truck, cls: "text-muted-foreground", label: ship.status };
                                                const Icon = sInfo.icon;
                                                return (
                                                    <div key={ship.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Icon className={cn("h-3.5 w-3.5 shrink-0", sInfo.cls)} />
                                                        <span className={cn("font-medium", sInfo.cls)}>{sInfo.label}</span>
                                                        {ship.logisticsEta && (
                                                            <span>· ETA {format(new Date(ship.logisticsEta), "dd MMM")}</span>
                                                        )}
                                                        {ship.actualDeliveryDate && (
                                                            <span>· Delivered {format(new Date(ship.actualDeliveryDate), "dd MMM")}</span>
                                                        )}
                                                        {ship.carrier && <span>· {ship.carrier}</span>}
                                                    </div>
                                                );
                                            })}
                                            {shipments.length > 3 && (
                                                <p className="text-[10px] text-muted-foreground/70">+{shipments.length - 3} more shipment{shipments.length - 3 !== 1 ? "s" : ""}</p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
