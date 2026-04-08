"use client";

import { cn } from "@/lib/utils";
import {
    Warning,
    CheckCircle,
    ArrowRight,
    Truck,
    CurrencyDollar,
    ShieldWarning,
    Target,
    Receipt,
    Gauge,
} from "@phosphor-icons/react";
import type { DashboardKPIs } from "@/lib/services/kpi-engine";
import type { MilestoneItem } from "../charts/milestone-progress";
import type { DeliveryItem } from "./delivery-pipeline";

type Severity = "critical" | "warning" | "ok";

interface ActionItem {
    id: string;
    severity: Severity;
    icon: React.ElementType;
    title: string;
    detail: string;
    href?: string;
}

interface AttentionListProps {
    kpis: DashboardKPIs;
    milestones: MilestoneItem[];
    deliveries: DeliveryItem[];
}

function buildItems(
    kpis: DashboardKPIs,
    milestones: MilestoneItem[],
    deliveries: DeliveryItem[]
): ActionItem[] {
    const items: ActionItem[] = [];

    // Delayed deliveries
    const delayedCount = deliveries.filter((d) => d.status === "delayed").length;
    if (delayedCount > 0) {
        items.push({
            id: "delayed-deliveries",
            severity: delayedCount >= 3 ? "critical" : "warning",
            icon: Truck,
            title: `${delayedCount} shipment${delayedCount > 1 ? "s" : ""} delayed`,
            detail: "Review delivery tracking and contact suppliers.",
            href: "#deliveries",
        });
    }

    // Overdue milestones
    const overdueMilestones = milestones.filter((m) => m.status === "overdue");
    if (overdueMilestones.length > 0) {
        items.push({
            id: "overdue-milestones",
            severity: "critical",
            icon: Target,
            title: `${overdueMilestones.length} milestone${overdueMilestones.length > 1 ? "s" : ""} overdue`,
            detail: overdueMilestones.map((m) => m.name).slice(0, 2).join(", ") + (overdueMilestones.length > 2 ? ` +${overdueMilestones.length - 2} more` : ""),
            href: "#milestones",
        });
    }

    // Open NCRs
    if (kpis.quality.openNCRs > 0) {
        items.push({
            id: "open-ncrs",
            severity: kpis.quality.criticalNCRs > 0 ? "critical" : "warning",
            icon: ShieldWarning,
            title: `${kpis.quality.openNCRs} open quality issue${kpis.quality.openNCRs > 1 ? "s" : ""}`,
            detail: kpis.quality.criticalNCRs > 0
                ? `${kpis.quality.criticalNCRs} marked critical — immediate review needed.`
                : "Non-conformance reports awaiting resolution.",
            href: "#quality",
        });
    }

    // Overdue invoices
    if (kpis.payments.overdueInvoiceCount > 0) {
        const fmt = (n: number) =>
            n >= 1_000_000
                ? `$${(n / 1_000_000).toFixed(1)}M`
                : n >= 1_000
                ? `$${(n / 1_000).toFixed(0)}K`
                : `$${n.toFixed(0)}`;
        items.push({
            id: "overdue-invoices",
            severity: "warning",
            icon: Receipt,
            title: `${kpis.payments.overdueInvoiceCount} invoice${kpis.payments.overdueInvoiceCount > 1 ? "s" : ""} overdue`,
            detail: `${fmt(kpis.payments.overdueAmount)} outstanding — approve or dispute to unblock suppliers.`,
            href: "#payments",
        });
    }

    // Low physical progress
    if (kpis.progress.physicalProgress < 30 && kpis.progress.totalPOs > 0) {
        items.push({
            id: "low-progress",
            severity: "warning",
            icon: Gauge,
            title: `Physical progress at ${kpis.progress.physicalProgress.toFixed(0)}%`,
            detail: `${kpis.progress.milestonesCompleted} of ${kpis.progress.milestonesTotal} milestones complete.`,
            href: "#milestones",
        });
    }

    // Budget: uncommitted spend (paid vs committed very low)
    const spendPct = kpis.financial.totalCommitted > 0
        ? (kpis.financial.totalPaid / kpis.financial.totalCommitted) * 100
        : 0;
    if (spendPct < 5 && kpis.financial.totalCommitted > 0) {
        items.push({
            id: "low-spend",
            severity: "warning",
            icon: CurrencyDollar,
            title: "Very low payment activity",
            detail: `Only ${spendPct.toFixed(0)}% of committed budget has been paid out.`,
            href: "#financial",
        });
    }

    // All good
    if (items.length === 0) {
        items.push({
            id: "all-good",
            severity: "ok",
            icon: CheckCircle,
            title: "Everything is on track",
            detail: "No critical issues detected. Keep monitoring supplier performance.",
        });
    }

    // Sort: critical first, then warning, then ok
    const order: Record<Severity, number> = { critical: 0, warning: 1, ok: 2 };
    return items.sort((a, b) => order[a.severity] - order[b.severity]);
}

const SEVERITY_STYLES: Record<Severity, { bar: string; icon: string; badge: string; badgeText: string }> = {
    critical: {
        bar: "bg-red-500",
        icon: "text-red-500",
        badge: "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-800/50",
        badgeText: "text-red-600 dark:text-red-400",
    },
    warning: {
        bar: "bg-amber-500",
        icon: "text-amber-500",
        badge: "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-800/50",
        badgeText: "text-amber-600 dark:text-amber-400",
    },
    ok: {
        bar: "bg-emerald-500",
        icon: "text-emerald-500",
        badge: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-800/50",
        badgeText: "text-emerald-600 dark:text-emerald-400",
    },
};

export function AttentionList({ kpis, milestones, deliveries }: AttentionListProps) {
    const items = buildItems(kpis, milestones, deliveries);
    const criticalCount = items.filter((i) => i.severity === "critical").length;
    const warningCount = items.filter((i) => i.severity === "warning").length;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold">What Needs Attention</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {criticalCount > 0
                            ? `${criticalCount} critical · ${warningCount} warning`
                            : warningCount > 0
                            ? `${warningCount} item${warningCount > 1 ? "s" : ""} to review`
                            : "No issues found"}
                    </p>
                </div>
                {criticalCount > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/50 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
                        <Warning weight="fill" className="w-3 h-3" />
                        {criticalCount} Critical
                    </span>
                )}
            </div>

            {/* Items */}
            <div className="space-y-2.5 flex-1">
                {items.map((item) => {
                    const styles = SEVERITY_STYLES[item.severity];
                    const Icon = item.icon;
                    const content = (
                        <div
                            className={cn(
                                "group flex items-start gap-3 rounded-xl border p-3 transition-all duration-200",
                                styles.badge,
                                item.href && "cursor-pointer hover:shadow-sm hover:-translate-y-px"
                            )}
                        >
                            {/* Left color bar */}
                            <div className={cn("mt-0.5 w-1 self-stretch rounded-full shrink-0", styles.bar)} />

                            {/* Icon */}
                            <Icon weight="duotone" className={cn("w-4 h-4 shrink-0 mt-0.5", styles.icon)} />

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <p className={cn("text-xs font-semibold leading-tight", styles.badgeText)}>
                                    {item.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                    {item.detail}
                                </p>
                            </div>

                            {/* Arrow for linked items */}
                            {item.href && (
                                <ArrowRight
                                    className={cn(
                                        "w-3.5 h-3.5 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                                        styles.icon
                                    )}
                                />
                            )}
                        </div>
                    );

                    if (item.href) {
                        return (
                            <a key={item.id} href={item.href}>
                                {content}
                            </a>
                        );
                    }
                    return <div key={item.id}>{content}</div>;
                })}
            </div>
        </div>
    );
}
