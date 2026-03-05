import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Truck,
    Package,
    CheckCircle,
    Clock,
    ArrowRight,
    MapPin,
    CalendarBlank,
} from "@phosphor-icons/react/dist/ssr";
import { getIncomingShipments, getMyDeliveries } from "@/lib/actions/receiver-actions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const metadata = { title: "Deliveries | Site Receiver" };

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "Pending", cls: "bg-muted text-muted-foreground border-border" },
    DISPATCHED: { label: "Dispatched", cls: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
    IN_TRANSIT: { label: "In Transit", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    OUT_FOR_DELIVERY: { label: "Out for Delivery", cls: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
    DELIVERED: { label: "Delivered", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    PARTIALLY_DELIVERED: { label: "Partial", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    FAILED: { label: "Failed", cls: "bg-red-500/10 text-red-600 border-red-500/20" },
};

function MetricTile({
    label,
    value,
    helper,
    icon,
}: {
    label: string;
    value: number;
    helper: string;
    icon: React.ReactNode;
}) {
    return (
        <Card className="border-border/70 bg-card/60">
            <CardContent className="flex items-start justify-between p-4">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {label}
                    </p>
                    <p className="mt-1 text-2xl font-bold leading-none tabular-nums">{value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-muted/40">
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}

function ShipmentCard({ ship, showConfirm = true }: { ship: any; showConfirm?: boolean }) {
    const statusInfo = STATUS_MAP[ship.status ?? ""] ?? { label: ship.status ?? "Unknown", cls: "bg-muted text-muted-foreground border-border" };

    return (
        <div className="flex h-full flex-col gap-3 rounded-xl border border-border/70 p-4 transition-all hover:border-border hover:shadow-sm">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 border border-border/80">
                    <Truck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">
                            {ship.purchaseOrder?.poNumber ?? "—"}
                        </p>
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusInfo.cls)}>
                            {statusInfo.label}
                        </span>
                        {ship.isException && (
                            <span className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                                Exception
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {ship.purchaseOrder?.supplier?.name ?? "Unknown supplier"}
                        {ship.carrier ? ` · ${ship.carrier}` : ""}
                        {ship.trackingNumber ? ` · ${ship.trackingNumber}` : ""}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {ship.logisticsEta && (
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>ETA: {format(new Date(ship.logisticsEta), "dd MMM yyyy")}</span>
                    </div>
                )}
                {ship.destination && (
                    <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{ship.destination}</span>
                    </div>
                )}
                {ship.purchaseOrder?.project?.name && (
                    <div className="flex items-center gap-1.5 col-span-2">
                        <Package className="h-3.5 w-3.5 shrink-0" />
                        <span>Project: {ship.purchaseOrder.project.name}</span>
                    </div>
                )}
            </div>

            {showConfirm && (
                <Button asChild size="sm" className="bg-cyan-600 hover:bg-cyan-700 self-start">
                    <Link href={`/dashboard/receiver/deliveries/${ship.id}/confirm`}>
                        Confirm Delivery <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Link>
                </Button>
            )}
        </div>
    );
}

function ConfirmedDeliveryRow({ del }: { del: any }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border/70 p-4 transition-colors hover:bg-muted/30">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 border border-border/80">
                <CheckCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-semibold">{del.purchaseOrder?.poNumber ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                    {del.purchaseOrder?.supplier?.name ?? "—"} · {del.purchaseOrder?.project?.name ?? "—"}
                    {del.isPartial ? " · Partial delivery" : ""}
                </p>
            </div>
            <div className="text-right shrink-0 space-y-0.5">
                <p className="text-xs text-muted-foreground">
                    {del.receivedDate
                        ? format(new Date(del.receivedDate), "dd MMM yyyy")
                        : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                    {del.items?.length ?? 0} item{del.items?.length !== 1 ? "s" : ""}
                </p>
            </div>
        </div>
    );
}

export default async function ReceiverDeliveriesPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/sign-in");
    if (session.user.role !== "SITE_RECEIVER") redirect("/dashboard");

    const params = await searchParams;
    const tab = params.tab ?? "incoming";

    const [incoming, confirmed] = await Promise.all([
        getIncomingShipments(),
        getMyDeliveries(),
    ]);

    const awaitingConfirmation = incoming.filter(
        s => s.status !== "DELIVERED"
    );
    const alreadyDelivered = incoming.filter(s => s.status === "DELIVERED");
    const exceptionCount = incoming.filter(s => s.isException).length;

    return (
        <div className="w-full space-y-6 pb-16">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Deliveries</h1>
                    <p className="text-sm text-muted-foreground">
                        Confirm arrivals, upload delivery notes and photos.
                    </p>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <MetricTile
                    label="Awaiting"
                    value={awaitingConfirmation.length}
                    helper={awaitingConfirmation.length > 0 ? "Needs your confirmation" : "No pending arrivals"}
                    icon={<Truck className="h-5 w-5" />}
                />
                <MetricTile
                    label="Confirmed"
                    value={confirmed.length}
                    helper="Signed off by you"
                    icon={<CheckCircle className="h-5 w-5" />}
                />
                <MetricTile
                    label="System Delivered"
                    value={alreadyDelivered.length}
                    helper="Marked delivered in logistics"
                    icon={<Package className="h-5 w-5" />}
                />
                <MetricTile
                    label="Exceptions"
                    value={exceptionCount}
                    helper={exceptionCount > 0 ? "Review exception shipments" : "No current exceptions"}
                    icon={<CalendarBlank className="h-5 w-5" />}
                />
            </div>

            <Tabs defaultValue={tab}>
                <TabsList className="h-9">
                    <TabsTrigger value="incoming" asChild>
                        <Link href="/dashboard/receiver/deliveries?tab=incoming" replace>
                            Incoming
                            {awaitingConfirmation.length > 0 && (
                                <Badge variant="destructive" className="ml-1.5 h-4.5 min-w-4.5 px-1.5 text-[10px]">
                                    {awaitingConfirmation.length}
                                </Badge>
                            )}
                        </Link>
                    </TabsTrigger>
                    <TabsTrigger value="confirmed" asChild>
                        <Link href="/dashboard/receiver/deliveries?tab=confirmed" replace>
                            Confirmed ({confirmed.length})
                        </Link>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="incoming" className="mt-6">
                    {awaitingConfirmation.length === 0 && alreadyDelivered.length === 0 ? (
                        <Card className="border-dashed border-border/80">
                            <CardContent className="flex min-h-[380px] flex-col items-center justify-center px-6 py-16 text-center">
                                <Truck className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                <p className="font-medium text-muted-foreground">No incoming shipments</p>
                                <p className="text-sm text-muted-foreground/70 mt-1">
                                    Shipments dispatched to your site will appear here.
                                </p>
                                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/dashboard/receiver/pos">View PO Tracking</Link>
                                    </Button>
                                    <Button asChild size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                                        <Link href="/dashboard/receiver/ncr/new">Raise NCR</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 2xl:grid-cols-[minmax(0,2.5fr)_minmax(300px,1fr)]">
                            <div className="space-y-4">
                                {awaitingConfirmation.length > 0 && (
                                    <div className="space-y-3">
                                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                            Awaiting Confirmation
                                        </h2>
                                        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                                            {awaitingConfirmation.map(ship => (
                                                <ShipmentCard key={ship.id} ship={ship} showConfirm />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {alreadyDelivered.length > 0 && (
                                    <div className="space-y-3">
                                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                            Marked Delivered (system)
                                        </h2>
                                        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                                            {alreadyDelivered.map(ship => (
                                                <ShipmentCard key={ship.id} ship={ship} showConfirm={false} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Card className="h-fit border-border/70 bg-card/60 2xl:sticky 2xl:top-20">
                                <CardContent className="p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                        Daily Overview
                                    </p>
                                    <div className="mt-3 space-y-2 text-sm">
                                        <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                                            <span className="text-muted-foreground">Awaiting confirmation</span>
                                            <span className="font-semibold tabular-nums">{awaitingConfirmation.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                                            <span className="text-muted-foreground">Exceptions</span>
                                            <span className="font-semibold tabular-nums">{exceptionCount}</span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                                            <span className="text-muted-foreground">Confirmed by you</span>
                                            <span className="font-semibold tabular-nums">{confirmed.length}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid gap-2">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href="/dashboard/receiver/pos">Open PO Tracking</Link>
                                        </Button>
                                        <Button asChild size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                                            <Link href="/dashboard/receiver/ncr/new">Raise NCR</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="confirmed" className="mt-6">
                    {confirmed.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <CheckCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                <p className="font-medium text-muted-foreground">No confirmed deliveries yet</p>
                                <p className="text-sm text-muted-foreground/70 mt-1">
                                    Deliveries you confirm will appear here.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-3 xl:grid-cols-2">
                            {confirmed.map(del => (
                                <ConfirmedDeliveryRow key={del.id} del={del} />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
