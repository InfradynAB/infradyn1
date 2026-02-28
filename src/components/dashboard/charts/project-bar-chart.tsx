"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProjectProgress {
    id: string;
    name: string;
    physicalProgress: number;
    financialProgress: number;
    status: "on-track" | "at-risk" | "delayed";
    totalValue: number;
}

interface ProjectBarChartProps {
    data: ProjectProgress[];
    showFinancial?: boolean;
    onProjectClick?: (projectId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
    "on-track": "#22c55e",
    "at-risk": "#f59e0b",
    "delayed": "#ef4444",
};

function BarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ProjectProgress }> }) {
    if (active && payload?.[0]) {
        const p = payload[0].payload;
        return (
            <div className="bg-popover text-popover-foreground border rounded-lg shadow-xl px-3.5 py-2.5 text-sm">
                <p className="font-semibold mb-1">{p.name}</p>
                <div className="space-y-0.5 text-xs text-muted-foreground">
                    <p>Physical: <span className="font-sans tabular-nums font-medium text-foreground">{p.physicalProgress}%</span></p>
                    <p>Financial: <span className="font-sans tabular-nums font-medium text-foreground">{p.financialProgress}%</span></p>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[p.status] }} />
                    <span className="text-xs capitalize">{p.status.replace("-", " ")}</span>
                </div>
            </div>
        );
    }
    return null;
}

export function ProjectBarChart({ data, showFinancial = false, onProjectClick }: ProjectBarChartProps) {
    const sortedData = [...data].sort((a, b) => b.physicalProgress - a.physicalProgress);
    const avgProgress = sortedData.length > 0
        ? sortedData.reduce((sum, p) => sum + p.physicalProgress, 0) / sortedData.length
        : 0;
    const delayedCount = sortedData.filter(p => p.status === "delayed").length;

    return (
        <Card className="shadow-none border">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">Project Delivery Performance</CardTitle>
                        <CardDescription>
                            {showFinancial ? "Financial" : "Physical"} progress by project
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-sans tabular-nums text-xs">Avg {avgProgress.toFixed(0)}%</Badge>
                        {delayedCount > 0 && (
                            <Badge variant="destructive" className="text-xs">{delayedCount} Delayed</Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div style={{ height: Math.max(250, sortedData.length * 48) }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={sortedData}
                            layout="vertical"
                            margin={{ top: 0, right: 50, left: 10, bottom: 0 }}
                            barCategoryGap="20%"
                            onClick={(d) => {
                                if (d?.activePayload?.[0]?.payload) {
                                    onProjectClick?.(d.activePayload[0].payload.id);
                                }
                            }}
                        >
                            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={11} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                            <Tooltip content={<BarTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
                            <Bar
                                dataKey={showFinancial ? "financialProgress" : "physicalProgress"}
                                radius={[0, 6, 6, 0]}
                                className="cursor-pointer"
                                maxBarSize={28}
                            >
                                {sortedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status]} />
                                ))}
                                <LabelList
                                    dataKey={showFinancial ? "financialProgress" : "physicalProgress"}
                                    position="right"
                                    formatter={(v: number) => `${v}%`}
                                    className="fill-muted-foreground text-xs font-sans tabular-nums"
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t">
                    {(["on-track", "at-risk", "delayed"] as const).map((status) => (
                        <div key={status} className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS[status] }} />
                            <span className="text-xs text-muted-foreground capitalize">{status.replace("-", " ")}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
