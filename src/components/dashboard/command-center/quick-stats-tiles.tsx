"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
    ArrowDownRight,
    ArrowUpRight,
    CurrencyDollar,
    Target,
    FileText,
    CheckCircle,
} from "@phosphor-icons/react";

interface QuickStats {
    totalCommitted: number;
    totalPaid: number;
    physicalProgress: number;
    activePOs: number;
    milestonesCompleted: number;
    milestonesTotal: number;
    onTrack: number;
    atRisk: number;
    delayed: number;
}

interface QuickStatsTilesProps {
    stats: QuickStats | null;
    className?: string;
    loading?: boolean;
}

const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
        return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
};

interface StatTileProps {
    label: string;
    value: string;
    subValue?: string;
    icon: React.ElementType;
    trend?: "up" | "down" | "neutral";
    iconColor?: string;
    loading?: boolean;
}

function StatTile({
    label,
    value,
    subValue,
    icon: Icon,
    trend,
    iconColor = "text-primary",
    loading,
}: StatTileProps) {
    if (loading) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                            <div className="h-5 bg-muted animate-pulse rounded w-1/2" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            "flex-shrink-0 p-2.5 rounded-lg",
                            "bg-primary/5"
                        )}
                    >
                        <Icon className={cn("h-5 w-5", iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{label}</p>
                        <div className="flex items-center gap-2">
                            <p className="text-lg font-bold truncate">{value}</p>
                            {trend && trend !== "neutral" && (
                                <span
                                    className={cn(
                                        "flex items-center text-xs",
                                        trend === "up" && "text-emerald-500",
                                        trend === "down" && "text-red-500"
                                    )}
                                >
                                    {trend === "up" ? (
                                        <ArrowUpRight className="h-3 w-3" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3" />
                                    )}
                                </span>
                            )}
                        </div>
                        {subValue && (
                            <p className="text-[10px] text-muted-foreground">{subValue}</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function QuickStatsTiles({ stats, className, loading }: QuickStatsTilesProps) {
    if (!stats && !loading) {
        return null;
    }

    const paidPercent = stats
        ? stats.totalCommitted > 0
            ? Math.round((stats.totalPaid / stats.totalCommitted) * 100)
            : 0
        : 0;

    return (
        <div className={cn("grid gap-4 grid-cols-2 md:grid-cols-4", className)}>
            <StatTile
                label="Total Committed"
                value={stats ? formatCurrency(stats.totalCommitted) : "-"}
                subValue={stats ? `${paidPercent}% paid` : undefined}
                icon={CurrencyDollar}
                iconColor="text-emerald-500"
                loading={loading}
            />
            <StatTile
                label="Physical Progress"
                value={stats ? `${Math.round(stats.physicalProgress)}%` : "-"}
                subValue={stats ? `${stats.activePOs} active POs` : undefined}
                icon={Target}
                iconColor="text-blue-500"
                loading={loading}
            />
            <StatTile
                label="Milestones"
                value={
                    stats
                        ? `${stats.milestonesCompleted}/${stats.milestonesTotal}`
                        : "-"
                }
                subValue={
                    stats && stats.milestonesTotal > 0
                        ? `${Math.round(
                              (stats.milestonesCompleted / stats.milestonesTotal) * 100
                          )}% complete`
                        : undefined
                }
                icon={CheckCircle}
                iconColor="text-purple-500"
                loading={loading}
            />
            <StatTile
                label="Active Contracts"
                value={stats ? `${stats.activePOs}` : "-"}
                subValue={
                    stats
                        ? `${stats.onTrack} on track · ${stats.atRisk + stats.delayed} at risk`
                        : undefined
                }
                icon={FileText}
                iconColor="text-amber-500"
                loading={loading}
            />
        </div>
    );
}
