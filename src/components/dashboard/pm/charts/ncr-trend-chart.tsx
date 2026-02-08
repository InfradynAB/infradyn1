"use client";

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

export interface NCRTrendPoint {
    month: string;
    opened: number;
    closed: number;
    critical: number;
}

interface Props {
    data: NCRTrendPoint[];
}

function NCRTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-card border border-border/60 rounded-xl p-3 shadow-xl text-xs">
            <p className="font-bold text-sm mb-2">{label}</p>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-muted-foreground">{p.name}:</span>
                    <span className="font-bold font-mono">{p.value}</span>
                </div>
            ))}
        </div>
    );
}

export function NCRTrendChart({ data }: Props) {
    const avgOpened = data.length > 0 ? data.reduce((s, d) => s + d.opened, 0) / data.length : 0;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">NCR Trend (12 Months)</h3>
                <div className="flex items-center gap-4">
                    {[
                        { label: "Opened", color: "#F59E0B" },
                        { label: "Closed", color: "#10B981" },
                        { label: "Critical", color: "#EF4444" },
                    ].map((l) => (
                        <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                            {l.label}
                        </div>
                    ))}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<NCRTooltip />} />
                    <Legend wrapperStyle={{ display: "none" }} />
                    <ReferenceLine y={avgOpened} stroke="#64748B" strokeDasharray="6 4" strokeWidth={1} label={{ value: `Avg (${avgOpened.toFixed(1)})`, position: "insideTopRight", fontSize: 10, fill: "#64748B" }} />
                    <Line type="monotone" dataKey="opened" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3.5, fill: "#F59E0B", stroke: "#FFF", strokeWidth: 1.5 }} activeDot={{ r: 5.5 }} name="Opened" />
                    <Line type="monotone" dataKey="closed" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3.5, fill: "#10B981", stroke: "#FFF", strokeWidth: 1.5 }} activeDot={{ r: 5.5 }} name="Closed" />
                    <Line type="monotone" dataKey="critical" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: "#EF4444", stroke: "#FFF", strokeWidth: 1.5 }} activeDot={{ r: 5 }} name="Critical" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
