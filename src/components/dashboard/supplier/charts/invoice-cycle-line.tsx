"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export interface InvoiceCyclePoint {
    id: string;
    invoiceNumber: string;
    submittedDate: string;
    daysToApproval: number;
    amount: number;
    status: string;
}

const TARGET_DAYS = 14;

export function InvoiceCycleLine({ data }: { data: InvoiceCyclePoint[] }) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
                No invoice data available
            </div>
        );
    }

    const chartData = data.map(d => ({
        ...d,
        date: new Date(d.submittedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    }));

    const avgDays = Math.round(data.reduce((s, d) => s + d.daysToApproval, 0) / data.length);
    const bestDays = Math.min(...data.map(d => d.daysToApproval));
    const worstDays = Math.max(...data.map(d => d.daysToApproval));
    const targetMetCount = data.filter(d => d.daysToApproval <= TARGET_DAYS).length;
    const targetMetPct = Math.round((targetMetCount / data.length) * 100);
    const lastPoint = data[data.length - 1];

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="w-5 h-0.5 bg-blue-500 rounded-full" />
                        Days to Approval
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="w-5 h-0.5 bg-red-400 rounded-full border-dashed" style={{ borderTop: "1px dashed" }} />
                        Target ({TARGET_DAYS}d)
                    </div>
                    <span className="ml-auto text-[10px] font-semibold text-muted-foreground">
                        Avg: <span className={avgDays <= TARGET_DAYS ? "text-emerald-600" : "text-amber-600"}>{avgDays}d</span>
                    </span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            className="fill-muted-foreground"
                            tickLine={false}
                            label={{ value: "Submission Date", position: "bottom", offset: 15, style: { fontSize: 10 }, className: "fill-muted-foreground/60" }}
                        />
                        <YAxis
                            tick={{ fontSize: 10 }}
                            className="fill-muted-foreground"
                            tickLine={false}
                            label={{ value: "Days", angle: -90, position: "insideLeft", offset: 0, style: { fontSize: 10 }, className: "fill-muted-foreground/60" }}
                        />
                        <ReferenceLine
                            y={TARGET_DAYS}
                            stroke="#EF4444"
                            strokeDasharray="6 4"
                            strokeWidth={1.5}
                        />
                        <Tooltip
                            content={({ payload }) => {
                                if (!payload?.[0]) return null;
                                const d = payload[0].payload;
                                return (
                                    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg space-y-0.5">
                                        <p className="font-semibold">{d.invoiceNumber}</p>
                                        <p className="text-muted-foreground">{d.daysToApproval} days to approval</p>
                                        <p className="text-muted-foreground">${d.amount?.toLocaleString()}</p>
                                    </div>
                                );
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="daysToApproval"
                            stroke="#3B82F6"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6, stroke: "#3B82F6", strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="pt-4 border-t border-border/40 space-y-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">i</span>
                    </div>
                    <h4 className="text-xs font-bold">Cycle Insights</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Compliance</p>
                        <p className="text-sm font-bold">{targetMetPct}% <span className="text-[10px] font-normal text-muted-foreground">invoices meet {TARGET_DAYS}d target</span></p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Speed Records</p>
                        <p className="text-sm font-bold">{bestDays}d <span className="text-[10px] font-normal text-muted-foreground">Fastest / </span>{worstDays}d <span className="text-[10px] font-normal text-muted-foreground">Slowest</span></p>
                    </div>
                </div>

                <div className="rounded-xl bg-muted/30 p-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        Your latest invoice (<span className="font-semibold text-foreground">{lastPoint.invoiceNumber}</span>) was approved in <span className={cn("font-bold", lastPoint.daysToApproval <= TARGET_DAYS ? "text-emerald-600" : "text-amber-600")}>{lastPoint.daysToApproval} days</span>.
                        {lastPoint.daysToApproval > TARGET_DAYS
                            ? ` This is ${lastPoint.daysToApproval - TARGET_DAYS} days over the target. Look for bottlenecks in the approval chain.`
                            : " This is currently on track with organizational targets."}
                    </p>
                </div>
            </div>
        </div>
    );
}
