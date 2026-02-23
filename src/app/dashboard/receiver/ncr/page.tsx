import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ShieldWarning,
    Warning,
    CheckCircle,
    Clock,
    ArrowRight,
    Plus,
} from "@phosphor-icons/react/dist/ssr";
import { getMyNCRs } from "@/lib/actions/receiver-actions";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

export const metadata = { title: "My NCRs | Site Receiver" };

const STATUS_COLORS: Record<string, string> = {
    OPEN: "bg-red-500/10 text-red-600 border-red-500/20",
    SUPPLIER_RESPONDED: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    REINSPECTION: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    REVIEW: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    REMEDIATION: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    CLOSED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: "text-red-600 font-bold",
    MAJOR: "text-amber-600 font-semibold",
    MINOR: "text-muted-foreground",
};

export default async function ReceiverNCRPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/sign-in");
    if (session.user.role !== "SITE_RECEIVER") redirect("/dashboard");

    const ncrs = await getMyNCRs();
    const open = ncrs.filter((n) => n.status !== "CLOSED");
    const closed = ncrs.filter((n) => n.status === "CLOSED");

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-16">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My NCRs</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Non-Conformance Reports you have raised for your deliveries.
                    </p>
                </div>
                <Button asChild className="bg-cyan-600 hover:bg-cyan-700 shrink-0">
                    <Link href="/dashboard/receiver/ncr/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Raise NCR
                    </Link>
                </Button>
            </div>

            {/* Open NCRs */}
            <div className="space-y-3">
                {open.length === 0 && closed.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <ShieldWarning className="h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="font-medium text-muted-foreground">No NCRs raised yet</p>
                            <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
                                If material arrives damaged or incorrect, raise an NCR to notify the team.
                            </p>
                            <Button asChild size="sm" className="mt-4 bg-cyan-600 hover:bg-cyan-700">
                                <Link href="/dashboard/receiver/ncr/new">
                                    Raise your first NCR
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {open.length > 0 && (
                            <div className="space-y-2">
                                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Open ({open.length})
                                </h2>
                                {open.map((n) => (
                                    <NCRRow key={n.id} ncr={n} />
                                ))}
                            </div>
                        )}

                        {closed.length > 0 && (
                            <div className="space-y-2 mt-6">
                                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Closed ({closed.length})
                                </h2>
                                {closed.map((n) => (
                                    <NCRRow key={n.id} ncr={n} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function NCRRow({ ncr }: { ncr: any }) {
    const statusCls = STATUS_COLORS[ncr.status] ?? "bg-muted text-muted-foreground border-border";
    const severityCls = SEVERITY_COLORS[ncr.severity] ?? "text-muted-foreground";

    return (
        <div className="flex items-start gap-3 rounded-xl border border-border/70 p-4 transition-colors hover:border-border hover:bg-muted/30">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", ncr.status === "CLOSED" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20")}>
                {ncr.status === "CLOSED"
                    ? <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                    : <Warning className="h-4.5 w-4.5 text-red-500" weight="fill" />
                }
            </div>
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold truncate">{ncr.title}</p>
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusCls)}>
                        {ncr.status.replace(/_/g, " ")}
                    </span>
                    <span className={cn("text-[10px]", severityCls)}>{ncr.severity}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                    {ncr.ncrNumber} · {ncr.purchaseOrder?.poNumber ?? "—"} · {ncr.purchaseOrder?.supplier?.name ?? "—"}
                </p>
                <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {ncr.reportedAt
                        ? formatDistanceToNow(new Date(ncr.reportedAt), { addSuffix: true })
                        : "—"}
                </p>
            </div>
        </div>
    );
}
