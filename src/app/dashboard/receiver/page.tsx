import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Truck,
    Package,
    Warning,
    CheckCircle,
    Clock,
    ArrowRight,
    HardHat,
    FileText,
    ShieldWarning,
} from "@phosphor-icons/react/dist/ssr";
import { getReceiverDashboardSummary } from "@/lib/actions/receiver-actions";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const metadata = { title: "Site Receiver — Dashboard | InfraDyn" };

// ─── local helpers ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string | null }) {
    const map: Record<string, string> = {
        OPEN: "bg-red-500/10 text-red-500 border-red-500/20",
        CLOSED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        REINSPECTION: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        REVIEW: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        REMEDIATION: "bg-orange-500/10 text-orange-600 border-orange-500/20",
        SUPPLIER_RESPONDED: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        DELIVERED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        IN_TRANSIT: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        OUT_FOR_DELIVERY: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
        DISPATCHED: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    };
    return (
        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize", map[status ?? ""] ?? "bg-muted text-muted-foreground border-border")}>
            {(status ?? "Unknown").replace(/_/g, " ")}
        </span>
    );
}

function StatCard({
    href,
    count,
    label,
    sublabel,
    icon,
    color,
    urgent = false,
}: {
    href: string;
    count: number;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    color: "red" | "amber" | "blue" | "emerald";
    urgent?: boolean;
}) {
    const colors = {
        red: "border-red-200 bg-red-50/60 dark:bg-red-950/20 dark:border-red-900/30",
        amber: "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/30",
        blue: "border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900/30",
        emerald: "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900/30",
    };
    const iconColors = {
        red: "text-red-500",
        amber: "text-amber-500",
        blue: "text-blue-500",
        emerald: "text-emerald-500",
    };
    return (
        <Link href={href}>
            <Card className={cn("relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer border", urgent && count > 0 ? colors[color] : "")}>
                <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <p className="text-3xl font-bold tabular-nums leading-none">{count}</p>
                            <p className="text-sm font-semibold text-foreground">{label}</p>
                            <p className="text-xs text-muted-foreground">{sublabel}</p>
                        </div>
                        <div className={cn("rounded-xl bg-muted/40 p-2.5", iconColors[color])}>
                            {icon}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default async function ReceiverDashboardPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) redirect("/sign-in");
    if (session.user.role !== "SITE_RECEIVER") redirect("/dashboard");

    const summary = await getReceiverDashboardSummary();
    const { counts, recentDeliveries, pendingShipments, myNcrs } = summary;

    const today = new Date();
    const greeting =
        today.getHours() < 12
            ? "Good morning"
            : today.getHours() < 17
            ? "Good afternoon"
            : "Good evening";

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-16">
            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                            <HardHat className="h-5 w-5 text-cyan-600" weight="fill" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {greeting}, {session.user.name?.split(" ")[0] ?? "Receiver"}
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-lg">
                        {counts.pending === 0 && counts.openNcrs === 0
                            ? "No pending shipments or open NCRs. All caught up."
                            : `${counts.pending} shipment${counts.pending !== 1 ? "s" : ""} awaiting confirmation · ${counts.openNcrs} open NCR${counts.openNcrs !== 1 ? "s" : ""}.`}
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/receiver/deliveries">
                            <Truck className="mr-2 h-4 w-4" />
                            Deliveries
                        </Link>
                    </Button>
                    <Button asChild size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                        <Link href="/dashboard/receiver/ncr/new">
                            <ShieldWarning className="mr-2 h-4 w-4" />
                            Raise NCR
                        </Link>
                    </Button>
                </div>
            </div>

            {/* ── STATS ROW ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    href="/dashboard/receiver/deliveries"
                    count={counts.pending}
                    label="Pending Arrivals"
                    sublabel={counts.pending > 0 ? "Confirm when received →" : "Nothing in transit"}
                    icon={<Truck className="h-5 w-5" />}
                    color="blue"
                    urgent={counts.pending > 0}
                />
                <StatCard
                    href="/dashboard/receiver/deliveries?tab=confirmed"
                    count={counts.totalConfirmed}
                    label="Confirmed"
                    sublabel="Deliveries you signed off"
                    icon={<CheckCircle className="h-5 w-5" />}
                    color="emerald"
                />
                <StatCard
                    href="/dashboard/receiver/ncr"
                    count={counts.openNcrs}
                    label="Open NCRs"
                    sublabel={counts.openNcrs > 0 ? "Review & update →" : "All resolved"}
                    icon={<Warning className="h-5 w-5" weight="fill" />}
                    color="red"
                    urgent={counts.openNcrs > 0}
                />
                <StatCard
                    href="/dashboard/receiver/pos"
                    count={0}
                    label="PO Tracking"
                    sublabel="View delivery status →"
                    icon={<FileText className="h-5 w-5" />}
                    color="amber"
                />
            </div>

            {/* ── TWO-COLUMN CONTENT ─────────────────────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Pending Incoming Shipments */}
                <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-500" />
                            Incoming Shipments
                        </CardTitle>
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                            <Link href="/dashboard/receiver/deliveries">
                                View all <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                        {pendingShipments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Truck className="h-8 w-8 text-muted-foreground/40 mb-2" />
                                <p className="text-sm text-muted-foreground">No pending shipments</p>
                            </div>
                        ) : (
                            pendingShipments.map((ship) => (
                                <Link
                                    key={ship.id}
                                    href={`/dashboard/receiver/deliveries/${ship.id}/confirm`}
                                    className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/50 hover:border-border"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                                        <Truck className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-0.5">
                                        <p className="text-sm font-medium truncate">
                                            {ship.purchaseOrder?.poNumber ?? "—"}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {(ship.purchaseOrder as any)?.supplier?.name ?? "Unknown supplier"}
                                            {ship.carrier ? ` · ${ship.carrier}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <StatusBadge status={ship.status} />
                                        {ship.logisticsEta && (
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(ship.logisticsEta), { addSuffix: true })}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* My Recent Deliveries */}
                <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            My Confirmed Deliveries
                        </CardTitle>
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                            <Link href="/dashboard/receiver/deliveries?tab=confirmed">
                                View all <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                        {recentDeliveries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <CheckCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
                                <p className="text-sm text-muted-foreground">No deliveries confirmed yet</p>
                            </div>
                        ) : (
                            recentDeliveries.map((del) => (
                                <div
                                    key={del.id}
                                    className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-0.5">
                                        <p className="text-sm font-medium truncate">
                                            {del.purchaseOrder?.poNumber ?? "—"}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {(del.purchaseOrder as any)?.supplier?.name ?? "—"}
                                            {del.isPartial && " · Partial"}
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                        {del.receivedDate
                                            ? formatDistanceToNow(new Date(del.receivedDate), { addSuffix: true })
                                            : "—"}
                                    </span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── MY NCRs ────────────────────────────────────────────────────── */}
            {myNcrs.length > 0 && (
                <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <ShieldWarning className="h-4 w-4 text-red-500" />
                            My Open NCRs
                        </CardTitle>
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                            <Link href="/dashboard/receiver/ncr">
                                View all <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-2">
                            {myNcrs.map((n) => (
                                <Link
                                    key={n.id}
                                    href={`/dashboard/receiver/ncr`}
                                    className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                                        <Warning className="h-4 w-4 text-red-500" weight="fill" />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-0.5">
                                        <p className="text-sm font-medium truncate">{n.title}</p>
                                        <p className="text-xs text-muted-foreground">{n.ncrNumber}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <StatusBadge status={n.status} />
                                        <span className={cn(
                                            "text-[10px] font-semibold px-1.5 rounded",
                                            n.severity === "CRITICAL" ? "text-red-600" :
                                            n.severity === "MAJOR" ? "text-amber-600" : "text-muted-foreground"
                                        )}>
                                            {n.severity}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
