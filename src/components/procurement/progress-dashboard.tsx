"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    CurrencyDollar,
    TrendUp,
    TrendDown,
    Clock,
    Warning,
    CheckCircle,
    Users,
    FileText,
    ArrowsClockwise,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { PaymentStatusBadge, COStatusBadge } from "./payment-status-badge";
import { HelpTooltip, TOOLTIPS } from "@/components/ui/help-tooltip";

interface PaymentSummary {
    totalCommitted: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    totalRetained: number;
}

interface COImpact {
    totalCOs: number;
    approvedCOs: number;
    pendingCOs: number;
    totalCostImpact: number;
    totalScheduleImpact: number;
    affectedMilestones: number;
}

interface SupplierProgress {
    supplierId: string;
    supplierName: string;
    totalMilestones: number;
    avgProgress: number;
    completedMilestones: number;
}

interface DashboardData {
    payments: PaymentSummary | null;
    budget: {
        totalPOs: number;
        totalCommitted: number;
        totalForecasted: number;
        totalApprovedProgress: number;
        costToComplete: number;
        utilization: string;
    } | null;
    pendingInvoices: any[];
    pendingCOs: any[];
    coImpact: COImpact | null;
    supplierProgress: SupplierProgress[];
}

interface ProgressDashboardProps {
    projectId?: string;
}

export function ProgressDashboard({ projectId }: ProgressDashboardProps) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDashboardData() {
            setLoading(true);
            try {
                const url = projectId
                    ? `/api/dashboard/progress?projectId=${projectId}`
                    : "/api/dashboard/progress";
                const response = await fetch(url);
                const result = await response.json();

                if (result.success) {
                    setData(result.data);
                } else {
                    setError(result.error);
                }
            } catch (err) {
                setError("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardData();
    }, [projectId]);

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (error) {
        return (
            <Card className="border-destructive">
                <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-destructive">
                        <Warning className="h-5 w-5" />
                        <span>{error}</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    const payments = data.payments || {
        totalCommitted: 0,
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        totalRetained: 0,
    };

    const paidPercent = payments.totalCommitted > 0
        ? (payments.totalPaid / payments.totalCommitted) * 100
        : 0;

    return (
        <div className="space-y-6">
            {/* Financial Summary Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">Total Committed to Suppliers</CardTitle>
                            <HelpTooltip content={TOOLTIPS.totalCommitted} />
                        </div>
                        <CurrencyDollar className="h-5 w-5 text-blue-500" weight="duotone" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${payments.totalCommitted.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Across {data.budget?.totalPOs || 0} purchase order{data.budget?.totalPOs !== 1 ? 's' : ''}
                        </p>
                        {payments.totalCommitted === 0 && (
                            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                <Warning className="h-3 w-3" />
                                No active orders yet
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                            <HelpTooltip content={TOOLTIPS.totalPaid} />
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-500" weight="duotone" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ${payments.totalPaid.toLocaleString()}
                        </div>
                        {payments.totalCommitted > 0 && (
                            <>
                                <Progress value={paidPercent} className="mt-2 h-2" />
                                <p className="text-xs text-muted-foreground mt-1">
                                    {paidPercent.toFixed(1)}% of committed
                                </p>
                            </>
                        )}
                        {payments.totalCommitted === 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Payments will appear after creating purchase orders
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                            <HelpTooltip content={TOOLTIPS.pendingPayments} />
                        </div>
                        <Clock className="h-5 w-5 text-amber-500" weight="duotone" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            ${payments.totalPending.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {data.pendingInvoices?.length || 0} invoice{data.pendingInvoices?.length !== 1 ? 's' : ''} waiting for approval
                        </p>
                        {payments.totalPending === 0 ? (
                            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                All caught up!
                            </p>
                        ) : (
                            <a 
                                href="/dashboard/invoices?status=pending" 
                                className="text-xs text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 mt-2 inline-flex items-center gap-1 font-medium hover:underline"
                            >
                                → Review Invoices
                            </a>
                        )}
                    </CardContent>
                </Card>

                <Card className={cn(
                    "border-l-4",
                    payments.totalOverdue > 0 ? "border-l-red-500 border-red-200 bg-red-50/50 dark:bg-red-950/10" : "border-l-gray-300"
                )}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                            <HelpTooltip content={TOOLTIPS.overdue} />
                        </div>
                        <Warning className={cn(
                            "h-5 w-5",
                            payments.totalOverdue > 0 ? "text-red-500" : "text-muted-foreground"
                        )} weight="duotone" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn(
                            "text-2xl font-bold",
                            payments.totalOverdue > 0 ? "text-red-600" : "text-muted-foreground"
                        )}>
                            ${payments.totalOverdue.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Retained: ${payments.totalRetained.toLocaleString()}
                        </p>
                        {payments.totalOverdue === 0 ? (
                            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                No overdue payments
                            </p>
                        ) : (
                            <div className="mt-2 space-y-1">
                                <p className="text-xs text-red-600 flex items-center gap-1">
                                    <Warning className="h-3 w-3" />
                                    Needs immediate attention
                                </p>
                                <a 
                                    href="/dashboard/invoices?status=overdue" 
                                    className="text-xs text-red-700 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center gap-1 font-medium hover:underline"
                                >
                                    → View Overdue Payments
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Supplier Delivery Progress + CO Impact */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Supplier Delivery Progress */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-500" weight="duotone" />
                                <CardTitle>Material Delivery by Supplier</CardTitle>
                                <HelpTooltip content="Track how much work and materials each supplier has delivered compared to their milestones" />
                            </div>
                        </div>
                        <CardDescription>
                            Percentage of materials delivered by each supplier
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.supplierProgress.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-20" />
                                <p className="text-sm text-muted-foreground">No delivery progress to track yet</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Progress will show after adding milestones to purchase orders
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {data.supplierProgress.slice(0, 5).map((supplier) => (
                                    <div key={supplier.supplierId} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium truncate max-w-[200px]">
                                                {supplier.supplierName}
                                            </span>
                                            <span className={cn(
                                                "font-semibold",
                                                supplier.avgProgress >= 80 ? "text-green-600" :
                                                supplier.avgProgress >= 50 ? "text-amber-600" :
                                                "text-red-600"
                                            )}>
                                                {supplier.avgProgress}% delivered
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Progress value={supplier.avgProgress} className="h-2 flex-1" />
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {supplier.completedMilestones} of {supplier.totalMilestones} milestones
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* CO Impact Summary */}
                <Card className={cn(
                    "border-l-4",
                    data.coImpact && data.coImpact.pendingCOs > 0 
                        ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/10" 
                        : "border-l-gray-300"
                )}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ArrowsClockwise className={cn(
                                    "h-5 w-5",
                                    data.coImpact && data.coImpact.pendingCOs > 0 ? "text-amber-500" : "text-muted-foreground"
                                )} weight="duotone" />
                                <CardTitle>Change Order Impact</CardTitle>
                                <HelpTooltip content={TOOLTIPS.changeOrderImpact} />
                            </div>
                            {data.coImpact && data.coImpact.pendingCOs > 0 && (
                                <Badge variant="default" className="bg-amber-500">
                                    {data.coImpact.pendingCOs} Pending
                                </Badge>
                            )}
                        </div>
                        <CardDescription>
                            Changes affecting your project cost and schedule
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.coImpact ? (
                            <div className="space-y-4">
                                {/* Alert if pending */}
                                {data.coImpact.pendingCOs > 0 && (
                                    <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3 flex items-start gap-2">
                                        <Warning className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" weight="fill" />
                                        <p className="text-sm text-amber-900 dark:text-amber-100">
                                            <strong>{data.coImpact.pendingCOs} change order{data.coImpact.pendingCOs !== 1 ? 's are' : ' is'}</strong> waiting for your approval
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="space-y-1">
                                        <p className="text-2xl font-bold">{data.coImpact.totalCOs}</p>
                                        <p className="text-xs text-muted-foreground">Total</p>
                                    </div>
                                    <div className="space-y-1 flex flex-col items-center">
                                        <div className="flex items-center gap-1">
                                            <div className="h-2 w-2 rounded-full bg-green-500" />
                                            <p className="text-2xl font-bold text-green-600">{data.coImpact.approvedCOs}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Approved</p>
                                    </div>
                                    <div className="space-y-1 flex flex-col items-center">
                                        <div className="flex items-center gap-1">
                                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                                            <p className="text-2xl font-bold text-orange-600">{data.coImpact.pendingCOs}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Pending</p>
                                    </div>
                                </div>

                                <div className="border-t pt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Cost Impact:</span>
                                        <span className={cn(
                                            "font-bold",
                                            data.coImpact.totalCostImpact > 0 ? "text-orange-600" : "text-green-600"
                                        )}>
                                            {data.coImpact.totalCostImpact >= 0 ? "+" : ""}
                                            ${data.coImpact.totalCostImpact.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Schedule Impact:</span>
                                        <span className={cn(
                                            "font-medium",
                                            data.coImpact.totalScheduleImpact > 0 ? "text-amber-600" : ""
                                        )}>
                                            {data.coImpact.totalScheduleImpact > 0 ? "+" : ""}
                                            {data.coImpact.totalScheduleImpact} days
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Affected Milestones:</span>
                                        <span className="font-medium">{data.coImpact.affectedMilestones}</span>
                                    </div>
                                </div>

                                {/* Helper text */}
                                <div className="bg-muted/50 rounded-lg p-3 border">
                                    <p className="text-xs text-muted-foreground">
                                        💡 Pending change orders may affect project cost and schedule
                                    </p>
                                </div>

                                {/* Action link */}
                                {data.coImpact.pendingCOs > 0 && (
                                    <a 
                                        href="/dashboard/change-orders?status=pending" 
                                        className="text-sm text-orange-700 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 inline-flex items-center gap-1 font-medium hover:underline"
                                    >
                                        → Review Change Orders
                                    </a>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No change orders found</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Pending Approvals Section */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Pending Invoices */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" weight="duotone" />
                            Pending Invoices
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.pendingInvoices.length === 0 ? (
                            <div className="text-center py-6">
                                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" weight="fill" />
                                <p className="text-sm font-medium text-green-600">No pending invoices</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    All supplier payments are up to date
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {data.pendingInvoices.slice(0, 5).map((inv: any) => (
                                    <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div>
                                            <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {inv.supplier?.name || "Unknown supplier"}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold">${Number(inv.amount).toLocaleString()}</p>
                                            <PaymentStatusBadge status={inv.status} className="text-xs" />
                                        </div>
                                    </div>
                                ))}
                                {data.pendingInvoices.length > 5 && (
                                    <p className="text-xs text-center text-muted-foreground pt-2">
                                        +{data.pendingInvoices.length - 5} more
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pending Change Orders */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowsClockwise className="h-5 w-5 text-amber-500" weight="duotone" />
                            Pending Change Orders
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.pendingCOs.length === 0 ? (
                            <div className="text-center py-6">
                                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" weight="fill" />
                                <p className="text-sm font-medium text-green-600">No pending change orders</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    All changes have been reviewed
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {data.pendingCOs.slice(0, 5).map((co: any) => (
                                    <div key={co.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{co.changeNumber}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                {co.reason}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(
                                                "font-semibold",
                                                Number(co.amountDelta) > 0 ? "text-amber-600" : "text-green-600"
                                            )}>
                                                {Number(co.amountDelta) >= 0 ? "+" : ""}
                                                ${Number(co.amountDelta).toLocaleString()}
                                            </p>
                                            <COStatusBadge status={co.status} className="text-xs" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="space-y-0 pb-2">
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-32" />
                            <Skeleton className="h-3 w-20 mt-2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-40" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-2 w-full" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-40" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-32 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
