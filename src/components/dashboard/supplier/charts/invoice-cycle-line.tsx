"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

export interface InvoiceCyclePoint {
    id: string;
    invoiceNumber: string;
    submittedDate: string;
    daysToApproval: number;
    amount: number;
    status: string;
}

const TARGET_DAYS = 14;

export function InvoiceCycleLine({ data }: { data: InvoiceCyclePoint[] }) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
                No invoice data available
            </div>
        );
    }

    const chartData = data.map(d => ({
        ...d,
        date: new Date(d.submittedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    }));

    const avgDays = Math.round(data.reduce((s, d) => s + d.daysToApproval, 0) / data.length);

    return (
        <div>
            <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-5 h-0.5 bg-blue-500 rounded-full" />
                    Days to Approval
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-5 h-0.5 bg-red-400 rounded-full border-dashed" style={{ borderTop: "1px dashed" }} />
                    Target ({TARGET_DAYS}d)
                </div>
                <span className="ml-auto text-[10px] font-semibold text-muted-foreground">
                    Avg: <span className={avgDays <= TARGET_DAYS ? "text-emerald-600" : "text-amber-600"}>{avgDays}d</span>
                </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        className="fill-muted-foreground"
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 10 }}
                        className="fill-muted-foreground"
                        tickLine={false}
                        label={{ value: "Days", angle: -90, position: "insideLeft", style: { fontSize: 10 }, className: "fill-muted-foreground" }}
                    />
                    <ReferenceLine
                        y={TARGET_DAYS}
                        stroke="#EF4444"
                        strokeDasharray="6 4"
                        strokeWidth={1.5}
                    />
                    <Tooltip
                        content={({ payload }) => {
                            if (!payload?.[0]) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg space-y-0.5">
                                    <p className="font-semibold">{d.invoiceNumber}</p>
                                    <p className="text-muted-foreground">{d.daysToApproval} days to approval</p>
                                    <p className="text-muted-foreground">${d.amount?.toLocaleString()}</p>
                                </div>
                            );
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="daysToApproval"
                        stroke="#3B82F6"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6, stroke: "#3B82F6", strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
