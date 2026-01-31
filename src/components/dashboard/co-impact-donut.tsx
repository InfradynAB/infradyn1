"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import type { COBreakdown } from "@/lib/services/kpi-engine";

interface COImpactDonutProps {
    data: COBreakdown;
    currency?: string;
}

const COLORS = {
    scope: "#3b82f6", // Blue
    rate: "#f59e0b", // Amber
    quantity: "#8b5cf6", // Purple
    schedule: "#ef4444", // Red
};

const LABELS = {
    scope: "Scope Change",
    rate: "Rate Adjustment",
    quantity: "Quantity Variance",
    schedule: "Schedule Impact",
};

export function COImpactDonut({ data, currency = "USD" }: COImpactDonutProps) {
    const chartData = Object.entries(data)
        .filter(([key]) => key !== "total")
        .map(([key, value]) => ({
            name: LABELS[key as keyof typeof LABELS] || key,
            value: Math.abs(value as number),
            rawValue: value as number,
            key,
        }))
        .filter((item) => item.value > 0);

    const total = data.total;
    const hasData = chartData.length > 0;

    const formatCurrency = (value: number) => {
        if (value >= 1_000_000) {
            return `${currency} ${(value / 1_000_000).toFixed(2)}M`;
        }
        if (value >= 1_000) {
            return `${currency} ${(value / 1_000).toFixed(1)}K`;
        }
        return `${currency} ${value.toLocaleString()}`;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            Change Order Breakdown
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Impact by category
                        </p>
                    </div>
                    <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                            total > 0
                                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                                : total < 0
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                    >
                        {total >= 0 ? "+" : ""}
                        {formatCurrency(total)}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {hasData ? (
                    <div className="flex flex-col lg:flex-row items-center gap-6">
                        <div className="h-[250px] w-full lg:w-1/2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    COLORS[
                                                        entry.key as keyof typeof COLORS
                                                    ] || "#64748b"
                                                }
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const item = payload[0].payload;
                                                return (
                                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {item.name}
                                                        </p>
                                                        <p
                                                            className={`text-lg font-mono ${
                                                                item.rawValue > 0
                                                                    ? "text-red-600"
                                                                    : "text-emerald-600"
                                                            }`}
                                                        >
                                                            {item.rawValue >= 0 ? "+" : ""}
                                                            {formatCurrency(item.rawValue)}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {(
                                                                (item.value / Math.abs(total)) *
                                                                100
                                                            ).toFixed(1)}
                                                            % of total CO impact
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Breakdown List */}
                        <div className="w-full lg:w-1/2 space-y-3">
                            {chartData.map((item) => {
                                const percentage =
                                    Math.abs(total) > 0
                                        ? (item.value / Math.abs(total)) * 100
                                        : 0;
                                return (
                                    <div
                                        key={item.key}
                                        className="flex items-center gap-3"
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{
                                                backgroundColor:
                                                    COLORS[
                                                        item.key as keyof typeof COLORS
                                                    ] || "#64748b",
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                                    {item.name}
                                                </span>
                                                <span
                                                    className={`text-sm font-mono ${
                                                        item.rawValue > 0
                                                            ? "text-red-600"
                                                            : "text-emerald-600"
                                                    }`}
                                                >
                                                    {item.rawValue >= 0 ? "+" : ""}
                                                    {formatCurrency(item.rawValue)}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor:
                                                            COLORS[
                                                                item.key as keyof typeof COLORS
                                                            ] || "#64748b",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                        <div className="text-center">
                            <p className="text-lg font-medium">No Change Orders</p>
                            <p className="text-sm mt-1">
                                All work is within original scope
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
