"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface SupplierTrendPoint {
    month: string;
    [supplierName: string]: string | number;
}

interface SupplierTrendChartProps {
    data: SupplierTrendPoint[];
    suppliers: { name: string; color: string }[];
}

const DEFAULT_COLORS = [
    "hsl(217, 91%, 60%)",
    "hsl(160, 84%, 39%)",
    "hsl(258, 90%, 66%)",
    "hsl(330, 81%, 60%)",
    "hsl(38, 92%, 50%)",
];

export function SupplierTrendChart({ data, suppliers }: SupplierTrendChartProps) {
    const supplierList = suppliers.length > 0
        ? suppliers
        : data.length > 0
            ? Object.keys(data[0])
                .filter(k => k !== "month")
                .map((name, i) => ({ name, color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] }))
            : [];

    return (
        <Card className="shadow-none border">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Supplier Performance Trend</CardTitle>
                <CardDescription>Top suppliers by delivery score over time</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                                dataKey="month"
                                fontSize={11}
                                stroke="hsl(var(--muted-foreground))"
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                domain={[0, 100]}
                                fontSize={11}
                                stroke="hsl(var(--muted-foreground))"
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => `${v}`}
                                width={30}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    return (
                                        <div className="bg-popover text-popover-foreground border rounded-lg shadow-xl px-3.5 py-2.5 text-sm">
                                            <p className="font-semibold mb-1.5">{label}</p>
                                            {payload.map((entry, i) => (
                                                <div key={i} className="flex items-center justify-between gap-4 text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                        <span className="text-muted-foreground">{entry.name}</span>
                                                    </div>
                                                    <span className="font-mono font-medium">{Number(entry.value).toFixed(0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: 12 }}
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
                            />
                            {supplierList.map((supplier) => (
                                <Line
                                    key={supplier.name}
                                    type="monotone"
                                    dataKey={supplier.name}
                                    stroke={supplier.color}
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--background))" }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
