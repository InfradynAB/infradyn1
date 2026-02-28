"use client";

import { cn } from "@/lib/utils";

export interface TrafficLightData {
    green: { count: number; label: string; items: string[] };
    amber: { count: number; label: string; items: string[] };
    red: { count: number; label: string; items: string[] };
}

interface Props {
    data: TrafficLightData;
    onLightClick?: (status: "green" | "amber" | "red") => void;
}

export function TrafficLightChart({ data, onLightClick }: Props) {
    const total = data.green.count + data.amber.count + data.red.count;
    const onTimePct = total > 0 ? Math.round((data.green.count / total) * 100) : 0;
    const atRiskPct = total > 0 ? Math.round((data.amber.count / total) * 100) : 0;
    const delayedPct = total > 0 ? Math.round((data.red.count / total) * 100) : 0;
    const riskCount = data.amber.count + data.red.count;
    const riskPct = total > 0 ? Math.round((riskCount / total) * 100) : 0;
    const targetOnTime = 85;
    const onTimeGap = Math.max(0, targetOnTime - onTimePct);

    const lights = [
        {
            key: "green" as const,
            ...data.green,
            color: "bg-emerald-500",
            glow: "shadow-emerald-500/40",
            ring: "ring-emerald-400/30",
            textColor: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-card dark:bg-card/50",
            border: "border-emerald-200 dark:border-emerald-800/50",
            emoji: "On Time",
        },
        {
            key: "amber" as const,
            ...data.amber,
            color: "bg-amber-500",
            glow: "shadow-amber-500/40",
            ring: "ring-amber-400/30",
            textColor: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-500/10",
            border: "border-amber-200 dark:border-amber-800/50",
            emoji: "At Risk",
        },
        {
            key: "red" as const,
            ...data.red,
            color: "bg-red-500",
            glow: "shadow-red-500/40",
            ring: "ring-red-400/30",
            textColor: "text-red-600 dark:text-red-400",
            bg: "bg-red-50 dark:bg-red-500/10",
            border: "border-red-200 dark:border-red-800/50",
            emoji: "Delayed",
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Delivery Status</h3>
                <span className="text-xs text-muted-foreground">{total} total deliveries</span>
            </div>

            {/* Traffic lights row */}
            <div className="grid grid-cols-3 gap-4">
                {lights.map((light) => {
                    const pct = total > 0 ? ((light.count / total) * 100).toFixed(0) : "0";
                    return (
                        <button
                            key={light.key}
                            onClick={() => onLightClick?.(light.key)}
                            className={cn(
                                "rounded-2xl border p-5 text-center transition-all duration-300 group",
                                "hover:shadow-lg hover:-translate-y-0.5",
                                light.border, light.bg
                            )}
                        >
                            {/* Glowing circle */}
                            <div className="flex justify-center mb-4">
                                <div className={cn(
                                    "w-16 h-16 rounded-full flex items-center justify-center",
                                    "shadow-lg transition-all duration-300 group-hover:scale-110",
                                    light.color, light.glow, "ring-4", light.ring
                                )}>
                                    <span className="text-2xl font-bold text-white font-sans tabular-nums">{light.count}</span>
                                </div>
                            </div>
                            <p className={cn("text-sm font-bold", light.textColor)}>{light.emoji}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{light.label}</p>
                            <p className={cn("text-lg font-bold font-sans tabular-nums mt-2", light.textColor)}>{pct}%</p>
                        </button>
                    );
                })}
            </div>

            {/* Horizontal summary bar */}
            <div className="h-3 rounded-full overflow-hidden flex bg-muted">
                {total > 0 && (
                    <>
                        <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(data.green.count / total) * 100}%` }} />
                        <div className="bg-amber-500 transition-all duration-700" style={{ width: `${(data.amber.count / total) * 100}%` }} />
                        <div className="bg-red-500 transition-all duration-700" style={{ width: `${(data.red.count / total) * 100}%` }} />
                    </>
                )}
            </div>

            {/* Insight rows (fills card space with actionable context) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-800/50 dark:bg-emerald-500/10 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">On-Time Rate</p>
                    <p className="text-xl font-sans tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{onTimePct}%</p>
                    <p className="text-[11px] text-muted-foreground">{data.green.count} deliveries on schedule</p>
                </div>
                <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 dark:border-amber-800/50 dark:bg-amber-500/10 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Watchlist</p>
                    <p className="text-xl font-sans tabular-nums font-bold text-amber-600 dark:text-amber-400">{atRiskPct}%</p>
                    <p className="text-[11px] text-muted-foreground">{data.amber.count} deliveries may slip</p>
                </div>
                <div className="rounded-xl border border-red-200/70 bg-red-50/40 dark:border-red-800/50 dark:bg-red-500/10 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Critical Delay</p>
                    <p className="text-xl font-sans tabular-nums font-bold text-red-600 dark:text-red-400">{delayedPct}%</p>
                    <p className="text-[11px] text-muted-foreground">{data.red.count} deliveries behind plan</p>
                </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1.5">
                <p className="text-xs font-semibold">Recommended Focus</p>
                <p className="text-xs text-muted-foreground">
                    {riskCount > 0
                        ? `${riskCount} deliveries (${riskPct}%) need active follow-up across at-risk and delayed queues.`
                        : "All deliveries are currently on track. Maintain current supplier cadence."}
                </p>
                {onTimeGap > 0 ? (
                    <p className="text-xs text-muted-foreground">
                        Raise on-time performance by {onTimeGap}% to reach the {targetOnTime}% control target.
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        On-time performance is meeting the {targetOnTime}% control target.
                    </p>
                )}
            </div>
        </div>
    );
}
