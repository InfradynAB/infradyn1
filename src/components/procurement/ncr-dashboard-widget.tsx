"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, TrendingUp, ExternalLink } from "lucide-react";
import { HelpTooltip, TOOLTIPS } from "@/components/ui/help-tooltip";

interface NCRDashboardData {
    total: number;
    openCount: number;
    criticalOpen: number;
    overdueCount: number;
    supplierRatings: Array<{ name: string; count: number }>;
}

export function NCRDashboardWidget() {
    const [data, setData] = useState<NCRDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // organizationId is resolved server-side from the session
            const res = await fetch("/api/ncr");
            const result = await res.json();
            if (result.success && result.data) {
                setData(result.data);
            }
        } catch (error) {
            console.error("Failed to fetch NCR data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Quality Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="animate-pulse space-y-2">
                                <div className="h-4 bg-muted rounded w-20" />
                                <div className="h-8 bg-muted rounded w-12" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.total === 0) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">Quality Overview</CardTitle>
                        <HelpTooltip content={TOOLTIPS.ncr} />
                    </div>
                    <CardDescription>
                        Track quality issues with materials or work
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-medium text-muted-foreground">No NCRs recorded yet</p>
                    <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
                        Non-Conformance Reports (NCRs) help track when materials or work don&apos;t meet quality standards. They&apos;ll appear here when created from purchase orders.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <CardTitle className="text-lg">Quality Overview</CardTitle>
                        <HelpTooltip content={TOOLTIPS.ncr} />
                    </div>
                    {data.criticalOpen > 0 && (
                        <Badge variant="destructive" className="animate-pulse">
                            {data.criticalOpen} Critical Issue{data.criticalOpen !== 1 ? 's' : ''}
                        </Badge>
                    )}
                </div>
                <CardDescription>
                    Track and resolve quality issues across your projects
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                    {/* Total NCRs */}
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total NCRs</p>
                        <p className="text-2xl font-bold">{data.total}</p>
                        <p className="text-xs text-muted-foreground">
                            {data.openCount} open
                        </p>
                    </div>

                    {/* Critical Open */}
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            Critical
                        </p>
                        <p className={`text-2xl font-bold ${data.criticalOpen > 0 ? "text-red-500" : ""}`}>
                            {data.criticalOpen}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Requires immediate action
                        </p>
                    </div>

                    {/* Overdue */}
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3 text-orange-500" />
                            Overdue
                        </p>
                        <p className={`text-2xl font-bold ${data.overdueCount > 0 ? "text-orange-500" : ""}`}>
                            {data.overdueCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Past SLA deadline
                        </p>
                    </div>

                    {/* Resolution Rate */}
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            Resolved
                        </p>
                        <p className="text-2xl font-bold text-green-500">
                            {data.total > 0
                                ? Math.round(((data.total - data.openCount) / data.total) * 100)
                                : 100}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {data.total - data.openCount} of {data.total} closed
                        </p>
                    </div>
                </div>

                {/* Top Problem Suppliers */}
                {data.supplierRatings && data.supplierRatings.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                            Suppliers with Most NCRs
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {data.supplierRatings.slice(0, 3).map((s, i) => (
                                <Badge
                                    key={i}
                                    variant="outline"
                                    className={i === 0 ? "border-red-300 bg-red-50" : ""}
                                >
                                    {s.name}: {s.count}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
