"use client";

import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, Warning, HourglassMedium, Clock, CurrencyDollar, CalendarBlank } from "@phosphor-icons/react";

interface Milestone {
    id: string;
    title: string;
    poNumber: string;
    expectedDate: string;
    amount: number;
    status: string;
    paymentPercentage: number;
}

interface MilestoneGanttProps {
    milestones: Milestone[];
}

type StatusKey = "completed" | "submitted" | "pending" | "overdue";

const STATUS_CONFIG: Record<StatusKey, {
    bg: string;
    text: string;
    border: string;
    icon: React.ElementType;
    label: string;
    gradient: string;
}> = {
    completed: {
        bg: "bg-emerald-100 dark:bg-emerald-500/20",
        text: "text-emerald-700 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-500/30",
        icon: CheckCircle,
        label: "Completed",
        gradient: "from-emerald-400 to-emerald-600"
    },
    submitted: {
        bg: "bg-blue-100 dark:bg-blue-500/20",
        text: "text-blue-700 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-500/30",
        icon: Clock,
        label: "Submitted",
        gradient: "from-blue-400 to-blue-600"
    },
    pending: {
        bg: "bg-amber-100 dark:bg-amber-500/20",
        text: "text-amber-700 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-500/30",
        icon: HourglassMedium,
        label: "Pending",
        gradient: "from-amber-400 to-amber-500"
    },
    overdue: {
        bg: "bg-red-100 dark:bg-red-500/20",
        text: "text-red-700 dark:text-red-400",
        border: "border-red-200 dark:border-red-500/30",
        icon: Warning,
        label: "Overdue",
        gradient: "from-red-400 to-red-600"
    },
};

function fmtMoney(n: number) {
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return `$${n}`;
}

export function MilestoneGantt({ milestones }: MilestoneGanttProps) {
    if (milestones.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-sm text-muted-foreground gap-3">
                <CalendarBlank className="w-10 h-10 opacity-20" />
                <p>No milestones tracked</p>
            </div>
        );
    }

    const today = new Date();

    // Compute chart bounds
    const sorted = [...milestones].sort((a, b) =>
        new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime()
    );
    const firstDate = new Date(sorted[0].expectedDate);
    const lastDate = new Date(sorted[sorted.length - 1].expectedDate);

    // Add 15% padding to the timeline on both edges to ensure labels fit
    const rangeMs = Math.max(lastDate.getTime() - firstDate.getTime(), 30 * 86400000); // minimum 30 days gap
    const paddingMs = rangeMs * 0.15;

    const chartStart = new Date(firstDate.getTime() - paddingMs);
    const chartEnd = new Date(lastDate.getTime() + paddingMs);
    const totalMs = chartEnd.getTime() - chartStart.getTime();

    const toPercent = (d: Date) => Math.max(0, Math.min(100, ((d.getTime() - chartStart.getTime()) / totalMs) * 100));
    const todayPct = toPercent(today);

    // Group milestones by PO
    const groupOrder: string[] = [];
    const grouped: Record<string, Milestone[]> = {};
    milestones.forEach(m => {
        if (!grouped[m.poNumber]) {
            grouped[m.poNumber] = [];
            groupOrder.push(m.poNumber);
        }
        grouped[m.poNumber].push(m);
    });
    groupOrder.forEach(po => {
        grouped[po].sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());
    });

    // Month tick marks
    const tickMonths: { label: string; pct: number }[] = [];
    const c = new Date(chartStart.getFullYear(), chartStart.getMonth(), 1);
    while (c <= chartEnd) {
        tickMonths.push({ label: format(c, "MMM ''yy"), pct: toPercent(c) });
        c.setMonth(c.getMonth() + 1);
    }

    return (
        <div className="space-y-6 select-none bg-card p-4 rounded-2xl">
            {/* Header Legend & Today Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-2 pb-6 border-b border-border/40">
                <div className="flex items-center gap-4">
                    {(Object.entries(STATUS_CONFIG) as [StatusKey, typeof STATUS_CONFIG[StatusKey]][]).map(([key, cfg]) => {
                        const Icon = cfg.icon;
                        return (
                            <div key={key} className="flex items-center gap-1.5 opacity-90">
                                <Icon className={cn("w-4 h-4", cfg.text)} weight="fill" />
                                <span className="text-[11px] font-semibold text-muted-foreground">{cfg.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Timeline Grid */}
            <div className="relative mt-6 bg-card/50 rounded-2xl border border-border/40 shadow-sm overflow-hidden p-6">

                {/* Timeline Axis Header */}
                <div className="flex mb-4">
                    <div className="w-[280px] shrink-0" /> {/* Spacer for labels */}
                    <div className="flex-1 relative h-6">
                        {tickMonths.map((t, i) => (
                            <div key={i} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `${t.pct}%` }}>
                                <span className="text-[10px] font-extrabold text-foreground/40 uppercase tracking-widest bg-card px-2">
                                    {t.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Data Rows */}
                <div className="relative min-h-[300px] mt-2">

                    {/* Canvas Background Area with Dotted Pattern */}
                    <div className="absolute top-0 bottom-0 left-[280px] right-0 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-border/60 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
                    </div>

                    {/* Background Grid Lines */}
                    <div className="absolute top-0 bottom-0 left-[280px] right-0 pointer-events-none overflow-hidden rounded-xl">
                        {/* Horizontal faint lines for rows could go here if needed */}
                        {tickMonths.map((t, i) => (
                            <div key={i} className="absolute top-0 bottom-0 w-px bg-border/40 border-dashed" style={{ left: `${t.pct}%` }} />
                        ))}
                    </div>

                    <TooltipProvider delayDuration={0}>
                        <div className="space-y-8 relative z-10 pb-12">
                            {groupOrder.map(po => (
                                <div key={po} className="space-y-3">

                                    {/* PO Group Header row */}
                                    <div className="flex items-center gap-4 group">
                                        <div className="w-[280px] shrink-0 flex items-center justify-between pr-6">
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-widest text-foreground bg-muted/60 px-3 py-1 rounded-lg">
                                                {po}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-medium">{grouped[po].length} milestones</span>
                                        </div>
                                        <div className="flex-1 h-[2px] bg-border/20 rounded-full" />
                                    </div>

                                    {/* Milestones for PO */}
                                    <div className="space-y-4">
                                        {grouped[po].map((m, i) => {
                                            const isOverdue = m.status === "PENDING" && new Date(m.expectedDate) < today;
                                            const statusKey: StatusKey = isOverdue ? "overdue" : (m.status.toLowerCase() as StatusKey);
                                            const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
                                            const Icon = cfg.icon;

                                            const duePct = toPercent(new Date(m.expectedDate));
                                            const daysLeft = differenceInDays(new Date(m.expectedDate), today);

                                            return (
                                                <div key={m.id} className="flex items-center group relative min-h-[44px]">

                                                    {/* Row Label (Left Side) */}
                                                    <div className="w-[280px] shrink-0 pr-6 relative z-20">
                                                        <div className={cn(
                                                            "flex items-center gap-3 p-2 rounded-xl transition-all duration-300 border bg-card hover:shadow-md",
                                                            cfg.border,
                                                            "group-hover:-translate-y-0.5"
                                                        )}>
                                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                                                                <Icon className={cn("w-4 h-4", cfg.text)} weight="fill" />
                                                            </div>
                                                            <div className="flex flex-col flex-1 min-w-0">
                                                                <span className="text-[11px] font-bold text-foreground truncate">{m.title}</span>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                                                        {m.paymentPercentage}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Timeline Area (Right Side) */}
                                                    <div className="flex-1 relative h-full flex items-center">

                                                        {/* Horizontal Connection Line from Label to Marker */}
                                                        <div
                                                            className={cn("absolute left-0 h-[2px] opacity-40 transition-opacity group-hover:opacity-70 group-hover:h-[3px]", cfg.gradient)}
                                                            style={{ width: `${duePct}%` }}
                                                        />

                                                        {/* The Milestone Marker */}
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button
                                                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center gap-1 focus:outline-none z-30 group/marker"
                                                                    style={{ left: `${duePct}%` }}
                                                                >
                                                                    {/* Custom Marker Pill */}
                                                                    <div className={cn(
                                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm border transition-all duration-300 group-hover/marker:scale-110 group-hover/marker:shadow-md",
                                                                        cfg.bg, cfg.border
                                                                    )}>
                                                                        <span className={cn("text-[10px] font-black tracking-wide", cfg.text)}>
                                                                            {fmtMoney(m.amount)}
                                                                        </span>
                                                                        {isOverdue && <Warning className="w-3 h-3 text-red-500 animate-pulse" weight="fill" />}
                                                                        {statusKey === "completed" && <CheckCircle className="w-3 h-3 text-emerald-500" weight="fill" />}
                                                                    </div>

                                                                    {/* Date Label Below Marker */}
                                                                    <span className={cn(
                                                                        "text-[9px] font-semibold whitespace-nowrap transition-colors",
                                                                        statusKey === "overdue" ? "text-red-500 font-bold" : "text-muted-foreground"
                                                                    )}>
                                                                        {format(new Date(m.expectedDate), "dd MMM")}
                                                                    </span>
                                                                </button>
                                                            </TooltipTrigger>

                                                            {/* Detailed Tooltip */}
                                                            <TooltipContent side="top" align="center" className="p-0 border-0 shadow-2xl rounded-xl z-50">
                                                                <div className="bg-card border border-border/60 rounded-xl overflow-hidden min-w-[240px]">
                                                                    <div className={cn("px-4 py-3 border-b border-border/40 flex items-center justify-between", cfg.bg)}>
                                                                        <span className={cn("text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5", cfg.text)}>
                                                                            <Icon weight="fill" className="w-3.5 h-3.5" />
                                                                            {cfg.label}
                                                                        </span>
                                                                    </div>
                                                                    <div className="p-4 space-y-3">
                                                                        <div>
                                                                            <p className="text-sm font-bold text-foreground leading-snug">{m.title}</p>
                                                                            <p className="text-[10px] text-muted-foreground mt-0.5">{po}</p>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] pt-2 border-t border-border/40">
                                                                            <div className="text-muted-foreground flex items-center gap-1">
                                                                                <CurrencyDollar className="w-3.5 h-3.5" weight="duotone" /> Amount
                                                                            </div>
                                                                            <div className="font-extrabold text-right text-foreground">{fmtMoney(m.amount)}</div>

                                                                            <div className="text-muted-foreground">Payment</div>
                                                                            <div className="font-extrabold text-right text-foreground">{m.paymentPercentage}%</div>

                                                                            <div className="text-muted-foreground">Due Date</div>
                                                                            <div className="font-extrabold text-right text-foreground">{format(new Date(m.expectedDate), "dd MMM yyyy")}</div>

                                                                            {m.status !== "COMPLETED" && (
                                                                                <>
                                                                                    <div className="text-muted-foreground">{daysLeft < 0 ? "Overdue by" : "Days remaining"}</div>
                                                                                    <div className={cn("font-extrabold text-right", daysLeft < 0 ? "text-red-600" : daysLeft <= 14 ? "text-amber-600" : "text-emerald-600")}>
                                                                                        {Math.abs(daysLeft)} {daysLeft === 1 || daysLeft === -1 ? 'day' : 'days'}
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TooltipProvider>

                    {/* Distinct TODAY Indicator Axis */}
                    {todayPct > 0 && todayPct < 100 && (
                        <div className="absolute top-0 bottom-0 pointer-events-none z-0" style={{ left: `calc(280px + ${todayPct * (100 - (280 / 1000 * 100))}%)` /* Approx positioning for today line relative to chart width */ }}>
                            {/* Adjusted today calculation for visual correctness over the chart area right of the labels */}
                            <div className="absolute top-0 bottom-0 w-0.5 bg-violet-500/30 border-l border-dashed border-violet-500/50" />
                        </div>
                    )}
                    <div className="absolute top-0 bottom-0 left-[280px] right-0 pointer-events-none z-0 overflow-hidden">
                        {todayPct > 0 && todayPct < 100 && (
                            <div className="absolute top-0 bottom-0 w-0.5 bg-violet-500/40 border-r border-dashed border-violet-500" style={{ left: `${todayPct}%` }}>
                                <div className="absolute -bottom-6 -translate-x-1/2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap">
                                    Today
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
