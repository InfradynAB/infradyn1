"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export interface NCRMonthData {
    month: string;
    accepted: number;
    rejected: number;
    awaiting: number;
}

export function NCRStackedBars({ data }: { data: NCRMonthData[] }) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
                No NCR data available
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                    tickLine={false}
                    label={{ value: "Reporting Month", position: "bottom", offset: 15, style: { fontSize: 10 }, className: "fill-muted-foreground/60" }}
                />
                <YAxis
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                    tickLine={false}
                    allowDecimals={false}
                    label={{ value: "NCR Count", angle: -90, position: "insideLeft", offset: 0, style: { fontSize: 10 }, className: "fill-muted-foreground/60" }}
                />
                <Tooltip
                    content={({ payload, label }) => {
                        if (!payload?.length) return null;
                        return (
                            <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg space-y-0.5">
                                <p className="font-semibold">{label}</p>
                                {payload.map(p => (
                                    <div key={p.name} className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                        <span className="text-muted-foreground">{p.name}: {p.value}</span>
                                    </div>
                                ))}
                            </div>
                        );
                    }}
                />
                <Legend
                    iconSize={8}
                    wrapperStyle={{ fontSize: "10px" }}
                />
                <Bar dataKey="accepted" name="Accepted" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
                <Bar dataKey="awaiting" name="Awaiting Action" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                <Bar dataKey="rejected" name="Rejected" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
