"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

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
    loading?: boolean;
}

function StatTile({
    label,
    value,
    subValue,
    loading,
}: StatTileProps) {
    if (loading) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="space-y-2">
                        <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                        <div className="h-5 bg-muted animate-pulse rounded w-1/2" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="space-y-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className="text-lg font-bold truncate">{value}</p>
                    {subValue && (
                        <p className="text-[10px] text-muted-foreground">{subValue}</p>
                    )}
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
                loading={loading}
            />
            <StatTile
                label="Physical Progress"
                value={stats ? `${Math.round(stats.physicalProgress)}%` : "-"}
                subValue={stats ? `${stats.activePOs} active POs` : undefined}
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
                loading={loading}
            />
        </div>
    );
}
