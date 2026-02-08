"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PortfolioProject {
    id: string;
    name: string;
    spend: number;
    percentage: number;
    status: "on-track" | "at-risk" | "delayed";
}

interface PortfolioDonutProps {
    data: PortfolioProject[];
    totalSpend: number;
    currency?: string;
}

const COLORS = [
    "hsl(217, 91%, 60%)",
    "hsl(160, 84%, 39%)",
    "hsl(258, 90%, 66%)",
    "hsl(330, 81%, 60%)",
    "hsl(38, 92%, 50%)",
    "hsl(174, 72%, 56%)",
    "hsl(25, 95%, 53%)",
    "hsl(231, 70%, 58%)",
];

const STATUS_DOT: Record<string, string> = {
    "on-track": "bg-emerald-500",
    "at-risk": "bg-amber-500",
    "delayed": "bg-red-500",
};

const formatCurrency = (value: number, currency = "USD") => {
    if (value >= 1_000_000) return `${currency} ${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${currency} ${(value / 1_000).toFixed(1)}K`;
    return `${currency} ${value.toFixed(0)}`;
};

function DonutTooltip({ active, payload, currency = "USD" }: { active?: boolean; payload?: Array<{ payload: PortfolioProject & { fill: string } }>; currency?: string }) {
    if (active && payload?.[0]) {
        const p = payload[0].payload;
        return (
            <div className="bg-popover text-popover-foreground border rounded-lg shadow-xl px-3.5 py-2.5 text-sm">
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.fill }} />
                    <span className="font-semibold">{p.name}</span>
                </div>
                <p className="text-muted-foreground text-xs">{formatCurrency(p.spend, currency)} ({p.percentage.toFixed(1)}%)</p>
            </div>
        );
    }
    return null;
}

export function PortfolioDonut({ data, totalSpend, currency = "USD" }: PortfolioDonutProps) {
    const chartData = data.map((project, i) => ({
        ...project,
        fill: COLORS[i % COLORS.length],
    }));

    return (
        <Card className="shadow-none border">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Portfolio Overview</CardTitle>
                <CardDescription>% distribution of spend across projects</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-center">
                    {/* Donut */}
                    <div className="relative h-[230px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={64}
                                    outerRadius={98}
                                    paddingAngle={3}
                                    dataKey="spend"
                                    stroke="none"
                                    cornerRadius={5}
                                    animationBegin={0}
                                    animationDuration={800}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} className="drop-shadow-sm" />
                                    ))}
                                </Pie>
                                <Tooltip content={<DonutTooltip currency={currency} />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total Spend</span>
                            <span className="text-2xl font-bold font-mono tracking-tight mt-0.5">
                                {formatCurrency(totalSpend, currency)}
                            </span>
                            <span className="text-xs text-muted-foreground mt-0.5">{data.length} Projects</span>
                        </div>
                    </div>

                    {/* Legend list */}
                    <div className="space-y-1 max-h-[230px] overflow-y-auto">
                        {chartData.map((entry) => (
                            <div
                                key={entry.id}
                                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted/60 transition-colors cursor-default group"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-3 h-3 rounded-full shrink-0 ring-2 ring-background" style={{ backgroundColor: entry.fill }} />
                                    <span className="text-sm truncate font-medium">{entry.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[entry.status])} />
                                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                                        {entry.percentage.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
