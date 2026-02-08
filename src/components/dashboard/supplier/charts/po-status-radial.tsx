"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export interface POStatusData {
    delivered: { count: number; value: number };
    pending: { count: number; value: number };
    overdue: { count: number; value: number };
    inProgress: { count: number; value: number };
    total: { count: number; value: number };
}

const COLORS = {
    delivered: "#22C55E",
    inProgress: "#3B82F6",
    pending: "#F59E0B",
    overdue: "#EF4444",
};

export function POStatusRadial({ data }: { data: POStatusData }) {
    const segments = [
        { name: "Delivered", value: data.delivered.count, color: COLORS.delivered, amount: data.delivered.value },
        { name: "In Progress", value: data.inProgress.count, color: COLORS.inProgress, amount: data.inProgress.value },
        { name: "Pending", value: data.pending.count, color: COLORS.pending, amount: data.pending.value },
        { name: "Overdue", value: data.overdue.count, color: COLORS.overdue, amount: data.overdue.value },
    ].filter(s => s.value > 0);

    if (segments.length === 0) {
        segments.push({ name: "No POs", value: 1, color: "#6B7280", amount: 0 });
    }

    const deliveredPct = data.total.count > 0
        ? Math.round((data.delivered.count / data.total.count) * 100)
        : 0;

    return (
        <div className="relative">
            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={segments}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={105}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                        animationBegin={0}
                        animationDuration={800}
                    >
                        {segments.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={({ payload }) => {
                            if (!payload?.[0]) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg">
                                    <p className="font-semibold">{d.name}</p>
                                    <p className="text-muted-foreground">{d.value} POs · ${d.amount?.toLocaleString()}</p>
                                </div>
                            );
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold font-mono tabular-nums">{data.total.count}</span>
                <span className="text-[11px] text-muted-foreground font-medium">Total POs</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">{deliveredPct}% delivered</span>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                {[
                    { label: "Delivered", color: COLORS.delivered, count: data.delivered.count },
                    { label: "In Progress", color: COLORS.inProgress, count: data.inProgress.count },
                    { label: "Pending", color: COLORS.pending, count: data.pending.count },
                    { label: "Overdue", color: COLORS.overdue, count: data.overdue.count },
                ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                        {l.label} ({l.count})
                    </div>
                ))}
            </div>
        </div>
    );
}
