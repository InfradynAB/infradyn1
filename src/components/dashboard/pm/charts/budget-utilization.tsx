"use client";

import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
    originalBudget: number;
    committed: number;
    invoiced: number;
    paid: number;
}

const fmtShort = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
};

const fmtFull = (n: number) => `$${n.toLocaleString()}`;

const SEGMENTS = [
    { key: "paid", label: "Paid", fill: "#22c55e", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
    { key: "invoiced", label: "Invoiced", fill: "#3b82f6", dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
    { key: "committed", label: "Committed", fill: "#fbbf24", dot: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" },
    { key: "remaining", label: "Remaining", fill: "#9ca3af", dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400" },
];

export function BudgetUtilizationBar({ originalBudget, committed, invoiced, paid }: Props) {
    const max = Math.max(originalBudget, committed, 1);
    const overBudget = committed > originalBudget;

    const remaining = Math.max(0, originalBudget - committed);
    const valPaid = paid;
    const valInvoiced = Math.max(0, invoiced - paid);
    const valCommitted = Math.max(0, committed - invoiced);
    const valRemaining = remaining;

    const values: Record<string, number> = {
        paid: valPaid,
        invoiced: valInvoiced,
        committed: valCommitted,
        remaining: valRemaining,
    };

    const chartData = SEGMENTS.map((s) => ({ ...s, value: values[s.key] })).filter((s) => s.value > 0);

    return (
        <div className="space-y-3">
            {/* header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Budget Utilization</h3>
                {overBudget && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 px-2 py-0.5 rounded-md animate-pulse">
                        Over Budget ({fmtShort(committed - originalBudget)})
                    </span>
                )}
            </div>

            {/* 3-col layout */}
            <div className="flex flex-col sm:flex-row gap-6 items-stretch sm:items-center">

                {/* ── LEFT: table ──────────────────────────────────── */}
                <div className="flex-none w-full sm:w-52 rounded-xl border border-border/60 bg-background overflow-hidden shadow-sm text-xs">
                    <div className="grid grid-cols-2 bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                        <span>Table</span>
                        <span className="text-right">Total Budget</span>
                    </div>
                    {SEGMENTS.map((seg, idx) => (
                        <div
                            key={seg.key}
                            className={cn(
                                "grid grid-cols-2 px-3 py-2 items-center",
                                idx < SEGMENTS.length - 1 && "border-b border-border/30"
                            )}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className={cn("w-2 h-2 rounded-full shrink-0", seg.dot)} />
                                <span className="text-muted-foreground font-medium">{seg.label}</span>
                            </div>
                            <div className={cn("text-right font-semibold tabular-nums font-sans", seg.text)}>
                                {fmtFull(values[seg.key])}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── CENTER: big number ────────────────────────────── */}
                <div className="flex-1 flex flex-col items-center justify-center text-center min-w-0 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                        Total Budget
                    </p>
                    <p className="text-4xl sm:text-5xl font-extrabold tabular-nums font-sans text-foreground leading-none whitespace-nowrap">
                        {fmtShort(originalBudget)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        <span className="font-bold text-foreground">
                            {((committed / max) * 100).toFixed(1)}%
                        </span>{" "}committed
                    </p>
                </div>

                {/* ── RIGHT: donut + legend ─────────────────────────── */}
                <div className="flex-none flex items-center justify-center gap-4">
                    <div className="relative w-[130px] h-[130px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={42}
                                    outerRadius={62}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="transparent"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    {chartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(v: number) => [fmtFull(v), ""]}
                                    contentStyle={{
                                        borderRadius: "10px",
                                        fontSize: "11px",
                                        border: "1px solid rgba(0,0,0,.08)",
                                        boxShadow: "0 8px 20px rgba(0,0,0,.12)",
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* center label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[11px] font-bold font-sans tabular-nums text-foreground leading-snug">
                                {fmtShort(originalBudget)}
                            </span>
                            <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-semibold">
                                Total
                            </span>
                        </div>
                    </div>

                    {/* legend */}
                    <div className="space-y-1.5">
                        {SEGMENTS.map((seg) => (
                            <div key={seg.key} className="flex items-center gap-1.5">
                                <span className={cn("w-2 h-2 rounded-full shrink-0", seg.dot)} />
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{seg.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
