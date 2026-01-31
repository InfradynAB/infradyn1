"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Warning,
    Bell,
    CaretRight,
    Clock,
    CreditCard,
    FileX,
    Truck,
} from "@phosphor-icons/react";

interface AlertData {
    id: string;
    type: string;
    severity: "info" | "warning" | "critical";
    title: string;
    description: string;
    href: string;
    actionLabel: string;
    count?: number;
}

interface SmartAlertCardProps {
    alert: AlertData;
    className?: string;
}

const severityConfig = {
    info: {
        bg: "bg-blue-500/5 hover:bg-blue-500/10",
        border: "border-blue-500/20",
        icon: "text-blue-500",
        badge: "bg-blue-500/10 text-blue-600 border-blue-200",
    },
    warning: {
        bg: "bg-amber-500/5 hover:bg-amber-500/10",
        border: "border-amber-500/20",
        icon: "text-amber-500",
        badge: "bg-amber-500/10 text-amber-600 border-amber-200",
    },
    critical: {
        bg: "bg-red-500/5 hover:bg-red-500/10",
        border: "border-red-500/20",
        icon: "text-red-500",
        badge: "bg-red-500/10 text-red-600 border-red-200",
    },
};

const typeIcons: Record<string, React.ElementType> = {
    overdue_payment: CreditCard,
    quality_alert: Warning,
    pending_approval: FileX,
    pending_invoice: Clock,
    delivery_delay: Truck,
    default: Bell,
};

export function SmartAlertCard({ alert, className }: SmartAlertCardProps) {
    const config = severityConfig[alert.severity];
    const Icon = typeIcons[alert.type] || typeIcons.default;

    return (
        <Link href={alert.href}>
            <Card
                className={cn(
                    "group cursor-pointer transition-all duration-200",
                    "border-2",
                    config.bg,
                    config.border,
                    className
                )}
            >
                <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div
                            className={cn(
                                "flex-shrink-0 p-2.5 rounded-xl",
                                alert.severity === "critical"
                                    ? "bg-red-500/10"
                                    : alert.severity === "warning"
                                    ? "bg-amber-500/10"
                                    : "bg-blue-500/10"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", config.icon)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                {alert.count && alert.count > 1 && (
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "h-5 min-w-5 px-1.5 text-[10px] font-bold",
                                            config.badge
                                        )}
                                    >
                                        {alert.count}
                                    </Badge>
                                )}
                                <h4 className="font-semibold text-sm truncate">
                                    {alert.title}
                                </h4>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                                {alert.description}
                            </p>
                        </div>

                        {/* Action */}
                        <div className="flex-shrink-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-8 text-xs font-medium",
                                    "group-hover:bg-background group-hover:shadow-sm",
                                    "transition-all duration-200"
                                )}
                            >
                                {alert.actionLabel}
                                <CaretRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

interface AlertsQueueProps {
    alerts: AlertData[];
    className?: string;
    maxItems?: number;
}

export function AlertsQueue({ alerts, className, maxItems = 5 }: AlertsQueueProps) {
    const displayAlerts = alerts.slice(0, maxItems);
    const remainingCount = alerts.length - maxItems;

    if (alerts.length === 0) {
        return (
            <Card className={cn("border-dashed", className)}>
                <CardContent className="py-8 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                        <Bell className="h-6 w-6 text-emerald-500" />
                    </div>
                    <p className="font-medium text-emerald-600">All Clear!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        No items requiring your attention
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className={cn("space-y-3", className)}>
            {displayAlerts.map((alert) => (
                <SmartAlertCard key={alert.id} alert={alert} />
            ))}

            {remainingCount > 0 && (
                <Link href="/dashboard/alerts">
                    <Card className="border-dashed hover:border-primary/30 transition-colors cursor-pointer">
                        <CardContent className="py-3 text-center">
                            <p className="text-sm text-muted-foreground">
                                +{remainingCount} more alert{remainingCount !== 1 ? "s" : ""}
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            )}
        </div>
    );
}

interface TopPrioritiesSectionProps {
    alerts: AlertData[];
    className?: string;
}

export function TopPrioritiesSection({ alerts, className }: TopPrioritiesSectionProps) {
    const criticalAlerts = alerts.filter((a) => a.severity === "critical");
    const warningAlerts = alerts.filter((a) => a.severity === "warning");
    const topAlerts = [...criticalAlerts, ...warningAlerts].slice(0, 3);

    return (
        <Card className={cn(className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        Top Priorities
                    </CardTitle>
                    {alerts.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {alerts.length} total
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <AlertsQueue alerts={topAlerts} maxItems={3} />
                
                {alerts.length > 3 && (
                    <Button asChild variant="ghost" className="w-full mt-3" size="sm">
                        <Link href="/dashboard/alerts">
                            View All Alerts
                            <CaretRight className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
