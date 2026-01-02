"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    ChartLineUp,
    Users,
    Clock,
    WarningCircle,
    CheckCircle,
    TrendUp,
    TrendDown,
    CaretRight,
    Star,
    ShieldCheck,
    UserCircle,
} from "@phosphor-icons/react";
import Link from "next/link";

// --- Types ---
interface SupplierMetrics {
    supplierId: string;
    supplierName: string;
    portalAdoption: {
        hasLoggedIn: boolean;
        lastLoginAt: Date | null;
        totalLogins: number;
    };
    responseRate: number;
    avgResponseTime: number;
    missedUpdates: number;
    reportingAccuracy: number;
    conflictRate: number;
    reliabilityScore: number;
}

interface SupplierPerformanceDashboardProps {
    organizationMetrics: {
        totalSuppliers: number;
        averageReliabilityScore: number;
        flaggedSuppliers: number;
        lowPerformers: number;
        highPerformers: number;
        suppliers: SupplierMetrics[];
    };
    className?: string;
}

// --- Helper Components ---

function ScoreGauge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
    const getColor = (s: number) => {
        if (s >= 80) return "text-green-600 bg-green-100 dark:bg-green-500/20";
        if (s >= 50) return "text-amber-600 bg-amber-100 dark:bg-amber-500/20";
        return "text-red-600 bg-red-100 dark:bg-red-500/20";
    };

    const sizeClasses = {
        sm: "h-10 w-10 text-sm",
        md: "h-14 w-14 text-lg",
        lg: "h-20 w-20 text-2xl",
    };

    return (
        <div className={cn(
            "rounded-full flex items-center justify-center font-bold",
            getColor(score),
            sizeClasses[size]
        )}>
            {score}
        </div>
    );
}

function MetricCard({
    label,
    value,
    suffix = "",
    trend,
    icon: Icon,
    variant = "default"
}: {
    label: string;
    value: number | string;
    suffix?: string;
    trend?: "up" | "down" | "neutral";
    icon?: typeof ChartLineUp;
    variant?: "default" | "success" | "warning" | "danger";
}) {
    const variantStyles = {
        default: "bg-muted/50",
        success: "bg-green-50 dark:bg-green-500/10",
        warning: "bg-amber-50 dark:bg-amber-500/10",
        danger: "bg-red-50 dark:bg-red-500/10",
    };

    return (
        <div className={cn("rounded-xl p-4", variantStyles[variant])}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{label}</span>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="flex items-end gap-1">
                <span className="text-2xl font-bold">{value}</span>
                {suffix && <span className="text-sm text-muted-foreground mb-0.5">{suffix}</span>}
                {trend && (
                    <span className={cn("ml-2", trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground")}>
                        {trend === "up" ? <TrendUp className="h-4 w-4" /> : trend === "down" ? <TrendDown className="h-4 w-4" /> : null}
                    </span>
                )}
            </div>
        </div>
    );
}

/**
 * Supplier Performance Dashboard
 * Displays adoption tracking, accuracy metrics, and flagged suppliers.
 */
export function SupplierPerformanceDashboard({
    organizationMetrics,
    className
}: SupplierPerformanceDashboardProps) {
    const {
        totalSuppliers,
        averageReliabilityScore,
        flaggedSuppliers,
        lowPerformers,
        highPerformers,
        suppliers
    } = organizationMetrics;

    // Sort suppliers by reliability
    const sortedSuppliers = [...suppliers].sort((a, b) => b.reliabilityScore - a.reliabilityScore);
    const topPerformers = sortedSuppliers.slice(0, 3);
    const needsAttention = sortedSuppliers.filter((s) => s.missedUpdates >= 3 || s.reliabilityScore < 50);

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    label="Total Suppliers"
                    value={totalSuppliers}
                    icon={Users}
                />
                <MetricCard
                    label="Avg. Reliability"
                    value={averageReliabilityScore}
                    suffix="%"
                    variant={averageReliabilityScore >= 70 ? "success" : averageReliabilityScore >= 50 ? "warning" : "danger"}
                    icon={ShieldCheck}
                />
                <MetricCard
                    label="High Performers"
                    value={highPerformers}
                    variant="success"
                    icon={Star}
                />
                <MetricCard
                    label="Flagged Suppliers"
                    value={flaggedSuppliers}
                    variant={flaggedSuppliers > 0 ? "danger" : "default"}
                    icon={WarningCircle}
                />
            </div>

            {/* Two Column Layout */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Performers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-amber-500" weight="fill" />
                            Top Performers
                        </CardTitle>
                        <CardDescription>Suppliers with highest reliability scores</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topPerformers.length > 0 ? topPerformers.map((supplier, index) => (
                                <div key={supplier.supplierId} className="flex items-center gap-4">
                                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{supplier.supplierName}</p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span>{supplier.responseRate}% response rate</span>
                                            <span>{supplier.reportingAccuracy}% accuracy</span>
                                        </div>
                                    </div>
                                    <ScoreGauge score={supplier.reliabilityScore} size="sm" />
                                </div>
                            )) : (
                                <p className="text-center text-muted-foreground py-4">No supplier data yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Needs Attention */}
                <Card className={needsAttention.length > 0 ? "border-red-200 dark:border-red-500/30" : ""}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <WarningCircle className="h-5 w-5 text-red-500" weight="fill" />
                            Needs Attention
                        </CardTitle>
                        <CardDescription>Suppliers with 3+ missed updates or low scores</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {needsAttention.length > 0 ? needsAttention.map((supplier) => (
                                <div key={supplier.supplierId} className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20">
                                        <UserCircle className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{supplier.supplierName}</p>
                                        <div className="flex items-center gap-2 text-xs">
                                            {supplier.missedUpdates >= 3 && (
                                                <Badge variant="destructive" className="text-xs">
                                                    {supplier.missedUpdates} missed
                                                </Badge>
                                            )}
                                            {supplier.reliabilityScore < 50 && (
                                                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                                                    Low score
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <Link href={`/dashboard/admin/suppliers/${supplier.supplierId}`}>
                                        <Button size="sm" variant="ghost">
                                            <CaretRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            )) : (
                                <div className="text-center py-4">
                                    <CheckCircle className="h-10 w-10 mx-auto text-green-500/30 mb-2" />
                                    <p className="text-muted-foreground">All suppliers performing well!</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Full Supplier List */}
            <Card>
                <CardHeader>
                    <CardTitle>All Suppliers</CardTitle>
                    <CardDescription>Detailed performance metrics for each supplier</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b text-left text-sm text-muted-foreground">
                                    <th className="pb-3 font-medium">Supplier</th>
                                    <th className="pb-3 font-medium text-center">Portal</th>
                                    <th className="pb-3 font-medium text-center">Response</th>
                                    <th className="pb-3 font-medium text-center">Accuracy</th>
                                    <th className="pb-3 font-medium text-center">Conflicts</th>
                                    <th className="pb-3 font-medium text-center">Score</th>
                                    <th className="pb-3 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedSuppliers.map((supplier) => (
                                    <tr key={supplier.supplierId} className="border-b last:border-0">
                                        <td className="py-4">
                                            <p className="font-medium">{supplier.supplierName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {supplier.avgResponseTime}h avg response
                                            </p>
                                        </td>
                                        <td className="py-4 text-center">
                                            {supplier.portalAdoption.hasLoggedIn ? (
                                                <CheckCircle className="h-5 w-5 text-green-600 mx-auto" weight="fill" />
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Not active</span>
                                            )}
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className={cn(
                                                "font-medium",
                                                supplier.responseRate >= 80 ? "text-green-600" :
                                                    supplier.responseRate >= 50 ? "text-amber-600" : "text-red-600"
                                            )}>
                                                {supplier.responseRate}%
                                            </span>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className={cn(
                                                "font-medium",
                                                supplier.reportingAccuracy >= 80 ? "text-green-600" :
                                                    supplier.reportingAccuracy >= 50 ? "text-amber-600" : "text-red-600"
                                            )}>
                                                {supplier.reportingAccuracy}%
                                            </span>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className={supplier.conflictRate > 20 ? "text-red-600 font-medium" : ""}>
                                                {supplier.conflictRate}%
                                            </span>
                                        </td>
                                        <td className="py-4 text-center">
                                            <ScoreGauge score={supplier.reliabilityScore} size="sm" />
                                        </td>
                                        <td className="py-4 text-right">
                                            <Link href={`/dashboard/procurement/suppliers/${supplier.supplierId}/history`}>
                                                <Button size="sm" variant="ghost">
                                                    History <CaretRight className="h-4 w-4 ml-1" />
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
