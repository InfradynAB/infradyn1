"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Warning,
    FileText,
    Truck,
    ShieldWarning,
    Clock,
    CaretRight,
    Bell,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ComplianceAlert {
    id: string;
    type: "expiring_document" | "delayed_po" | "excessive_ncr" | "missing_document" | "overdue_payment";
    severity: "info" | "warning" | "critical";
    title: string;
    description: string;
    dueDate?: Date;
    relatedEntity: string;
    entityId: string;
}

interface ComplianceAlertsProps {
    data: ComplianceAlert[];
    onAlertClick?: (alert: ComplianceAlert) => void;
    maxItems?: number;
}

const TYPE_CONFIG = {
    expiring_document: { icon: FileText, label: "Expiring Doc", color: "text-amber-600 dark:text-amber-400" },
    missing_document: { icon: FileText, label: "Missing Doc", color: "text-red-600 dark:text-red-400" },
    delayed_po: { icon: Truck, label: "Delayed PO", color: "text-orange-600 dark:text-orange-400" },
    excessive_ncr: { icon: ShieldWarning, label: "NCR Alert", color: "text-red-600 dark:text-red-400" },
    overdue_payment: { icon: Clock, label: "Overdue", color: "text-red-600 dark:text-red-400" },
};

const SEVERITY_STYLES = {
    info: {
        stripe: "border-l-blue-500",
        bg: "bg-blue-500/5",
        badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    },
    warning: {
        stripe: "border-l-amber-500",
        bg: "bg-amber-500/5",
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    },
    critical: {
        stripe: "border-l-red-500",
        bg: "bg-red-500/5",
        badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
    },
};

const getDaysRemaining = (date?: Date): string => {
    if (!date) return "";
    const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `${days}d remaining`;
};

export function ComplianceAlerts({ data, onAlertClick, maxItems = 5 }: ComplianceAlertsProps) {
    const sorted = [...data].sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
        if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
        return 0;
    });

    const display = sorted.slice(0, maxItems);
    const remaining = sorted.length - maxItems;
    const criticalCount = data.filter(d => d.severity === "critical").length;
    const warningCount = data.filter(d => d.severity === "warning").length;

    return (
        <Card className="shadow-none border h-full">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Bell className="w-4 h-4 text-amber-500" />
                            Compliance Alerts
                        </CardTitle>
                        <CardDescription>{data.length} items require attention</CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {criticalCount > 0 && <Badge variant="destructive" className="text-xs">{criticalCount} Critical</Badge>}
                        {warningCount > 0 && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                                {warningCount} Warning
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {display.length === 0 ? (
                    <div className="py-10 text-center">
                        <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                            <Warning className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="font-medium">All Compliant</p>
                        <p className="text-xs text-muted-foreground mt-0.5">No compliance issues detected</p>
                    </div>
                ) : (
                    <div className="space-y-1.5 p-4 pt-2">
                        {display.map((alert) => {
                            const config = TYPE_CONFIG[alert.type];
                            const severity = SEVERITY_STYLES[alert.severity];
                            const Icon = config.icon;

                            return (
                                <div
                                    key={alert.id}
                                    className={cn(
                                        "px-3 py-2.5 rounded-lg border-l-[3px] cursor-pointer transition-colors group hover:bg-muted/40",
                                        severity.stripe,
                                        severity.bg,
                                    )}
                                    onClick={() => onAlertClick?.(alert)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2.5">
                                            <div className={cn("mt-0.5", alert.severity === "critical" && "animate-pulse")}>
                                                <Icon className={cn("w-4 h-4", config.color)} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                                                        {config.label}
                                                    </span>
                                                    <Badge variant="outline" className={cn("text-[10px] px-1 py-0", severity.badge)}>
                                                        {alert.severity}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm font-medium leading-snug">{alert.title}</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">{alert.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0 gap-1">
                                            {alert.dueDate && (
                                                <span className={cn(
                                                    "text-[10px] font-sans tabular-nums",
                                                    alert.dueDate < new Date() ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                                                )}>
                                                    {getDaysRemaining(alert.dueDate)}
                                                </span>
                                            )}
                                            <CaretRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {remaining > 0 && (
                            <p className="text-xs text-center text-muted-foreground pt-2">
                                +{remaining} more alert{remaining !== 1 ? "s" : ""}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
