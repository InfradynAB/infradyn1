"use client";

import {
    FileText, Truck, Receipt,
    Target, CurrencyDollar, CalendarCheck,
    Gauge, CaretRight,
} from "@phosphor-icons/react";
import {
    SectionHeader, fmt, pct,
} from "@/components/dashboard/supplier/analytics-shared";
import { useAnalyticsFilters } from "@/components/dashboard/supplier/analytics-shell";
import { cn } from "@/lib/utils";

// ─── Reusable Components ─────────────────────────────────────────────────────

function FlowGroup({
    title, color, children, showArrow,
}: {
    title: string;
    color: "emerald" | "blue" | "slate";
    children: React.ReactNode;
    showArrow?: boolean;
}) {
    const headerBg = {
        emerald: "bg-emerald-50/50 dark:bg-emerald-500/10",
        blue: "bg-blue-50/50 dark:bg-blue-500/10",
        slate: "bg-slate-50/50 dark:bg-slate-500/10",
    }[color];

    return (
        <div className="relative group/flow h-full">
            <div className="h-full flex flex-col rounded-3xl border border-border/40 bg-card/30 overflow-hidden shadow-sm transition-all hover:bg-card/50">
                <div className={cn("px-4 py-2.5 border-b border-border/30", headerBg)}>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60 text-center">{title}</p>
                </div>
                <div className="p-4 flex-1 space-y-4">
                    {children}
                </div>
            </div>
            {showArrow && (
                <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-background border border-border/80 flex items-center justify-center shadow-sm">
                        <CaretRight className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricKPI({
    label, value, subtitle, icon: Icon, iconColor, statusDot,
}: {
    label: string;
    value: string;
    subtitle?: string;
    icon?: React.ElementType;
    iconColor?: string;
    statusDot?: "amber" | "red" | "emerald";
}) {
    return (
        <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className={cn("w-3.5 h-3.5", iconColor || "text-muted-foreground/60")} weight="bold" />}
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
                </div>
                {statusDot && (
                    <div className="flex items-center gap-1.5">
                        <span className={cn(
                            "h-2 w-2 rounded-full",
                            statusDot === "amber" ? "bg-amber-400" : statusDot === "red" ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                        )} />
                    </div>
                )}
            </div>
            <p className="text-2xl font-black tabular-nums tracking-tight text-foreground leading-none mb-1">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground font-medium">{subtitle}</p>}
        </div>
    );
}

function CircularKPI({
    label, value, percentage, subtitle, icon: Icon, iconColor,
}: {
    label: string;
    value: string;
    percentage: number;
    subtitle?: string;
    icon?: React.ElementType;
    iconColor?: string;
}) {
    // SVG circle calculation
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-md transition-all flex flex-col items-center">
            <div className="w-full flex items-center gap-2 mb-3">
                {Icon && <Icon className={cn("w-3.5 h-3.5", iconColor || "text-muted-foreground/60")} weight="bold" />}
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
            </div>

            <div className="relative flex items-center justify-center mb-4">
                <svg className="w-24 h-24 -rotate-90">
                    {/* Background Circle */}
                    <circle
                        cx="48" cy="48" r={radius}
                        className="stroke-muted/30 fill-transparent"
                        strokeWidth="6"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx="48" cy="48" r={radius}
                        className={cn("stroke-current fill-transparent transition-all duration-1000", iconColor || "text-emerald-500")}
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black tabular-nums tracking-tight text-foreground">{value}</span>
                </div>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium text-center">{subtitle}</p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsOverviewPage() {
    const { analyticsData } = useAnalyticsFilters();
    const kpis = analyticsData?.kpis;

    if (!kpis) {
        return null;
    }

    return (
        <div className="space-y-8 pb-12">
            <SectionHeader
                icon={Gauge}
                iconBg="bg-slate-100 dark:bg-slate-500/20"
                iconColor="text-slate-600 dark:text-slate-400"
                title="Overview"
                subtitle="Key performance indicators at a glance"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                {/* Group 1: Pipeline */}
                <FlowGroup title="PO & Logistics Pipeline" color="emerald" showArrow>
                    <MetricKPI
                        label="Active POs"
                        value={kpis.totalActivePOs.toString()}
                        subtitle={fmt(kpis.totalPOValue)}
                        icon={FileText}
                        iconColor="text-blue-500"
                    />
                    <MetricKPI
                        label="Upcoming Deliveries (This Week)"
                        value={kpis.upcomingDeliveriesThisWeek.toString()}
                        subtitle="Expected arrivals"
                        icon={CalendarCheck}
                        iconColor="text-blue-500"
                        statusDot="emerald"
                    />
                </FlowGroup>

                {/* Group 2: Performance */}
                <FlowGroup title="In-Progress Performance" color="blue" showArrow>
                    <CircularKPI
                        label="On-Time Delivery"
                        value={pct(kpis.onTimeDeliveryScore, 0)}
                        percentage={kpis.onTimeDeliveryScore}
                        subtitle="Delivery score"
                        icon={Truck}
                        iconColor="text-emerald-500"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <MetricKPI
                            label="Pending Deliveries"
                            value={kpis.pendingDeliveries.toString()}
                            subtitle={`${kpis.upcomingDeliveriesThisWeek} this week`}
                            icon={Truck}
                            iconColor="text-amber-500"
                        />
                        <MetricKPI
                            label="Milestones Pending"
                            value={kpis.milestonesPendingApproval.toString()}
                            subtitle="Awaiting client approval"
                            icon={Target}
                            iconColor="text-amber-500"
                        />
                    </div>
                </FlowGroup>

                {/* Group 3: Finance & Risk */}
                <FlowGroup title="Finance & Risk Closeout" color="slate">
                    <div className="grid grid-cols-2 gap-3">
                        <MetricKPI
                            label="Payments Received"
                            value={fmt(kpis.totalPaymentsReceived)}
                            subtitle="Total to date"
                            icon={CurrencyDollar}
                            iconColor="text-emerald-500"
                        />
                        <MetricKPI
                            label="Invoices Pending"
                            value={kpis.invoicesPendingApproval.toString()}
                            subtitle={`Avg ${kpis.averagePaymentCycle}d cycle`}
                            icon={Receipt}
                            iconColor="text-violet-500"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-2">Avg Payment Cycle</p>
                            <p className="text-xl font-black text-foreground">{kpis.averagePaymentCycle}d</p>
                            <p className="text-[8px] text-muted-foreground leading-tight mt-1">Invoice to payment</p>
                        </div>
                        <div className="col-span-1 border-x border-border/40 px-3 flex flex-col items-center">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-2 text-center">Compliance</p>
                            <div className="relative w-12 h-12">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="24" cy="24" r="18" className="stroke-muted/20 fill-transparent" strokeWidth="4" />
                                    <circle
                                        cx="24" cy="24" r="18"
                                        className="stroke-amber-500 fill-transparent"
                                        strokeWidth="4"
                                        strokeDasharray={2 * Math.PI * 18}
                                        strokeDashoffset={(2 * Math.PI * 18) - (kpis.documentComplianceScore / 100 * 2.1 * Math.PI * 18)}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-[10px] font-bold">{pct(kpis.documentComplianceScore, 0)}</span>
                                </div>
                            </div>
                            <p className="text-[8px] text-muted-foreground leading-tight mt-1 text-center">Document health</p>
                        </div>
                        <div className="col-span-1 relative">
                            <div className="flex items-center gap-1 mb-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Open NCRs</p>
                                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            </div>
                            <p className="text-xl font-black text-foreground">{kpis.ncrsAssigned}</p>
                            <p className="text-[8px] text-muted-foreground leading-tight mt-1 uppercase font-bold text-red-500/80">Requires response</p>
                        </div>
                    </div>
                    {/* Add visual flair: tiny "Stars" button or similar if useful, though probably not needed */}
                </FlowGroup>
            </div>
        </div>
    );
}
