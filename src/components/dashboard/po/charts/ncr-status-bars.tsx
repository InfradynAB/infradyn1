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

export interface NCRSeverityData {
  severity: "Minor" | "Major" | "Critical";
  open: number;
  inProgress: number;
  closed: number;
}

const COLORS = {
  open: "#EF4444",
  inProgress: "#F59E0B",
  closed: "#22C55E",
};

export function NCRStatusBars({ data }: { data: NCRSeverityData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No NCRs linked to this PO.
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="severity"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
              color: "hsl(var(--popover-foreground))",
              fontSize: 12,
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <Bar
            dataKey="open"
            name="Open"
            stackId="a"
            fill={COLORS.open}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="inProgress"
            name="In Progress"
            stackId="a"
            fill={COLORS.inProgress}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="closed"
            name="Closed"
            stackId="a"
            fill={COLORS.closed}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
