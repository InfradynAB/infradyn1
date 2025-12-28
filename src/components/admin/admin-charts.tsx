"use client";

import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Area,
    AreaChart,
} from "recharts";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
}

export function ChartContainer({ title, subtitle, children, className, action }: ChartContainerProps) {
    return (
        <div className={cn("rounded-2xl border bg-card p-6", className)}>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-lg">{title}</h3>
                    {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

// Color palette
const COLORS = {
    primary: "#3b82f6",
    secondary: "#8b5cf6",
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
    muted: "#94a3b8",
};

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

interface LineChartData {
    name: string;
    value: number;
    value2?: number;
}

interface AdminLineChartProps {
    data: LineChartData[];
    height?: number;
    showGrid?: boolean;
    color?: keyof typeof COLORS;
    secondaryColor?: keyof typeof COLORS;
    showSecondLine?: boolean;
}

export function AdminLineChart({
    data,
    height = 300,
    showGrid = true,
    color = "primary",
    secondaryColor = "secondary",
    showSecondLine = false,
}: AdminLineChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />}
                <XAxis dataKey="name" className="text-xs" tick={{ fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis className="text-xs" tick={{ fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        padding: "12px",
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[color]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS[color]} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorValue2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[secondaryColor]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS[secondaryColor]} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={COLORS[color]}
                    strokeWidth={2}
                    fill="url(#colorValue)"
                />
                {showSecondLine && (
                    <Area
                        type="monotone"
                        dataKey="value2"
                        stroke={COLORS[secondaryColor]}
                        strokeWidth={2}
                        fill="url(#colorValue2)"
                    />
                )}
            </AreaChart>
        </ResponsiveContainer>
    );
}

interface BarChartData {
    name: string;
    value: number;
}

interface AdminBarChartProps {
    data: BarChartData[];
    height?: number;
    color?: keyof typeof COLORS;
}

export function AdminBarChart({ data, height = 300, color = "primary" }: AdminBarChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis className="text-xs" tick={{ fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        padding: "12px",
                    }}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                />
                <Bar dataKey="value" fill={COLORS[color]} radius={[6, 6, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

interface PieChartData {
    name: string;
    value: number;
}

interface AdminPieChartProps {
    data: PieChartData[];
    height?: number;
    showLegend?: boolean;
}

export function AdminPieChart({ data, height = 300, showLegend = true }: AdminPieChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        padding: "12px",
                    }}
                />
                {showLegend && (
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                    />
                )}
            </PieChart>
        </ResponsiveContainer>
    );
}

export { COLORS, PIE_COLORS };
