"use client";

import { cn } from "@/lib/utils";
import { CheckCircle, Clock, Warning, CalendarBlank } from "@phosphor-icons/react";

export interface MilestoneItem {
    id: string;
    name: string;
    dueDate: Date;
    progress: number; // 0–100
    value: number;
    status: "completed" | "on-track" | "at-risk" | "overdue";
    poNumber?: string;
}

interface Props {
    data: MilestoneItem[];
    onMilestoneClick?: (id: string) => void;
}

const fmt = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
};

const statusCfg: Record<string, { icon: typeof CheckCircle; color: string; barColor: string; bg: string; badge: string }> = {
    completed: { icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", barColor: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
    "on-track": { icon: Clock, color: "text-blue-600 dark:text-blue-400", barColor: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10", badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
    "at-risk": { icon: Warning, color: "text-amber-600 dark:text-amber-400", barColor: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
    overdue: { icon: Warning, color: "text-red-600 dark:text-red-400", barColor: "bg-red-500", bg: "bg-red-50 dark:bg-red-500/10", badge: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
};

export function MilestoneProgressChart({ data, onMilestoneClick }: Props) {
    const sorted = [...data].sort((a, b) => {
        const order = { overdue: 0, "at-risk": 1, "on-track": 2, completed: 3 };
        return order[a.status] - order[b.status];
    });

    const totalValue = data.reduce((s, m) => s + m.value, 0);
    const completedValue = data.filter(m => m.status === "completed").reduce((s, m) => s + m.value, 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Milestone Progress</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{data.filter(m => m.status === "completed").length}/{data.length} completed</span>
                    <span className="font-mono font-bold text-foreground">{fmt(completedValue)}/{fmt(totalValue)}</span>
                </div>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {sorted.map((ms) => {
                    const cfg = statusCfg[ms.status];
                    const Icon = cfg.icon;
                    const isOverdue = ms.status === "overdue";
                    const daysLabel = (() => {
                        const diff = Math.ceil((new Date(ms.dueDate).getTime() - Date.now()) / 86400000);
                        if (diff < 0) return `${Math.abs(diff)}d overdue`;
                        if (diff === 0) return "Due today";
                        return `${diff}d left`;
                    })();

                    return (
                        <button
                            key={ms.id}
                            onClick={() => onMilestoneClick?.(ms.id)}
                            className={cn(
                                "w-full rounded-xl border p-4 text-left transition-all duration-200",
                                "hover:shadow-md hover:-translate-y-0.5 group",
                                isOverdue ? "border-red-200 dark:border-red-800/40" : "border-border/60",
                            )}
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                                        <Icon className={cn("w-4 h-4", cfg.color)} weight="duotone" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate">{ms.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {ms.poNumber && <span className="text-[10px] font-mono text-muted-foreground">{ms.poNumber}</span>}
                                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", cfg.badge)}>
                                                {ms.status.replace("-", " ")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold font-mono tabular-nums">{fmt(ms.value)}</p>
                                    <div className="flex items-center gap-1 justify-end text-[10px] text-muted-foreground mt-0.5">
                                        <CalendarBlank className="w-3 h-3" />
                                        <span className={cn(isOverdue && "text-red-500 font-bold")}>{daysLabel}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Progress bar */}
                            <div className="flex items-center gap-2.5">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full transition-all duration-700", cfg.barColor)}
                                        style={{ width: `${Math.min(ms.progress, 100)}%` }} />
                                </div>
                                <span className="text-[11px] font-mono font-bold tabular-nums w-9 text-right">{ms.progress}%</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
