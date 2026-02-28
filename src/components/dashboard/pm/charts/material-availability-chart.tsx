"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

export interface MaterialItem {
    name: string;
    ordered: number;
    delivered: number;
    installed: number;
    remaining: number;
}

interface Props {
    data: MaterialItem[];
}

function MatTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-card border border-border/60 rounded-xl p-3 shadow-xl text-xs">
            <p className="font-bold text-sm mb-2">{label}</p>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: p.color }} />
                    <span className="text-muted-foreground">{p.name}:</span>
                    <span className="font-bold font-sans tabular-nums">{p.value}</span>
                </div>
            ))}
        </div>
    );
}

export function MaterialAvailabilityChart({ data }: Props) {
    const totalOrdered = data.reduce((s, d) => s + d.ordered, 0);
    const totalDelivered = data.reduce((s, d) => s + d.delivered, 0);
    const availabilityPct = totalOrdered > 0 ? ((totalDelivered / totalOrdered) * 100).toFixed(1) : "0";

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Material Availability</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Overall:</span>
                    <span className="text-sm font-bold font-sans tabular-nums">{availabilityPct}%</span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(220, data.length * 44)}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<MatTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar dataKey="installed" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} name="Installed" barSize={20} />
                    <Bar dataKey="delivered" stackId="a" fill="#3B82F6" name="Delivered (not installed)" barSize={20} />
                    <Bar dataKey="remaining" stackId="a" fill="#E2E8F0" radius={[0, 4, 4, 0]} name="Remaining" barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
