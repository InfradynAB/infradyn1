"use client";

import { cn } from "@/lib/utils";

export interface DeliveryTimelineItem {
    id: string;
    poNumber: string;
    description: string;
    stages: {
        name: "dispatch" | "transit" | "delivered" | "inspected";
        date: string | null;
        status: "completed" | "in-progress" | "pending" | "delayed";
    }[];
}

const STAGE_LABELS: Record<string, string> = {
    dispatch: "Dispatched",
    transit: "In Transit",
    delivered: "Delivered",
    inspected: "Inspected",
};

const STATUS_COLORS: Record<string, { bg: string; ring: string; text: string }> = {
    completed: { bg: "bg-emerald-500", ring: "ring-emerald-200 dark:ring-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400" },
    "in-progress": { bg: "bg-blue-500", ring: "ring-blue-200 dark:ring-blue-500/30", text: "text-blue-600 dark:text-blue-400" },
    pending: { bg: "bg-slate-300 dark:bg-slate-600", ring: "ring-slate-100 dark:ring-slate-700", text: "text-muted-foreground" },
    delayed: { bg: "bg-red-500", ring: "ring-red-200 dark:ring-red-500/30", text: "text-red-600 dark:text-red-400" },
};

export function DeliveryGantt({ items }: { items: DeliveryTimelineItem[] }) {
    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                No active deliveries
            </div>
        );
    }

    return (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {items.map(item => (
                <div key={item.id} className="rounded-xl border border-border/60 bg-card/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{item.poNumber}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">{item.description}</span>
                        </div>
                        <OverallStatus stages={item.stages} />
                    </div>
                    {/* Stage progress strip */}
                    <div className="flex items-center gap-0">
                        {item.stages.map((stage, i) => {
                            const colors = STATUS_COLORS[stage.status];
                            const isLast = i === item.stages.length - 1;
                            return (
                                <div key={stage.name} className="flex items-center flex-1 min-w-0">
                                    <div className="flex flex-col items-center gap-1 shrink-0">
                                        <div className={cn("w-3.5 h-3.5 rounded-full ring-2", colors.bg, colors.ring)} />
                                        <span className={cn("text-[9px] font-semibold whitespace-nowrap", colors.text)}>
                                            {STAGE_LABELS[stage.name]}
                                        </span>
                                        {stage.date && (
                                            <span className="text-[8px] text-muted-foreground">
                                                {new Date(stage.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                            </span>
                                        )}
                                    </div>
                                    {!isLast && (
                                        <div className={cn(
                                            "h-0.5 flex-1 mx-1 rounded-full",
                                            stage.status === "completed" ? "bg-emerald-400 dark:bg-emerald-500/50" : "bg-border"
                                        )} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

function OverallStatus({ stages }: { stages: DeliveryTimelineItem["stages"] }) {
    const hasDelayed = stages.some(s => s.status === "delayed");
    const allCompleted = stages.every(s => s.status === "completed");
    const label = hasDelayed ? "Delayed" : allCompleted ? "Complete" : "In Progress";
    const color = hasDelayed
        ? "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400"
        : allCompleted
            ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400";
    return (
        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider", color)}>
            {label}
        </span>
    );
}
