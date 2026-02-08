"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Truck, ArrowRight, Package, Clock, CheckCircle, Warning } from "@phosphor-icons/react";

export interface DeliveryItem {
    id: string;
    poNumber: string;
    supplier: string;
    description: string;
    expectedDate: Date;
    status: "in-transit" | "at-port" | "customs" | "delivered" | "delayed" | "scheduled";
    quantity: number;
    unit: string;
    trackingRef?: string;
}

interface Props {
    data: DeliveryItem[];
    onDeliveryClick?: (id: string) => void;
}

const statusCfg: Record<string, { bg: string; text: string; border: string; icon: typeof Truck; label: string }> = {
    "in-transit": { bg: "bg-blue-100 dark:bg-blue-500/15", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800", icon: Truck, label: "In Transit" },
    "at-port": { bg: "bg-indigo-100 dark:bg-indigo-500/15", text: "text-indigo-700 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800", icon: Package, label: "At Port" },
    customs: { bg: "bg-violet-100 dark:bg-violet-500/15", text: "text-violet-700 dark:text-violet-400", border: "border-violet-200 dark:border-violet-800", icon: Clock, label: "In Customs" },
    delivered: { bg: "bg-emerald-100 dark:bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800", icon: CheckCircle, label: "Delivered" },
    delayed: { bg: "bg-red-100 dark:bg-red-500/15", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800", icon: Warning, label: "Delayed" },
    scheduled: { bg: "bg-gray-100 dark:bg-gray-500/15", text: "text-gray-700 dark:text-gray-400", border: "border-gray-200 dark:border-gray-800", icon: Clock, label: "Scheduled" },
};

export function DeliveryPipeline({ data, onDeliveryClick }: Props) {
    const [now] = useState(() => Date.now());
    const sorted = [...data].sort((a, b) => {
        const order = { delayed: 0, "in-transit": 1, customs: 2, "at-port": 3, scheduled: 4, delivered: 5 };
        return (order[a.status] || 5) - (order[b.status] || 5);
    });

    const dueThisWeek = data.filter(d => {
        const diff = (new Date(d.expectedDate).getTime() - now) / 86400000;
        return diff >= 0 && diff <= 7 && d.status !== "delivered";
    }).length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Delivery Pipeline</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {dueThisWeek > 0 && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-800 font-bold">
                            {dueThisWeek} due this week
                        </Badge>
                    )}
                    <span>{data.length} shipments</span>
                </div>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {sorted.map((d) => {
                    const cfg = statusCfg[d.status];
                    const Icon = cfg.icon;
                    const daysUntil = Math.ceil((new Date(d.expectedDate).getTime() - now) / 86400000);
                    const dateLabel = daysUntil < 0
                        ? `${Math.abs(daysUntil)}d overdue`
                        : daysUntil === 0 ? "Due today"
                        : `${daysUntil}d away`;

                    return (
                        <button
                            key={d.id}
                            onClick={() => onDeliveryClick?.(d.id)}
                            className={cn(
                                "w-full rounded-xl border p-3.5 text-left transition-all duration-200 group",
                                "hover:shadow-md hover:-translate-y-0.5",
                                d.status === "delayed" ? "border-red-200 dark:border-red-800/50" : "border-border/60",
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                                    <Icon className={cn("w-4 h-4", cfg.text)} weight="duotone" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="text-sm font-semibold truncate">{d.description}</p>
                                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 rounded-md font-semibold shrink-0", cfg.bg, cfg.text, cfg.border)}>{cfg.label}</Badge>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        <span className="font-mono">{d.poNumber}</span>
                                        <ArrowRight className="w-2.5 h-2.5" />
                                        <span>{d.supplier}</span>
                                        <span className="mx-1">·</span>
                                        <span>{d.quantity} {d.unit}</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={cn(
                                        "text-[11px] font-bold",
                                        daysUntil < 0 ? "text-red-600 dark:text-red-400" : daysUntil <= 3 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                                    )}>{dateLabel}</p>
                                    {d.trackingRef && <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{d.trackingRef}</p>}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
