import type { DisciplineSummaryRow } from "@/lib/actions/delivery-analytics";
import { StatusBadge } from "./status-badge";
import { AlertTriangle, ChevronRight, Package } from "lucide-react";

interface Props {
    rows: DisciplineSummaryRow[];
    onDisciplineClick: (discipline: string) => void;
}

function progressPercent(delivered: number, required: number): number {
    if (required === 0) return 100;
    return Math.min(100, Math.round((delivered / required) * 100));
}

function ProgressBar({ value, status }: { value: number; status: string }) {
    const colour =
        status === "LATE"
            ? "bg-red-500"
            : status === "AT_RISK"
                ? "bg-amber-400"
                : "bg-emerald-500";

    return (
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted/60">
            <div
                className={`h-full rounded-full transition-all ${colour}`}
                style={{ width: `${value}%` }}
            />
        </div>
    );
}

export function DisciplineSummaryTable({ rows, onDisciplineClick }: Props) {
    const hasAnyItems = rows.some((r) => r.itemCount > 0 || r.uncategorisedCount > 0);
    if (!hasAnyItems) {
        return (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <Package className="h-8 w-8 opacity-40" />
                <p className="text-sm">No categorised BOQ items found in this project.</p>
                <p className="text-xs opacity-60">
                    Assign a discipline to BOQ items when creating or editing a PO.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border/60 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <th className="pb-3 pr-4">Discipline</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Delivered / Required</th>
                        <th className="pb-3 pr-4">Schedule Impact</th>
                        <th className="pb-3 pr-4">Trend</th>
                        <th className="pb-3 pr-4">Progress</th>
                        <th className="pb-3 pr-4">Items</th>
                        <th className="pb-3 pr-4 text-right">Value at Risk</th>
                        <th className="pb-3" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                    {rows.map((row) => {
                        const pct = progressPercent(row.deliveredQty, row.requiredQty);
                        const isUncategorised = row.discipline === "UNCATEGORISED";

                        return (
                            <tr
                                key={row.discipline}
                                className="group cursor-pointer transition-colors hover:bg-muted/40"
                                onClick={() => onDisciplineClick(row.discipline)}
                            >
                                {/* Discipline name */}
                                <td className="py-3 pr-4">
                                    <div className="font-medium text-foreground">
                                        {row.disciplineLabel}
                                    </div>
                                    {isUncategorised && (
                                        <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                            <AlertTriangle className="h-3 w-3" />
                                            {row.uncategorisedCount} item
                                            {row.uncategorisedCount !== 1 ? "s" : ""} need
                                            classification
                                        </div>
                                    )}
                                </td>

                                {/* Status badge */}
                                <td className="py-3 pr-4">
                                    <StatusBadge
                                        status={row.status}
                                        lateDays={row.lateDays}
                                        compact
                                    />
                                </td>

                                {/* Delivered / Required */}
                                <td className="py-3 pr-4 tabular-nums text-zinc-300">
                                    {row.deliveredQty.toLocaleString()} /{" "}
                                    {row.requiredQty.toLocaleString()}
                                </td>

                                {/* Schedule impact */}
                                <td className="py-3 pr-4 tabular-nums text-zinc-300">
                                    {row.status === "LATE" && row.lateDays > 0
                                        ? `+${row.lateDays}d`
                                        : row.status === "AT_RISK"
                                            ? "Buffer"
                                            : "—"}
                                </td>

                                {/* Trend */}
                                <td className="py-3 pr-4 text-zinc-400">
                                    {row.trend === "IMPROVING"
                                        ? "Improving"
                                        : row.trend === "DETERIORATING"
                                            ? "Deteriorating"
                                            : row.trend === "STABLE"
                                                ? "Stable"
                                                : "—"}
                                </td>

                                {/* Progress bar */}
                                <td className="py-3 pr-4">
                                    <div className="flex items-center gap-2">
                                        <ProgressBar value={pct} status={row.status} />
                                        <span className="text-xs tabular-nums text-muted-foreground">
                                            {pct}%
                                        </span>
                                    </div>
                                </td>

                                {/* Item count */}
                                <td className="py-3 pr-4 text-muted-foreground">{row.itemCount}</td>

                                {/* Value at risk */}
                                <td className="py-3 pr-4 text-right tabular-nums text-foreground">
                                    {row.valueAtRisk > 0
                                        ? `$${row.valueAtRisk.toLocaleString(undefined, {
                                            maximumFractionDigits: 0,
                                        })}`
                                        : "—"}
                                </td>

                                {/* Chevron */}
                                <td className="py-3 pl-2 text-muted-foreground transition-colors group-hover:text-foreground">
                                    <ChevronRight className="h-4 w-4" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
