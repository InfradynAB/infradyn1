"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, CheckCircle2, TrendingUp } from "lucide-react";

interface NCRMetrics {
    total: number;
    openCount: number;
    criticalOpen: number;
    overdueCount: number;
    severityBreakdown: {
        CRITICAL: number;
        MAJOR: number;
        MINOR: number;
    };
}

interface NCRMetricsCardsProps {
    metrics: NCRMetrics | null;
    loading?: boolean;
}

export function NCRMetricsCards({ metrics, loading }: NCRMetricsCardsProps) {
    if (loading || !metrics) {
        return (
            <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="h-4 bg-muted rounded w-20" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 bg-muted rounded w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const closedRate = metrics.total > 0
        ? Math.round(((metrics.total - metrics.openCount) / metrics.total) * 100)
        : 100;

    return (
        <div className="grid gap-4 md:grid-cols-4">
            {/* Total NCRs */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total NCRs
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.total}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {metrics.openCount} open
                    </p>
                </CardContent>
            </Card>

            {/* Critical NCRs */}
            <Card className={metrics.criticalOpen > 0 ? "border-red-500/50 bg-red-500/5" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Critical Open
                    </CardTitle>
                    <AlertTriangle className={`h-4 w-4 ${metrics.criticalOpen > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${metrics.criticalOpen > 0 ? "text-red-500" : ""}`}>
                        {metrics.criticalOpen}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Requires immediate action
                    </p>
                </CardContent>
            </Card>

            {/* Overdue NCRs */}
            <Card className={metrics.overdueCount > 0 ? "border-orange-500/50 bg-orange-500/5" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Overdue
                    </CardTitle>
                    <Clock className={`h-4 w-4 ${metrics.overdueCount > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${metrics.overdueCount > 0 ? "text-orange-500" : ""}`}>
                        {metrics.overdueCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Past SLA deadline
                    </p>
                </CardContent>
            </Card>

            {/* Resolution Rate */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Resolution Rate
                    </CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-500">{closedRate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {metrics.total - metrics.openCount} of {metrics.total} resolved
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
