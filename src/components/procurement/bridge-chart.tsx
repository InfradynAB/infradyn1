"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendUp, TrendDown, Equals, ChartBar } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface BridgeData {
    originalContract: number;
    additions: number;
    omissions: number;
    revisedTotal: number;
    variationOrders: Array<{
        voNumber: string;
        description: string;
        amount: number;
        status: string;
    }>;
}

interface BridgeChartProps {
    projectId: string;
    className?: string;
}

export function BridgeChart({ projectId, className }: BridgeChartProps) {
    const [data, setData] = useState<BridgeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch(`/api/projects/${projectId}/contract-summary`);
                const result = await response.json();

                if (result.success) {
                    setData(result.data);
                } else {
                    setError(result.error);
                }
            } catch (err) {
                setError("Failed to load contract summary");
            } finally {
                setLoading(false);
            }
        }

        if (projectId) {
            fetchData();
        }
    }, [projectId]);

    if (loading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ChartBar className="h-5 w-5" />
                        Contract Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{error || "No data available"}</p>
                </CardContent>
            </Card>
        );
    }

    const maxValue = Math.max(data.originalContract, data.revisedTotal) * 1.1;
    const getBarHeight = (value: number) => Math.max((value / maxValue) * 100, 5);

    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(2)}M`;
        } else if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}K`;
        }
        return `$${value.toLocaleString()}`;
    };

    const netChange = data.additions - data.omissions;
    const changePercent = data.originalContract > 0
        ? ((netChange / data.originalContract) * 100).toFixed(1)
        : "0";

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ChartBar className="h-5 w-5" />
                            Contract Summary
                        </CardTitle>
                        <CardDescription>
                            Original + Additions - Omissions = Revised
                        </CardDescription>
                    </div>
                    <Badge
                        variant={netChange >= 0 ? "default" : "secondary"}
                        className={cn(
                            netChange > 0 && "bg-amber-500",
                            netChange < 0 && "bg-green-500"
                        )}
                    >
                        {netChange >= 0 ? "+" : ""}{changePercent}%
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {/* Bridge Chart */}
                <div className="flex items-end justify-between gap-3 h-48 mb-4">
                    {/* Original Contract */}
                    <div className="flex-1 flex flex-col items-center">
                        <div
                            className="w-full bg-slate-600 rounded-t-lg transition-all duration-500 flex items-end justify-center pb-2"
                            style={{ height: `${getBarHeight(data.originalContract)}%` }}
                        >
                            <span className="text-white text-xs font-semibold">
                                {formatCurrency(data.originalContract)}
                            </span>
                        </div>
                        <p className="text-xs text-center mt-2 text-muted-foreground">Original</p>
                    </div>

                    {/* Additions */}
                    <div className="flex-1 flex flex-col items-center">
                        <div className="flex items-center text-green-600 mb-1">
                            <TrendUp size={16} weight="bold" />
                        </div>
                        <div
                            className="w-full bg-green-500 rounded-t-lg transition-all duration-500 flex items-end justify-center pb-2"
                            style={{ height: `${getBarHeight(data.additions)}%` }}
                        >
                            {data.additions > 0 && (
                                <span className="text-white text-xs font-semibold">
                                    +{formatCurrency(data.additions)}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-center mt-2 text-muted-foreground">Additions</p>
                    </div>

                    {/* Omissions */}
                    <div className="flex-1 flex flex-col items-center">
                        <div className="flex items-center text-red-600 mb-1">
                            <TrendDown size={16} weight="bold" />
                        </div>
                        <div
                            className="w-full bg-red-500 rounded-t-lg transition-all duration-500 flex items-end justify-center pb-2"
                            style={{ height: `${getBarHeight(data.omissions)}%` }}
                        >
                            {data.omissions > 0 && (
                                <span className="text-white text-xs font-semibold">
                                    -{formatCurrency(data.omissions)}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-center mt-2 text-muted-foreground">Omissions</p>
                    </div>

                    {/* Equals Sign */}
                    <div className="flex items-center justify-center px-2">
                        <Equals size={20} className="text-muted-foreground" />
                    </div>

                    {/* Revised Total */}
                    <div className="flex-1 flex flex-col items-center">
                        <div
                            className={cn(
                                "w-full rounded-t-lg transition-all duration-500 flex items-end justify-center pb-2",
                                netChange > 0 ? "bg-amber-500" : netChange < 0 ? "bg-green-600" : "bg-slate-600"
                            )}
                            style={{ height: `${getBarHeight(data.revisedTotal)}%` }}
                        >
                            <span className="text-white text-xs font-semibold">
                                {formatCurrency(data.revisedTotal)}
                            </span>
                        </div>
                        <p className="text-xs text-center mt-2 text-muted-foreground font-medium">Revised</p>
                    </div>
                </div>

                {/* Variation Orders List */}
                {data.variationOrders.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                        <p className="text-sm font-medium mb-2">Variation Orders ({data.variationOrders.length})</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {data.variationOrders.map((vo, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            {vo.voNumber}
                                        </Badge>
                                        <span className="text-muted-foreground truncate max-w-[150px]">
                                            {vo.description || "No description"}
                                        </span>
                                    </div>
                                    <span className="font-medium text-green-600">
                                        +{formatCurrency(vo.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary */}
                <div className="grid grid-cols-4 gap-2 pt-4 border-t mt-4">
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Original</p>
                        <p className="text-sm font-semibold">{formatCurrency(data.originalContract)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Additions</p>
                        <p className="text-sm font-semibold text-green-600">+{formatCurrency(data.additions)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Omissions</p>
                        <p className="text-sm font-semibold text-red-600">-{formatCurrency(data.omissions)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Revised</p>
                        <p className="text-sm font-semibold">{formatCurrency(data.revisedTotal)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
