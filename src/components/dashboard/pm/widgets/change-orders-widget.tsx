"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowsLeftRight, TrendUp, TrendDown, Clock } from "@phosphor-icons/react";

export interface ChangeOrderItem {
    id: string;
    reference: string;
    title: string;
    status: "draft" | "submitted" | "approved" | "rejected" | "in-progress";
    costImpact: number; // positive = increase, negative = decrease
    timeImpactDays: number;
    submittedDate: Date;
    poNumber: string;
}

interface Props {
    data: ChangeOrderItem[];
    onCOClick?: (id: string) => void;
}

const fmt = (n: number) => {
    const abs = Math.abs(n);
    const sign = n >= 0 ? "+" : "-";
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    return `${sign}$${abs.toFixed(0)}`;
};

const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400 border-gray-200 dark:border-gray-800",
    submitted: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    rejected: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 border-red-200 dark:border-red-800",
    "in-progress": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-800",
};

export function ChangeOrdersWidget({ data, onCOClick }: Props) {
    const totalCostImpact = data.reduce((s, d) => s + d.costImpact, 0);
    const totalTimeImpact = data.reduce((s, d) => s + d.timeImpactDays, 0);
    const inProgress = data.filter(d => d.status === "in-progress" || d.status === "submitted").length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Change Orders</h3>
                <div className="flex items-center gap-3">
                    <span className={cn(
                        "text-xs font-bold font-mono",
                        totalCostImpact > 0 ? "text-red-600 dark:text-red-400" : totalCostImpact < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    )}>
                        {fmt(totalCostImpact)} net
                    </span>
                    {inProgress > 0 && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-800 rounded-md font-bold">
                            {inProgress} active
                        </Badge>
                    )}
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/60 p-3 text-center">
                    <ArrowsLeftRight className="w-4 h-4 mx-auto text-muted-foreground mb-1" weight="duotone" />
                    <p className="text-lg font-bold font-mono">{data.length}</p>
                    <p className="text-[10px] text-muted-foreground">Total COs</p>
                </div>
                <div className="rounded-xl border border-border/60 p-3 text-center">
                    {totalCostImpact >= 0 ? <TrendUp className="w-4 h-4 mx-auto text-red-500 mb-1" weight="bold" /> : <TrendDown className="w-4 h-4 mx-auto text-emerald-500 mb-1" weight="bold" />}
                    <p className={cn("text-lg font-bold font-mono", totalCostImpact > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>{fmt(totalCostImpact)}</p>
                    <p className="text-[10px] text-muted-foreground">Cost Impact</p>
                </div>
                <div className="rounded-xl border border-border/60 p-3 text-center">
                    <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" weight="duotone" />
                    <p className={cn("text-lg font-bold font-mono", totalTimeImpact > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>{totalTimeImpact > 0 ? `+${totalTimeImpact}` : totalTimeImpact}d</p>
                    <p className="text-[10px] text-muted-foreground">Time Impact</p>
                </div>
            </div>

            {/* CO list */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {data.map((co) => (
                    <button
                        key={co.id}
                        onClick={() => onCOClick?.(co.id)}
                        className="w-full rounded-xl border border-border/60 p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-mono text-muted-foreground">{co.reference}</span>
                                <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 rounded-md font-semibold capitalize", statusColors[co.status])}>{co.status.replace("-", " ")}</Badge>
                            </div>
                            <span className={cn(
                                "text-sm font-bold font-mono tabular-nums",
                                co.costImpact > 0 ? "text-red-600 dark:text-red-400" : co.costImpact < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                            )}>{fmt(co.costImpact)}</span>
                        </div>
                        <p className="text-sm font-medium truncate">{co.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span className="font-mono">{co.poNumber}</span>
                            <span>·</span>
                            <span>{co.timeImpactDays > 0 ? `+${co.timeImpactDays}d` : `${co.timeImpactDays}d`} schedule</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
