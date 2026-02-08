"use client";

import { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
} from "recharts";

export interface WaterfallItem {
    name: string;
    value: number;
    type: "start" | "increase" | "decrease" | "total";
}

interface Props {
    data: WaterfallItem[];
}

function WaterfallTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WaterfallItem & { displayValue: number; bottom: number } }> }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const fmt = (n: number) => {
        const abs = Math.abs(n);
        if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
        if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
        return `$${n.toFixed(0)}`;
    };
    return (
        <div className="bg-card border border-border/60 rounded-xl p-3 shadow-xl text-xs">
            <p className="font-bold text-sm mb-1">{d.name}</p>
            <p className="text-muted-foreground">
                {d.type === "increase" ? "+" : d.type === "decrease" ? "-" : ""}
                {fmt(Math.abs(d.value))}
            </p>
        </div>
    );
}

export function CostWaterfallChart({ data }: Props) {
    // Compute cumulative positions for stacked waterfall
    const processed = useMemo(() => {
        const result: Array<WaterfallItem & { bottom: number; displayValue: number }> = [];
        data.reduce((cum, item) => {
            if (item.type === "start" || item.type === "total") {
                result.push({ ...item, bottom: 0, displayValue: item.value });
                return item.value;
            }
            if (item.type === "increase") {
                result.push({ ...item, bottom: cum, displayValue: item.value });
                return cum + item.value;
            }
            // decrease
            const next = cum - Math.abs(item.value);
            result.push({ ...item, bottom: next, displayValue: Math.abs(item.value) });
            return next;
        }, 0);
        return result;
    }, [data]);

    const colorMap: Record<string, string> = {
        start: "#3B82F6",      // blue
        increase: "#F59E0B",   // amber
        decrease: "#10B981",   // emerald
        total: "#8B5CF6",      // violet
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Cost Exposure Waterfall</h3>
                <div className="flex items-center gap-3">
                    {[
                        { label: "Base", color: "#3B82F6" },
                        { label: "Add", color: "#F59E0B" },
                        { label: "Deduct", color: "#10B981" },
                        { label: "Total", color: "#8B5CF6" },
                    ].map((l) => (
                        <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: l.color }} />
                            {l.label}
                        </div>
                    ))}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={processed} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K` : `$${v}`} />
                    <Tooltip content={<WaterfallTooltip />} />
                    <ReferenceLine y={0} stroke="#E2E8F0" />
                    {/* Invisible bar for the bottom offset */}
                    <Bar dataKey="bottom" stackId="waterfall" fill="transparent" />
                    <Bar dataKey="displayValue" stackId="waterfall" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {processed.map((entry, i) => (
                            <Cell key={i} fill={colorMap[entry.type]} opacity={0.9} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
