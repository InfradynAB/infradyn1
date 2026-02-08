"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    SmartAlertCard,
} from "@/components/dashboard/command-center";
import {
    Bell,
    ArrowsClockwise,
    CheckCircle,
    Warning,
    XCircle,
    Funnel,
    ClockCounterClockwise,
} from "@phosphor-icons/react";
import Link from "next/link";
import { toast } from "sonner";

interface AlertData {
    id: string;
    type: string;
    severity: "info" | "warning" | "critical";
    title: string;
    description: string;
    href: string;
    actionLabel: string;
    count?: number;
}

export function AlertsPageClient() {
    const [alerts, setAlerts] = useState<AlertData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");

    const fetchAlerts = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await fetch("/api/dashboard/command-center");
            if (!response.ok) throw new Error("Failed to fetch");
            const result = await response.json();
            if (result.success) {
                setAlerts(result.data.alerts || []);
            }
        } catch (error) {
            console.error("Error fetching alerts:", error);
            toast.error("Failed to load alerts");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    const handleRefresh = () => {
        fetchAlerts(true);
        toast.success("Alerts refreshed");
    };

    const filteredAlerts = alerts.filter((a) => {
        if (filter === "all") return true;
        return a.severity === filter;
    });

    const criticalCount = alerts.filter((a) => a.severity === "critical").length;
    const warningCount = alerts.filter((a) => a.severity === "warning").length;
    const infoCount = alerts.filter((a) => a.severity === "info").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-3">
                        <Bell className="h-7 w-7 text-primary" />
                        Alerts Center
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Items requiring your attention
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2"
                    >
                        <Link href="/dashboard/alerts/logs">
                            <ClockCounterClockwise className="h-4 w-4" />
                            View Logs
                        </Link>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="gap-2"
                    >
                        <ArrowsClockwise className={cn("h-4 w-4", refreshing && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card
                    className={cn(
                        "cursor-pointer transition-all",
                        filter === "critical" && "ring-2 ring-red-500"
                    )}
                    onClick={() => setFilter(filter === "critical" ? "all" : "critical")}
                >
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-red-500/10">
                            <XCircle className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{criticalCount}</p>
                            <p className="text-sm text-muted-foreground">Critical Alerts</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "cursor-pointer transition-all",
                        filter === "warning" && "ring-2 ring-amber-500"
                    )}
                    onClick={() => setFilter(filter === "warning" ? "all" : "warning")}
                >
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-amber-500/10">
                            <Warning className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{warningCount}</p>
                            <p className="text-sm text-muted-foreground">Warnings</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "cursor-pointer transition-all",
                        filter === "info" && "ring-2 ring-blue-500"
                    )}
                    onClick={() => setFilter(filter === "info" ? "all" : "info")}
                >
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-blue-500/10">
                            <Bell className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{infoCount}</p>
                            <p className="text-sm text-muted-foreground">Info Alerts</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Badge */}
            {filter !== "all" && (
                <div className="flex items-center gap-2">
                    <Funnel className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filtering by:</span>
                    <Badge
                        variant="secondary"
                        className={cn(
                            "cursor-pointer",
                            filter === "critical" && "bg-red-500/10 text-red-600",
                            filter === "warning" && "bg-amber-500/10 text-amber-600",
                            filter === "info" && "bg-blue-500/10 text-blue-600"
                        )}
                        onClick={() => setFilter("all")}
                    >
                        {filter} ×
                    </Badge>
                </div>
            )}

            {/* Alerts List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
            ) : filteredAlerts.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                            <CheckCircle className="h-8 w-8 text-emerald-500" />
                        </div>
                        <p className="text-lg font-medium text-emerald-600">All Clear!</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {filter !== "all"
                                ? `No ${filter} alerts at this time`
                                : "No items requiring your attention"}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredAlerts.map((alert) => (
                        <SmartAlertCard key={alert.id} alert={alert} />
                    ))}
                </div>
            )}
        </div>
    );
}
