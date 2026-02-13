"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    Receipt,
    ChartLineUp,
    Files,
    ArrowsClockwise,
} from "@phosphor-icons/react";
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    LineChart,
    Line,
} from "recharts";

type MilestonePoint = {
    id: string;
    title: string;
    progress: number;
    amount: number;
};

type BoqPoint = {
    id: string;
    description: string;
    totalPrice: number;
};

interface POCommandCenterProps {
    poId: string;
    currency: string;
    totalValue: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    totalRetained: number;
    pendingInvoicesCount: number;
    milestones: MilestonePoint[];
    boqItems: BoqPoint[];
    pendingCOs: number;
    totalCOs: number;
    onOpenSection?: (section: SectionTab) => void;
}

export type SectionTab =
    | "overview"
    | "financials"
    | "progress"
    | "boq"
    | "change-orders"
    | "gallery"
    | "quality"
    | "history"
    | "conflicts";

const CHART_COLORS = {
    paid: "#0E7490",
    pending: "#F59E0B",
    retained: "#6366F1",
    overdue: "#EF4444",
    remaining: "#94A3B8",
};

export function POCommandCenter({
    poId,
    currency,
    totalValue,
    totalPaid,
    totalPending,
    totalOverdue,
    totalRetained,
    pendingInvoicesCount,
    milestones,
    boqItems,
    pendingCOs,
    totalCOs,
    onOpenSection,
}: POCommandCenterProps) {
    const router = useRouter();
    const remainingBudget = Math.max(totalValue - totalPaid - totalPending - totalRetained, 0);

    const paymentMixData = [
        { name: "Paid", value: totalPaid, color: CHART_COLORS.paid },
        { name: "Pending", value: totalPending, color: CHART_COLORS.pending },
        { name: "Retained", value: totalRetained, color: CHART_COLORS.retained },
        { name: "Overdue", value: totalOverdue, color: CHART_COLORS.overdue },
        { name: "Remaining", value: remainingBudget, color: CHART_COLORS.remaining },
    ].filter((item) => item.value > 0);

    const milestoneProgressData = milestones
        .slice()
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 8)
        .map((milestone) => ({
            name: milestone.title.length > 18 ? `${milestone.title.slice(0, 18)}…` : milestone.title,
            progress: Math.max(0, Math.min(100, milestone.progress)),
        }));

    const boqDistributionData = boqItems
        .slice()
        .sort((a, b) => b.totalPrice - a.totalPrice)
        .slice(0, 8)
        .map((item) => ({
            name: item.description.length > 16 ? `${item.description.slice(0, 16)}…` : item.description,
            value: Math.max(0, Number(item.totalPrice) || 0),
        }))
        .filter((item) => item.value > 0);

    const milestoneTrendData = buildMilestoneTrend(milestones);

    const formatCurrency = (value: number) => `${currency} ${Math.round(value).toLocaleString()}`;
    const openTableView = (dataset: "invoices" | "deliveries" | "boq" | "changeOrders", query: string) => {
        const encodedQuery = encodeURIComponent(query);
        router.push(`/dashboard/procurement/${poId}?view=table&dataset=${dataset}&q=${encodedQuery}`);
    };

    return (
        <div className="space-y-6">
            <Card className="border-border/70">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">PO Command Center</CardTitle>
                    <CardDescription>
                        Chart-first view with one-click access to all PO sections
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <QuickLink
                            onClick={onOpenSection ? () => onOpenSection("overview") : undefined}
                            href={`/dashboard/procurement/${poId}?tab=overview`}
                            icon={ChartLineUp}
                            label="Overview"
                            value="Summary"
                        />
                        <QuickLink
                            onClick={onOpenSection ? () => onOpenSection("financials") : undefined}
                            href={`/dashboard/procurement/${poId}?tab=financials`}
                            icon={Receipt}
                            label="Invoices"
                            value={`${pendingInvoicesCount} pending`}
                        />
                        <QuickLink
                            onClick={onOpenSection ? () => onOpenSection("progress") : undefined}
                            href={`/dashboard/procurement/${poId}?tab=progress`}
                            icon={ChartLineUp}
                            label="Deliveries"
                            value={`${milestones.filter((m) => m.progress >= 100).length}/${milestones.length} complete`}
                        />
                        <QuickLink
                            onClick={onOpenSection ? () => onOpenSection("boq") : undefined}
                            href={`/dashboard/procurement/${poId}?tab=boq`}
                            icon={Files}
                            label="BOQ / Scope"
                            value={`${boqItems.length} line items`}
                        />
                        <QuickLink
                            onClick={onOpenSection ? () => onOpenSection("change-orders") : undefined}
                            href={`/dashboard/procurement/${poId}?tab=change-orders`}
                            icon={ArrowsClockwise}
                            label="Change Orders"
                            value={`${pendingCOs} pending · ${totalCOs} total`}
                        />
                        <QuickLink
                            onClick={onOpenSection ? () => onOpenSection("gallery") : undefined}
                            href={`/dashboard/procurement/${poId}?tab=gallery`}
                            icon={Files}
                            label="Documents"
                            value="Files"
                        />
                        <QuickLink
                            onClick={onOpenSection ? () => onOpenSection("quality") : undefined}
                            href={`/dashboard/procurement/${poId}?tab=quality`}
                            icon={ChartLineUp}
                            label="Quality"
                            value="NCR"
                        />
                        <QuickLink
                            onClick={onOpenSection ? () => onOpenSection("history") : undefined}
                            href={`/dashboard/procurement/${poId}?tab=history`}
                            icon={ArrowsClockwise}
                            label="History"
                            value="Timeline"
                        />
                        <QuickLink
                            onClick={onOpenSection ? () => onOpenSection("conflicts") : undefined}
                            href={`/dashboard/procurement/${poId}?tab=conflicts`}
                            icon={Receipt}
                            label="Conflicts"
                            value="Queue"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-5 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Payment Mix</CardTitle>
                        <CardDescription>{formatCurrency(totalValue)} total contract value</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={paymentMixData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={65}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        onClick={(segment) => {
                                            const segmentName = String((segment as { name?: string })?.name || "").toLowerCase();
                                            if (segmentName) openTableView("invoices", segmentName);
                                        }}
                                    >
                                        {paymentMixData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-2.5">
                            {paymentMixData.map((item) => (
                                <button
                                    key={item.name}
                                    onClick={() => openTableView("invoices", item.name)}
                                    className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs transition-colors hover:bg-muted/40"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="font-medium">{item.name}</span>
                                    </div>
                                    <span className="font-mono">{formatCurrency(item.value)}</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Milestone Completion</CardTitle>
                        <CardDescription>Top milestones by completion percentage</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={milestoneProgressData} layout="vertical" margin={{ left: 8, right: 8 }}>
                                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(value: number) => `${value}%`} />
                                    <Bar
                                        dataKey="progress"
                                        fill={CHART_COLORS.paid}
                                        radius={[4, 4, 4, 4]}
                                        onClick={(bar) => {
                                            const name = String((bar as { name?: string })?.name || "");
                                            if (name) openTableView("deliveries", name.replace("…", ""));
                                        }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <Button variant="outline" size="sm" onClick={() => openTableView("deliveries", "in-progress")}>Open deliveries in table</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">BOQ Value Distribution</CardTitle>
                        <CardDescription>Highest-value line items to prioritize</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={boqDistributionData} margin={{ left: 8, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={50} />
                                    <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Bar
                                        dataKey="value"
                                        fill="#1E40AF"
                                        radius={[4, 4, 0, 0]}
                                        onClick={(bar) => {
                                            const name = String((bar as { name?: string })?.name || "");
                                            if (name) openTableView("boq", name.replace("…", ""));
                                        }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <Button variant="outline" size="sm" onClick={() => openTableView("boq", "total")}>Open BOQ in table</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Delivery Trend</CardTitle>
                        <CardDescription>Cumulative expected completion trajectory</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={milestoneTrendData} margin={{ left: 8, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(value: number) => `${value}%`} />
                                    <Line
                                        type="monotone"
                                        dataKey="progress"
                                        stroke={CHART_COLORS.paid}
                                        strokeWidth={2.5}
                                        dot={{ r: 3 }}
                                        onClick={() => openTableView("deliveries", "progress")}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <Button variant="outline" size="sm" onClick={() => openTableView("deliveries", "forecast")}>Open trend rows in table</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function QuickLink({
    onClick,
    href,
    icon: Icon,
    label,
    value,
}: {
    onClick?: () => void;
    href: string;
    icon: ElementType;
    label: string;
    value: string;
}) {
    if (onClick) {
        return (
            <Button type="button" variant="outline" className="h-auto justify-between rounded-xl border-[#0E7490]/30 bg-[#0E7490]/5 px-3 py-2.5 text-left hover:bg-[#0E7490]/10" onClick={onClick}>
                <span className="flex items-center gap-2 text-[#0E7490]">
                    <Icon className="h-4 w-4" weight="duotone" />
                    <span className="text-sm font-semibold">{label}</span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {value}
                    <ArrowRight className="h-3.5 w-3.5" weight="bold" />
                </span>
            </Button>
        );
    }

    return (
        <Button asChild variant="outline" className="h-auto justify-between rounded-xl border-[#0E7490]/30 bg-[#0E7490]/5 px-3 py-2.5 text-left hover:bg-[#0E7490]/10">
            <Link href={href}>
            <span className="flex items-center gap-2 text-[#0E7490]">
                    <Icon className="h-4 w-4" weight="duotone" />
                    <span className="text-sm font-semibold">{label}</span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {value}
                    <ArrowRight className="h-3.5 w-3.5" weight="bold" />
                </span>
            </Link>
        </Button>
    );
}

function buildMilestoneTrend(milestones: MilestonePoint[]) {
    if (milestones.length === 0) {
        return [
            { name: "M1", progress: 0 },
            { name: "M2", progress: 0 },
            { name: "M3", progress: 0 },
            { name: "M4", progress: 0 },
        ];
    }

    const sorted = milestones
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .slice(0, 8);

    let cumulative = 0;
    return sorted.map((milestone, index) => {
        cumulative += milestone.progress;
        return {
            name: `M${index + 1}`,
            progress: Math.min(100, Math.round(cumulative / (index + 1))),
        };
    });
}
