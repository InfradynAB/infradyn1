"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
    CurrencyDollar,
    CheckCircle,
    Clock,
    Warning,
    Coins,
    ArrowsClockwise,
} from "@phosphor-icons/react";
import type { FinancialKPIs } from "@/lib/services/kpi-engine";

interface FinancialSummaryTilesProps {
    data: FinancialKPIs;
    currency?: string;
    onTileClick?: (metric: string) => void;
}

const formatCurrency = (value: number, currency = "USD") => {
    if (value >= 1_000_000) {
        return `${currency} ${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
        return `${currency} ${(value / 1_000).toFixed(1)}K`;
    }
    return `${currency} ${value.toLocaleString()}`;
};

export function FinancialSummaryTiles({
    data,
    currency = "USD",
    onTileClick,
}: FinancialSummaryTilesProps) {
    const tiles = [
        {
            id: "committed",
            title: "Total Committed",
            value: data.totalCommitted,
            icon: CurrencyDollar,
            color: "text-slate-700",
            bgColor: "bg-slate-50 dark:bg-slate-900",
            borderColor: "border-l-slate-600",
            description: "PO Value + Approved COs",
        },
        {
            id: "paid",
            title: "Paid",
            value: data.totalPaid,
            icon: CheckCircle,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50 dark:bg-emerald-950",
            borderColor: "border-l-emerald-600",
            description: "Invoices settled",
        },
        {
            id: "unpaid",
            title: "Unpaid",
            value: data.totalUnpaid,
            icon: Clock,
            color: "text-amber-600",
            bgColor: "bg-amber-50 dark:bg-amber-950",
            borderColor: "border-l-amber-500",
            description: "Outstanding balance",
        },
        {
            id: "pending",
            title: "Pending Invoices",
            value: data.totalPending,
            icon: Warning,
            color: "text-orange-600",
            bgColor: "bg-orange-50 dark:bg-orange-950",
            borderColor: "border-l-orange-500",
            description: "Awaiting approval",
        },
        {
            id: "retention",
            title: "Retention Held",
            value: data.retentionHeld,
            icon: Coins,
            color: "text-purple-600",
            bgColor: "bg-purple-50 dark:bg-purple-950",
            borderColor: "border-l-purple-500",
            description: "Withheld for defects",
        },
        {
            id: "co-impact",
            title: "CO Impact",
            value: data.changeOrderImpact,
            icon: ArrowsClockwise,
            color: data.changeOrderImpact > 0 ? "text-red-600" : "text-green-600",
            bgColor: data.changeOrderImpact > 0 ? "bg-red-50 dark:bg-red-950" : "bg-green-50 dark:bg-green-950",
            borderColor: data.changeOrderImpact > 0 ? "border-l-red-500" : "border-l-green-500",
            description: "Budget variance",
            prefix: data.changeOrderImpact > 0 ? "+" : "",
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {tiles.map((tile) => {
                const Icon = tile.icon;
                return (
                    <Card
                        key={tile.id}
                        className={cn(
                            "border-l-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
                            tile.borderColor
                        )}
                        onClick={() => onTileClick?.(tile.id)}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Icon className={cn("h-4 w-4", tile.color)} />
                                {tile.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-2xl font-bold font-sans tabular-nums", tile.color)}>
                                {tile.prefix || ""}
                                {formatCurrency(tile.value, currency)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {tile.description}
                            </p>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
