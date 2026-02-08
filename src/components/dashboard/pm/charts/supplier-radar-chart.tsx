"use client";

import {
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from "recharts";

export interface SupplierScorecard {
    supplierId: string;
    supplierName: string;
    delivery: number;   // 0-100
    quality: number;     // 0-100
    compliance: number;  // 0-100
    communication: number; // 0-100
    pricing: number;     // 0-100
    overall: number;     // calculated 0-100
}

interface Props {
    suppliers: SupplierScorecard[];
    maxDisplayed?: number;
}

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

function RadarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }> }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-card border border-border/60 rounded-xl p-3 shadow-xl text-xs">
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

export function SupplierRadarChart({ suppliers, maxDisplayed = 3 }: Props) {
    const displayed = suppliers.slice(0, maxDisplayed);

    const dimensions = ["delivery", "quality", "compliance", "communication", "pricing"] as const;
    const labels: Record<string, string> = {
        delivery: "Delivery",
        quality: "Quality",
        compliance: "Compliance",
        communication: "Communication",
        pricing: "Pricing",
    };

    const chartData = dimensions.map((dim) => {
        const point: Record<string, string | number> = { dimension: labels[dim] };
        for (const s of displayed) point[s.supplierName] = s[dim];
        return point;
    });

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Supplier Reliability</h3>
                <div className="flex items-center gap-3">
                    {displayed.map((s, i) => (
                        <div key={s.supplierId} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            {s.supplierName} ({s.overall})
                        </div>
                    ))}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
                    <PolarGrid stroke="currentColor" opacity={0.1} />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} axisLine={false} />
                    <Tooltip content={<RadarTooltip />} />
                    <Legend wrapperStyle={{ display: "none" }} />
                    {displayed.map((s, i) => (
                        <Radar
                            key={s.supplierId}
                            name={s.supplierName}
                            dataKey={s.supplierName}
                            stroke={COLORS[i % COLORS.length]}
                            fill={COLORS[i % COLORS.length]}
                            fillOpacity={0.12}
                            strokeWidth={2}
                            dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
                        />
                    ))}
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
