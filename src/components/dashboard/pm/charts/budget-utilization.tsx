"use client";

import { cn } from "@/lib/utils";

interface Props {
    originalBudget: number;
    committed: number;
    invoiced: number;
    paid: number;
}

const fmt = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
};

export function BudgetUtilizationBar({ originalBudget, committed, invoiced, paid }: Props) {
    const max = Math.max(originalBudget, committed, 1);
    const pctPaid = (paid / max) * 100;
    const pctInvoiced = (invoiced / max) * 100;
    const pctCommitted = (committed / max) * 100;
    const remaining = Math.max(0, originalBudget - committed);
    const pctRemaining = (remaining / max) * 100;
    const overBudget = committed > originalBudget;

    const segments = [
        { label: "Paid", value: paid, pct: pctPaid, color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
        { label: "Invoiced", value: Math.max(0, invoiced - paid), pct: Math.max(0, pctInvoiced - pctPaid), color: "bg-blue-500", textColor: "text-blue-600 dark:text-blue-400" },
        { label: "Committed", value: Math.max(0, committed - invoiced), pct: Math.max(0, pctCommitted - pctInvoiced), color: "bg-amber-400", textColor: "text-amber-600 dark:text-amber-400" },
        { label: "Remaining", value: remaining, pct: pctRemaining, color: "bg-muted-foreground/20", textColor: "text-muted-foreground" },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Budget Utilization</h3>
                {overBudget && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 px-2 py-0.5 rounded-md animate-pulse">
                        Over Budget ({fmt(committed - originalBudget)})
                    </span>
                )}
            </div>

            {/* Total / Original label */}
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Total Budget</p>
                    <p className="text-2xl font-bold font-mono tabular-nums">{fmt(originalBudget)}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">{((committed / max) * 100).toFixed(1)}%</span> committed
                </p>
            </div>

            {/* Bar */}
            <div className="h-6 rounded-full overflow-hidden flex bg-muted relative">
                {segments.map((seg) =>
                    seg.pct > 0 ? (
                        <div key={seg.label} className={cn("h-full transition-all duration-700", seg.color)} style={{ width: `${Math.min(seg.pct, 100)}%` }} />
                    ) : null
                )}
                {overBudget && <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse" />}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-4 gap-3">
                {segments.map((seg) => (
                    <div key={seg.label} className="text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <span className={cn("w-2.5 h-2.5 rounded-sm", seg.color)} />
                            <span className="text-[10px] text-muted-foreground font-medium">{seg.label}</span>
                        </div>
                        <p className={cn("text-sm font-bold font-mono tabular-nums", seg.textColor)}>{fmt(seg.value)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
