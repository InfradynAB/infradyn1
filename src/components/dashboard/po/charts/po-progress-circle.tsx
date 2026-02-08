"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface POProgressData {
  deliveredValue: number;
  pendingValue: number;
  invoicedValue: number;
  paidValue: number;
  totalValue: number;
  progressPercent: number;
}

const COLORS = ["#22C55E", "#3B82F6", "#8B5CF6", "#6B7280"];

export function POProgressCircle({ data }: { data: POProgressData }) {
  const segments = [
    { name: "Delivered", value: data.deliveredValue, color: COLORS[0] },
    { name: "Invoiced", value: data.invoicedValue, color: COLORS[2] },
    { name: "Pending", value: data.pendingValue, color: COLORS[1] },
  ].filter((s) => s.value > 0);

  if (segments.length === 0) {
    segments.push({ name: "No Data", value: 1, color: COLORS[3] });
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[220px] w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {segments.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => fmt(value)}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold">{Math.round(data.progressPercent)}%</span>
          <span className="text-[11px] text-muted-foreground">Complete</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-xs">
        {segments.filter((s) => s.name !== "No Data").map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-muted-foreground">{s.name}</span>
            <span className="font-medium">{fmt(s.value)}</span>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs text-center text-xs">
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="font-semibold text-sm">{fmt(data.paidValue)}</div>
          <div className="text-muted-foreground">Paid</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="font-semibold text-sm">{fmt(data.totalValue)}</div>
          <div className="text-muted-foreground">Total Value</div>
        </div>
      </div>
    </div>
  );
}
