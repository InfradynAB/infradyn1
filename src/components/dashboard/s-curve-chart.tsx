"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import type { SCurveDataPoint } from "@/lib/services/kpi-engine";

interface SCurveChartProps {
    data: SCurveDataPoint[];
    currency?: string;
}

const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
        return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toLocaleString();
};

export function SCurveChart({ data, currency = "USD" }: SCurveChartProps) {
    // Find today's position for reference line
    const today = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const hasCurrentMonth = data.some((d) => d.month.startsWith(today.slice(0, 7)));

    // Calculate variance percentage for the latest data point
    const latestPoint = data[data.length - 1];
    const variance = latestPoint
        ? ((latestPoint.actualCumulative - latestPoint.plannedCumulative) /
              latestPoint.plannedCumulative) *
          100
        : 0;

    return (
        <Card className="col-span-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            S-Curve: Planned vs Actual Spend
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Cumulative cash flow over project timeline
                        </p>
                    </div>
                    {latestPoint && (
                        <div
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                                variance < 0
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                                    : variance > 5
                                      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            }`}
                        >
                            {variance >= 0 ? "+" : ""}
                            {variance.toFixed(1)}% variance
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e2e8f0"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 12, fill: "#64748b" }}
                                tickFormatter={(value) => {
                                    // Format YYYY-MM to Mon YY
                                    const [year, month] = value.split("-");
                                    const date = new Date(parseInt(year), parseInt(month) - 1);
                                    return date.toLocaleDateString("en-US", {
                                        month: "short",
                                        year: "2-digit",
                                    });
                                }}
                                axisLine={{ stroke: "#cbd5e1" }}
                                tickLine={{ stroke: "#cbd5e1" }}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: "#64748b" }}
                                tickFormatter={(value) => formatCurrency(value)}
                                axisLine={{ stroke: "#cbd5e1" }}
                                tickLine={{ stroke: "#cbd5e1" }}
                                width={80}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const [year, month] = label.split("-");
                                        const date = new Date(
                                            parseInt(year),
                                            parseInt(month) - 1
                                        );
                                        const formattedDate = date.toLocaleDateString("en-US", {
                                            month: "long",
                                            year: "numeric",
                                        });
                                        return (
                                            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                                                    {formattedDate}
                                                </p>
                                                {payload.map((entry, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex justify-between gap-4 text-sm"
                                                    >
                                                        <span
                                                            style={{ color: entry.color }}
                                                            className="font-medium"
                                                        >
                                                            {entry.name}:
                                                        </span>
                                                        <span className="font-mono text-slate-600 dark:text-slate-300">
                                                            {currency}{" "}
                                                            {Number(entry.value).toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: 20 }}
                                iconType="line"
                                formatter={(value) => (
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        {value}
                                    </span>
                                )}
                            />
                            {hasCurrentMonth && (
                                <ReferenceLine
                                    x={today}
                                    stroke="#64748b"
                                    strokeDasharray="5 5"
                                    label={{
                                        value: "Today",
                                        position: "top",
                                        fill: "#64748b",
                                        fontSize: 12,
                                    }}
                                />
                            )}
                            <Line
                                type="monotone"
                                dataKey="plannedCumulative"
                                name="Planned Spend"
                                stroke="#94a3b8"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                activeDot={{ r: 4, fill: "#94a3b8" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="actualCumulative"
                                name="Actual Paid"
                                stroke="#059669"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6, fill: "#059669" }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
                    {latestPoint && (
                        <>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                    Planned (Cumulative)
                                </p>
                                <p className="text-lg font-mono font-semibold text-slate-500">
                                    {currency}{" "}
                                    {latestPoint.plannedCumulative.toLocaleString()}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                    Actual (Cumulative)
                                </p>
                                <p className="text-lg font-mono font-semibold text-emerald-600">
                                    {currency}{" "}
                                    {latestPoint.actualCumulative.toLocaleString()}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Variance</p>
                                <p
                                    className={`text-lg font-mono font-semibold ${
                                        variance < 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                >
                                    {variance >= 0 ? "+" : ""}
                                    {currency}{" "}
                                    {Math.abs(
                                        latestPoint.actualCumulative -
                                            latestPoint.plannedCumulative
                                    ).toLocaleString()}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                    Cost Performance
                                </p>
                                <p
                                    className={`text-lg font-mono font-semibold ${
                                        variance <= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                >
                                    {latestPoint.plannedCumulative > 0
                                        ? (
                                              latestPoint.plannedCumulative /
                                              Math.max(latestPoint.actualCumulative, 1)
                                          ).toFixed(2)
                                        : "N/A"}{" "}
                                    CPI
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
