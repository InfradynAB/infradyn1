import type { MaterialClassDetailRow } from "@/lib/actions/delivery-analytics";
import { StatusBadge } from "./status-badge";
import { Package } from "lucide-react";

interface Props {
    rows: MaterialClassDetailRow[];
    materialClass: string;
    disciplineLabel: string;
}

function formatDate(date: Date | string | null): string {
    if (!date) return "—";
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(date));
}

function QtyCell({ delivered, required }: { delivered: number; required: number }) {
    return (
        <span className="tabular-nums text-foreground text-xs">
            {delivered.toLocaleString()} / {required.toLocaleString()}
        </span>
    );
}

export function DeliveryBatchTimeline({
    rows,
    materialClass,
    disciplineLabel,
}: Props) {
    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <Package className="h-8 w-8 opacity-40" />
                <p className="text-sm">No items found for {materialClass}.</p>
            </div>
        );
    }

    const scheduled = rows.filter((r) => r.weekStart);
    const unscheduled = rows.filter((r) => !r.weekStart);
    const flatDeliveries = rows.flatMap((r) => r.deliveries);

    return (
        <div className="space-y-6">

            {/* Context header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-foreground">{materialClass}</div>
                    <div className="text-xs text-muted-foreground">{disciplineLabel} · Weekly delivery batches</div>
                </div>
                <div className="flex items-center gap-2">
                    {(["LATE", "AT_RISK", "ON_TRACK", "NO_ROS"] as const).map((s) => {
                        const count = rows.filter((r) => r.status === s).length;
                        if (count === 0) return null;
                        return <StatusBadge key={s} status={s} />;
                    })}
                    <span className="text-xs text-muted-foreground">
                        {flatDeliveries.length} delivery record{flatDeliveries.length !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>

            {/* A) Demand timeline */}
            {scheduled.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
                    <div className="border-b border-border/60 bg-muted/30 px-4 py-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Demand timeline (Required vs Delivered)
                        </span>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <th className="px-4 pb-2 pt-3">Batch</th>
                                <th className="pb-2 pr-4 pt-3">Delivered / Required</th>
                                <th className="pb-2 pr-4 pt-3">Status</th>
                                <th className="pb-2 pr-4 pt-3">Schedule Impact</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {scheduled.map((batch) => (
                                <tr key={batch.label} className="transition-colors hover:bg-muted/40">
                                    <td className="px-4 py-3 text-foreground">
                                        <div className="font-medium">{batch.label}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {batch.weekStart ? formatDate(batch.weekStart) : "—"} – {batch.weekEnd ? formatDate(batch.weekEnd) : "—"}
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <QtyCell delivered={batch.deliveredQty} required={batch.requiredQty} />
                                    </td>
                                    <td className="py-3 pr-4">
                                        <StatusBadge status={batch.status} lateDays={batch.lateDays} compact />
                                    </td>
                                    <td className="py-3 pr-4 tabular-nums text-zinc-300">
                                        {batch.status === "LATE" && batch.lateDays > 0 ? `+${batch.lateDays}d` : batch.status === "AT_RISK" ? "Buffer" : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Unscheduled bucket */}
            {unscheduled.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <div className="text-sm font-medium text-amber-700 dark:text-amber-200">Unscheduled items</div>
                    <div className="text-xs text-amber-700/80 dark:text-amber-200/80">Some BOQ items have no ROS date, so they can’t be scheduled into time batches yet.</div>
                </div>
            )}

            {/* B) Deliveries */}
            <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
                <div className="border-b border-border/60 bg-muted/30 px-4 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Deliveries
                    </span>
                </div>

                {flatDeliveries.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No deliveries recorded yet for {materialClass}.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <th className="px-4 pb-2 pt-3">PO</th>
                                <th className="pb-2 pr-4 pt-3">Item</th>
                                <th className="pb-2 pr-4 pt-3">Expected</th>
                                <th className="pb-2 pr-4 pt-3">Actual</th>
                                <th className="pb-2 pr-4 pt-3">Qty</th>
                                <th className="pb-2 pr-4 pt-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {flatDeliveries.map((d) => (
                                <tr key={d.deliveryId + d.itemNumber} className="transition-colors hover:bg-muted/40">
                                    <td className="px-4 py-3 text-foreground">{d.poNumber}</td>
                                    <td className="py-3 pr-4">
                                        <div className="text-foreground">{d.itemNumber}</div>
                                        <div className="text-xs text-muted-foreground truncate max-w-[520px]">{d.description}</div>
                                    </td>
                                    <td className="py-3 pr-4 tabular-nums text-muted-foreground">{formatDate(d.expectedDate)}</td>
                                    <td className="py-3 pr-4 tabular-nums text-muted-foreground">{formatDate(d.actualDate)}</td>
                                    <td className="py-3 pr-4 tabular-nums text-foreground">{d.qty.toLocaleString()} {d.unit}</td>
                                    <td className="py-3 pr-4">
                                        <span className={
                                            d.status === "LATE" ? "text-red-600 dark:text-red-400" : d.status === "ON_TIME" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                        }>
                                            {d.status === "LATE" ? "Late" : d.status === "ON_TIME" ? "On time" : "Not delivered"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
