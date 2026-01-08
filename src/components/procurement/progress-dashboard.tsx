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
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Committed</CardTitle>
                        <CurrencyDollar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${payments.totalCommitted.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {data.budget?.totalPOs || 0} purchase orders
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ${payments.totalPaid.toLocaleString()}
                        </div>
                        <Progress value={paidPercent} className="mt-2 h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                            {paidPercent.toFixed(1)}% of committed
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            ${payments.totalPending.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {data.pendingInvoices?.length || 0} invoices pending
                        </p>
                    </CardContent>
                </Card>

                <Card className={cn(payments.totalOverdue > 0 && "border-destructive")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                        <Warning className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", payments.totalOverdue > 0 && "text-destructive")}>
                            ${payments.totalOverdue.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Retained: ${payments.totalRetained.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Progress by Supplier + CO Impact */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Supplier Progress */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Progress by Supplier
                        </CardTitle>
                        <CardDescription>Average completion across milestones</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.supplierProgress.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No supplier data available</p>
                        ) : (
                            <div className="space-y-4">
                                {data.supplierProgress.slice(0, 5).map((supplier) => (
                                    <div key={supplier.supplierId} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium truncate max-w-[200px]">
                                                {supplier.supplierName}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {supplier.avgProgress}%
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Progress value={supplier.avgProgress} className="h-2 flex-1" />
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {supplier.completedMilestones}/{supplier.totalMilestones}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* CO Impact Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowsClockwise className="h-5 w-5" />
                            Change Order Impact
                        </CardTitle>
                        <CardDescription>Summary of approved and pending changes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.coImpact ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="space-y-1">
                                        <p className="text-2xl font-bold">{data.coImpact.totalCOs}</p>
                                        <p className="text-xs text-muted-foreground">Total COs</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-bold text-green-600">{data.coImpact.approvedCOs}</p>
                                        <p className="text-xs text-muted-foreground">Approved</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-bold text-amber-600">{data.coImpact.pendingCOs}</p>
                                        <p className="text-xs text-muted-foreground">Pending</p>
                                    </div>
                                </div>

                                <div className="border-t pt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Cost Impact:</span>
                                        <span className={cn(
                                            "font-medium",
                                            data.coImpact.totalCostImpact > 0 ? "text-amber-600" : "text-green-600"
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
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No change orders found</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Pending Items */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Pending Invoices */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Pending Invoices
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.pendingInvoices.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No pending invoices</p>
                        ) : (
                            <div className="space-y-3">
                                {data.pendingInvoices.slice(0, 5).map((inv: any) => (
                                    <div key={inv.id} className="flex items-center justify-between p-2 border rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {inv.supplier?.name || "Unknown supplier"}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">${Number(inv.amount).toLocaleString()}</p>
                                            <PaymentStatusBadge status={inv.status} className="text-xs" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pending COs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowsClockwise className="h-5 w-5" />
                            Pending Change Orders
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.pendingCOs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No pending change orders</p>
                        ) : (
                            <div className="space-y-3">
                                {data.pendingCOs.slice(0, 5).map((co: any) => (
                                    <div key={co.id} className="flex items-center justify-between p-2 border rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">{co.changeNumber}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                {co.reason}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(
                                                "font-medium",
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
