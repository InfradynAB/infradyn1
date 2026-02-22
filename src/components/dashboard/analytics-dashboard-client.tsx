"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SCurveChart } from "@/components/dashboard/s-curve-chart";
import { COImpactDonut } from "@/components/dashboard/co-impact-donut";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowsClockwise,
    Download,
    CalendarBlank,
    CurrencyDollar,
    CheckCircle,
    Clock,
    Warning,
    TrendUp,
    TrendDown,
    Truck,
    FileText,
    ShieldWarning,
    Sparkle,
    CaretRight,
    Bell,
    FileCsv,
    FileXls,
    ListBullets,
    Eye,
    ArrowSquareOut,
    DotsSixVertical,
} from "@phosphor-icons/react";
import { DeliveryCategoriesShell } from "@/components/dashboard/analytics/delivery-categories/delivery-categories-shell";
import type { DashboardKPIs, SCurveDataPoint, COBreakdown } from "@/lib/services/kpi-engine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";

function reorderCols(arr: string[], from: string, to: string, setter: (val: string[]) => void) {
  const a = [...arr];
  const fi = a.indexOf(from), ti = a.indexOf(to);
  if (fi < 0 || ti < 0 || fi === ti) return;
  [a[fi], a[ti]] = [a[ti], a[fi]];
  setter(a);
}

interface DashboardData {
    kpis: DashboardKPIs;
    charts: {
        sCurve: SCurveDataPoint[];
        coBreakdown: COBreakdown;
    };
}

interface MilestoneRow {
    poId: string;
    poNumber: string;
    supplierName: string;
    milestoneName: string;
    progressPercent: number;
    status: string;
    expectedDate: string | null;
    invoiceStatus: string | null;
    amount: number;
}

interface SupplierProgressRow {
    supplierId: string;
    supplierName: string;
    physicalProgress: number;
    financialProgress: number;
    poCount: number;
    totalValue: number;
    paidAmount: number;
    unpaidAmount: number;
    riskScore: number;
}

interface RiskAssessment {
    poId: string;
    poNumber: string;
    supplierName: string;
    riskScore: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    predictedDelay: number;
}

interface CashflowForecast {
    period: string;
    expectedPayments: number;
    pendingInvoices: number;
    cumulativeExposure: number;
}

type ViewMode = "pulse" | "alerts" | "audit" | "milestones" | "risks" | "deliveries";

// Format currency with proper precision (max 2 decimals)
const formatCurrency = (value: number | undefined | null, currency = "USD") => {
    const num = Number(value) || 0;
    if (num >= 1_000_000) {
        return `${currency} ${(num / 1_000_000).toFixed(2)}M`;
    }
    if (num >= 1_000) {
        return `${currency} ${(num / 1_000).toFixed(2)}K`;
    }
    return `${currency} ${num.toFixed(2)}`;
};

export function AnalyticsDashboardClient() {
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
    const [supplierProgress, setSupplierProgress] = useState<SupplierProgressRow[]>([]);
    const [risks, setRisks] = useState<RiskAssessment[]>([]);
    const [cashflow, setCashflow] = useState<CashflowForecast[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeframe, setTimeframe] = useState("all");
    const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
    const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
    const [viewMode, setViewMode] = useState<ViewMode>("pulse");
    const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    useEffect(() => {
        if (timeframe !== "custom") {
            setCustomFrom(undefined);
            setCustomTo(undefined);
            return;
        }

        if (!customFrom) setCustomFrom(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    }, [timeframe, customFrom]);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (timeframe !== "all") {
                const now = new Date();
                let from: Date | null = null;
                let to: Date | null = null;

                switch (timeframe) {
                    case "7d":
                        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        to = now;
                        break;
                    case "30d":
                        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        to = now;
                        break;
                    case "90d":
                        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        to = now;
                        break;
                    case "ytd":
                        from = new Date(now.getFullYear(), 0, 1);
                        to = now;
                        break;
                    case "custom":
                        if (customFrom) {
                            from = customFrom;
                            to = customTo ?? now;
                        }
                        break;
                    default:
                        from = new Date(0);
                        to = now;
                }

                if (from) params.set("dateFrom", from.toISOString());
                if (to) params.set("dateTo", to.toISOString());
            }

            const res = await fetch(`/api/dashboard/analytics?${params.toString()}`);
            if (!res.ok) {
                throw new Error("Failed to fetch dashboard data");
            }
            const json = await res.json();
            if (!json.success || !json.data) {
                throw new Error(json.error || "Invalid response format");
            }
            setData(json.data);

            // Fetch additional data for detailed views
            const [milestonesRes, detailedRes] = await Promise.all([
                fetch(`/api/dashboard/export?format=json&type=detailed&${params.toString()}`),
                fetch(`/api/dashboard/risks?${params.toString()}`),
            ]);

            if (milestonesRes.ok) {
                const milestonesJson = await milestonesRes.json();
                if (milestonesJson.success && milestonesJson.data) {
                    setMilestones(milestonesJson.data.milestones || []);
                    setSupplierProgress(milestonesJson.data.supplierProgress || []);
                }
            }

            if (detailedRes.ok) {
                const detailedJson = await detailedRes.json();
                if (detailedJson.success && detailedJson.data) {
                    setRisks(detailedJson.data.risks || []);
                    setCashflow(detailedJson.data.cashflow || []);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }, [timeframe, customFrom, customTo]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const handleAlertClick = (alertId: string) => {
        setSelectedAlert(alertId);
        setSheetOpen(true);
    };

    // Export dashboard data
    const handleExport = async (format: "xlsx" | "csv" | "json") => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            params.set("format", format);
            params.set("type", "detailed");

            const res = await fetch(`/api/dashboard/export?${params.toString()}`);
            if (!res.ok) throw new Error("Export failed");

            if (format === "xlsx") {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `dashboard-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                toast.success("Excel report exported successfully");
            } else if (format === "csv") {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                toast.success("CSV exported successfully");
            } else if (format === "json") {
                const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `dashboard-data-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                toast.success("JSON data exported successfully");
            }
        } catch (error) {
            toast.error("Failed to export dashboard data");
            console.error("Export error:", error);
        } finally {
            setExporting(false);
        }
    };

    // Drill-down navigation
    const navigateToPO = (poId: string) => {
        router.push(`/dashboard/procurement/${poId}`);
    };

    const navigateToSupplier = (supplierId: string) => {
        router.push(`/dashboard/suppliers/${supplierId}`);
    };

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <p className="text-red-600 font-medium">{error}</p>
                        <Button onClick={fetchDashboard} className="mt-4">
                            <ArrowsClockwise className="w-4 h-4 mr-2" />
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with View Switcher */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Project Home
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Real-time financial intelligence and project health
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Select value={timeframe} onValueChange={setTimeframe}>
                            <SelectTrigger className="w-[140px]">
                                <CalendarBlank className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Timeframe" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="7d">Last 7 Days</SelectItem>
                                <SelectItem value="30d">Last 30 Days</SelectItem>
                                <SelectItem value="90d">Last 90 Days</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                        </Select>

                        {timeframe === "custom" && (
                            <div className="hidden lg:flex items-center gap-2">
                                <DatePicker
                                    value={customFrom}
                                    onChange={setCustomFrom}
                                    placeholder="From"
                                    className="w-[150px]"
                                />
                                <DatePicker
                                    value={customTo}
                                    onChange={setCustomTo}
                                    placeholder="To"
                                    className="w-[150px]"
                                />
                            </div>
                        )}

                        <Button variant="outline" size="icon" onClick={fetchDashboard}>
                            <ArrowsClockwise
                                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                            />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" disabled={exporting}>
                                    {exporting ? (
                                        <ArrowsClockwise className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4 mr-2" />
                                    )}
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                                    <FileXls className="w-4 h-4 mr-2" />
                                    Export as Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport("csv")}>
                                    <FileCsv className="w-4 h-4 mr-2" />
                                    Export as CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport("json")}>
                                    <ListBullets className="w-4 h-4 mr-2" />
                                    Export as JSON
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Three-Tier View Switcher */}
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
                    <TabsList className="grid w-full max-w-3xl grid-cols-6 bg-slate-100 dark:bg-slate-800 p-1">
                        <TabsTrigger
                            value="pulse"
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm font-medium"
                        >
                            <TrendUp className="w-4 h-4 mr-2" />
                            Pulse
                        </TabsTrigger>
                        <TabsTrigger
                            value="alerts"
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm font-medium relative"
                        >
                            <Bell className="w-4 h-4 mr-2" />
                            Alerts
                            {data && (data.kpis.payments.overdueInvoiceCount > 0 || data.kpis.logistics.delayedShipments > 0) && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="audit"
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm font-medium"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Audit
                        </TabsTrigger>
                        <TabsTrigger
                            value="milestones"
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm font-medium"
                        >
                            <ListBullets className="w-4 h-4 mr-2" />
                            Milestones
                        </TabsTrigger>
                        <TabsTrigger
                            value="risks"
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm font-medium relative"
                        >
                            <ShieldWarning className="w-4 h-4 mr-2" />
                            Risks
                            {risks.filter(r => r.riskLevel === "CRITICAL" || r.riskLevel === "HIGH").length > 0 && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="deliveries"
                            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm font-medium"
                        >
                            <Truck className="w-4 h-4 mr-2" />
                            Deliveries
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {loading ? (
                <DashboardSkeleton />
            ) : data ? (
                <>
                    {viewMode === "pulse" && (
                        <PulseView data={data} onAlertClick={handleAlertClick} />
                    )}
                    {viewMode === "alerts" && (
                        <AlertsView data={data} onAlertClick={handleAlertClick} />
                    )}
                    {viewMode === "audit" && (
                        <AuditView data={data} />
                    )}
                    {viewMode === "milestones" && (
                        <MilestoneTrackerView
                            milestones={milestones}
                            onNavigateToPO={navigateToPO}
                        />
                    )}
                    {viewMode === "risks" && (
                        <RiskAssessmentView
                            risks={risks}
                            cashflow={cashflow}
                            supplierProgress={supplierProgress}
                            onNavigateToPO={navigateToPO}
                            onNavigateToSupplier={navigateToSupplier}
                        />
                    )}
                    {viewMode === "deliveries" && (
                        <Card>
                            <CardContent className="pt-6">
                                <DeliveryCategoriesShell />
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : null}

            {/* Drill-Down Side Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Alert Details</SheetTitle>
                        <SheetDescription>
                            Detailed information for the selected alert
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                        {selectedAlert === "overdue-invoices" && (
                            <div className="space-y-4">
                                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                                    <h4 className="font-semibold text-red-800 dark:text-red-200">
                                        {data?.kpis.payments.overdueInvoiceCount} Overdue Invoices
                                    </h4>
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                        Total outstanding: {formatCurrency(data?.kpis.payments.overdueAmount || 0)}
                                    </p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Navigate to Procurement → Invoices to view and process overdue payments.
                                </p>
                                <Button className="w-full" asChild>
                                    <Link href="/dashboard/procurement?tab=invoices&filter=overdue">
                                        View Overdue Invoices
                                        <CaretRight className="w-4 h-4 ml-2" />
                                    </Link>
                                </Button>
                            </div>
                        )}
                        {selectedAlert === "delayed-shipments" && (
                            <div className="space-y-4">
                                <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                                        {data?.kpis.logistics.delayedShipments} Delayed Shipments
                                    </h4>
                                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                                        Average delay: {data?.kpis.logistics.avgDeliveryDelay} days
                                    </p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Review shipment tracking to identify bottlenecks and coordinate with suppliers.
                                </p>
                                <Button className="w-full" variant="outline">
                                    View Shipment Tracker
                                    <CaretRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        )}
                        {selectedAlert === "critical-ncrs" && (
                            <div className="space-y-4">
                                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                                    <h4 className="font-semibold text-red-800 dark:text-red-200">
                                        {data?.kpis.quality.criticalNCRs} Critical NCRs
                                    </h4>
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                        Requires immediate attention
                                    </p>
                                </div>
                                <Button className="w-full" asChild>
                                    <a href="/ncr?severity=CRITICAL">
                                        View Critical NCRs
                                        <CaretRight className="w-4 h-4 ml-2" />
                                    </a>
                                </Button>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

// ============================================
// PULSE VIEW - Executive Financial Overview
// ============================================
function PulseView({ data, onAlertClick }: { data: DashboardData; onAlertClick: (id: string) => void }) {
    const financial = data.kpis.financial;

    return (
        <div className="space-y-6">
            {/* THE BIG THREE - Primary Financial KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
                <PrimaryKPICard
                    title="Total Committed"
                    value={formatCurrency(financial.totalCommitted)}
                    icon={CurrencyDollar}
                    trend={null}
                    description="PO Value + Approved COs"
                    color="slate"
                />
                <PrimaryKPICard
                    title="Paid"
                    value={formatCurrency(financial.totalPaid)}
                    icon={CheckCircle}
                    trend={financial.totalPaid > 0 ? "up" : null}
                    description="Invoices settled"
                    color="emerald"
                />
                <PrimaryKPICard
                    title="Unpaid"
                    value={formatCurrency(financial.totalUnpaid)}
                    icon={Clock}
                    trend={financial.totalUnpaid > financial.totalPaid ? "alert" : null}
                    description="Outstanding balance"
                    color="amber"
                />
            </div>

            {/* SECONDARY METRICS - Smaller, muted */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                <SecondaryKPICard
                    title="Pending"
                    value={formatCurrency(financial.totalPending)}
                    onClick={() => onAlertClick("pending-invoices")}
                />
                <SecondaryKPICard
                    title="Retention"
                    value={formatCurrency(financial.retentionHeld)}
                />
                <SecondaryKPICard
                    title="CO Impact"
                    value={formatCurrency(financial.changeOrderImpact)}
                    alert={financial.changeOrderImpact > 0}
                />
                <SecondaryKPICard
                    title="Active POs"
                    value={`${data.kpis.progress.activePOs}/${data.kpis.progress.totalPOs}`}
                />
                <SecondaryKPICard
                    title="NCR Rate"
                    value={`${data.kpis.quality.ncrRate.toFixed(1)}%`}
                    alert={data.kpis.quality.ncrRate > 5}
                    onClick={() => onAlertClick("critical-ncrs")}
                />
                <SecondaryKPICard
                    title="On-Time"
                    value={`${data.kpis.logistics.onTimeRate.toFixed(1)}%`}
                    alert={data.kpis.logistics.onTimeRate < 80}
                />
            </div>

            {/* Progress Bars */}
            <div className="grid gap-4 md:grid-cols-2">
                <ProgressCard
                    title="Physical Progress"
                    value={data.kpis.progress.physicalProgress}
                    description="Based on delivered quantities"
                />
                <ProgressCard
                    title="Financial Progress"
                    value={data.kpis.progress.financialProgress}
                    description="Paid vs committed"
                />
            </div>

            {/* S-Curve Chart */}
            <SCurveChart data={data.charts.sCurve} />

            {/* Bottom Row: CO Donut + AI Insights */}
            <div className="grid gap-4 lg:grid-cols-2">
                <COImpactDonut data={data.charts.coBreakdown} />
                <AIInsightsCard data={data} />
            </div>
        </div>
    );
}

// ============================================
// ALERTS VIEW - Attention Queue
// ============================================
function AlertsView({ data, onAlertClick }: { data: DashboardData; onAlertClick: (id: string) => void }) {
    const alerts = generateAlerts(data);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    Attention Queue
                </h2>
                <Badge variant="outline" className="font-mono">
                    {alerts.filter(a => a.severity === "critical").length} Critical
                </Badge>
            </div>

            {alerts.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                        <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">All Clear</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            No critical items require your attention
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {alerts.map((alert) => (
                        <AlertCard
                            key={alert.id}
                            alert={alert}
                            onClick={() => onAlertClick(alert.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// AUDIT VIEW - Deep Dive
// ============================================
function AuditView({ data }: { data: DashboardData }) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Financial Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <AuditRow label="Total PO Value" value={formatCurrency(data.kpis.financial.totalCommitted - data.kpis.financial.changeOrderImpact)} />
                        <AuditRow label="Approved Change Orders" value={formatCurrency(data.kpis.financial.changeOrderImpact)} />
                        <AuditRow label="Total Committed" value={formatCurrency(data.kpis.financial.totalCommitted)} highlight />
                        <div className="border-t pt-4 mt-4">
                            <AuditRow label="Invoices Paid" value={formatCurrency(data.kpis.financial.totalPaid)} />
                            <AuditRow label="Invoices Pending" value={formatCurrency(data.kpis.financial.totalPending)} />
                            <AuditRow label="Retention Held" value={formatCurrency(data.kpis.financial.retentionHeld)} />
                            <AuditRow label="Outstanding Balance" value={formatCurrency(data.kpis.financial.totalUnpaid)} highlight />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Quality Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <AuditRow label="Total NCRs" value={data.kpis.quality.totalNCRs.toString()} />
                        <AuditRow label="Open NCRs" value={data.kpis.quality.openNCRs.toString()} />
                        <AuditRow label="Critical NCRs" value={data.kpis.quality.criticalNCRs.toString()} alert={data.kpis.quality.criticalNCRs > 0} />
                        <AuditRow label="NCR Rate" value={`${data.kpis.quality.ncrRate.toFixed(2)}%`} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Logistics Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <AuditRow label="Total Shipments" value={data.kpis.logistics.totalShipments.toString()} />
                        <AuditRow label="Delivered On-Time" value={data.kpis.logistics.deliveredOnTime.toString()} />
                        <AuditRow label="Delayed" value={data.kpis.logistics.delayedShipments.toString()} alert={data.kpis.logistics.delayedShipments > 0} />
                        <AuditRow label="In Transit" value={data.kpis.logistics.inTransit.toString()} />
                        <AuditRow label="On-Time Rate" value={`${data.kpis.logistics.onTimeRate.toFixed(2)}%`} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ============================================
// COMPONENT: Primary KPI Card (Big Three)
// ============================================
function PrimaryKPICard({
    title,
    value,
    icon: Icon,
    trend,
    description,
    color,
}: {
    title: string;
    value: string;
    icon: React.ElementType;
    trend: "up" | "down" | "alert" | null;
    description: string;
    color: "slate" | "emerald" | "amber";
}) {
    const colorClasses = {
        slate: "border-l-slate-600 bg-linear-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950",
        emerald: "border-l-emerald-600 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950 dark:to-slate-950",
        amber: "border-l-amber-500 bg-linear-to-br from-amber-50 to-white dark:from-amber-950 dark:to-slate-950",
    };

    const iconColorClasses = {
        slate: "text-slate-600",
        emerald: "text-emerald-600",
        amber: "text-amber-600",
    };

    return (
        <Card className={cn(
            "border-l-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer group",
            colorClasses[color]
        )}>
            <CardContent className="pt-6 pb-5">
                <div className="flex items-start justify-between">
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Icon className={cn("w-4 h-4", iconColorClasses[color])} />
                            {title}
                        </p>
                        <p className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
                            {value}
                        </p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    {trend && (
                        <div className={cn(
                            "p-2 rounded-full",
                            trend === "up" && "bg-emerald-100 dark:bg-emerald-900",
                            trend === "down" && "bg-red-100 dark:bg-red-900",
                            trend === "alert" && "bg-amber-100 dark:bg-amber-900"
                        )}>
                            {trend === "up" && <TrendUp className="w-4 h-4 text-emerald-600" />}
                            {trend === "down" && <TrendDown className="w-4 h-4 text-red-600" />}
                            {trend === "alert" && <Warning className="w-4 h-4 text-amber-600" />}
                        </div>
                    )}
                </div>
                <div className="mt-4 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className={cn(
                        "h-full rounded-full transition-all duration-500 w-1/3",
                        color === "emerald" && "bg-emerald-500",
                        color === "amber" && "bg-amber-500",
                        color === "slate" && "bg-slate-500"
                    )} />
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================
// COMPONENT: Secondary KPI Card (Muted)
// ============================================
function SecondaryKPICard({
    title,
    value,
    alert,
    onClick,
}: {
    title: string;
    value: string;
    alert?: boolean;
    onClick?: () => void;
}) {
    return (
        <Card
            className={cn(
                "transition-all duration-200 hover:shadow-md cursor-pointer",
                alert && "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30",
                onClick && "hover:scale-[1.02]"
            )}
            onClick={onClick}
        >
            <CardContent className="py-4 px-4">
                <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
                <p className={cn(
                    "text-lg font-semibold font-mono mt-1 truncate",
                    alert ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300"
                )}>
                    {value}
                </p>
            </CardContent>
        </Card>
    );
}

// ============================================
// COMPONENT: Progress Card
// ============================================
function ProgressCard({
    title,
    value,
    description,
}: {
    title: string;
    value: number;
    description: string;
}) {
    const progressColor = value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-slate-400";

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {value.toFixed(1)}%
                    </span>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all duration-700", progressColor)}
                        style={{ width: `${Math.min(value, 100)}%` }}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{description}</p>
            </CardContent>
        </Card>
    );
}

// ============================================
// COMPONENT: AI Insights Card
// ============================================
function AIInsightsCard({ data }: { data: DashboardData }) {
    const topSupplier = data.kpis.suppliers.topExposure?.[0];

    return (
        <Card className="border-purple-200 dark:border-purple-800 bg-linear-to-br from-purple-50/50 to-white dark:from-purple-950/30 dark:to-slate-950">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Sparkle className="w-5 h-5 text-purple-500" />
                        Weekly Health Summary
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                        <Sparkle className="w-3 h-3 mr-1" />
                        AI Generated
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                    <strong className="text-slate-800 dark:text-slate-200">Financial Position:</strong>{" "}
                    {data.kpis.financial.totalCommitted > 0
                        ? `Your project has ${formatCurrency(data.kpis.financial.totalCommitted)} committed across all purchase orders. Currently, ${((data.kpis.financial.totalPaid / Math.max(data.kpis.financial.totalCommitted, 1)) * 100).toFixed(1)}% has been disbursed to suppliers.`
                        : "No financial commitments recorded yet. Create purchase orders to start tracking project spend."
                    }
                </p>

                <p>
                    <strong className="text-slate-800 dark:text-slate-200">Supplier Risk:</strong>{" "}
                    {topSupplier
                        ? `Exposure is concentrated with ${topSupplier.supplierName || "your top supplier"} at ${formatCurrency(topSupplier.exposure)}. ${data.kpis.suppliers.activeSuppliers > 1 ? `Diversification across ${data.kpis.suppliers.activeSuppliers} active suppliers helps mitigate single-source risk.` : "Consider diversifying across additional suppliers to reduce dependency."}`
                        : "No supplier exposure data available. Add suppliers and create POs to enable risk analysis."
                    }
                </p>

                <p>
                    <strong className="text-slate-800 dark:text-slate-200">Quality & Delivery:</strong>{" "}
                    {data.kpis.quality.totalNCRs > 0
                        ? `${data.kpis.quality.openNCRs} open NCRs require attention${data.kpis.quality.criticalNCRs > 0 ? `, including ${data.kpis.quality.criticalNCRs} critical issues` : ""}. `
                        : "Quality metrics are clean with no NCRs recorded. "
                    }
                    {data.kpis.logistics.totalShipments > 0
                        ? `Logistics performance is at ${data.kpis.logistics.onTimeRate.toFixed(0)}% on-time delivery${data.kpis.logistics.delayedShipments > 0 ? ` with ${data.kpis.logistics.delayedShipments} delayed shipments to address` : ""}.`
                        : "No shipments tracked yet."
                    }
                </p>
            </CardContent>
        </Card>
    );
}

// ============================================
// COMPONENT: Alert Card
// ============================================
interface Alert {
    id: string;
    title: string;
    description: string;
    severity: "critical" | "warning" | "info";
    icon: React.ElementType;
    value?: string;
}

function AlertCard({ alert, onClick }: { alert: Alert; onClick: () => void }) {
    const severityClasses = {
        critical: "border-l-red-500 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-950",
        warning: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-950",
        info: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-950",
    };

    const Icon = alert.icon;

    return (
        <Card
            className={cn(
                "border-l-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01]",
                severityClasses[alert.severity]
            )}
            onClick={onClick}
        >
            <CardContent className="py-4 flex items-center gap-4">
                <div className={cn(
                    "p-2 rounded-lg",
                    alert.severity === "critical" && "bg-red-100 dark:bg-red-900",
                    alert.severity === "warning" && "bg-amber-100 dark:bg-amber-900",
                    alert.severity === "info" && "bg-blue-100 dark:bg-blue-900"
                )}>
                    <Icon className={cn(
                        "w-5 h-5",
                        alert.severity === "critical" && "text-red-600",
                        alert.severity === "warning" && "text-amber-600",
                        alert.severity === "info" && "text-blue-600"
                    )} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {alert.title}
                    </h4>
                    <p className="text-sm text-muted-foreground truncate">{alert.description}</p>
                </div>
                {alert.value && (
                    <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"} className="font-mono">
                        {alert.value}
                    </Badge>
                )}
                <CaretRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
        </Card>
    );
}

// ============================================
// COMPONENT: Audit Row
// ============================================
function AuditRow({
    label,
    value,
    highlight,
    alert
}: {
    label: string;
    value: string;
    highlight?: boolean;
    alert?: boolean;
}) {
    return (
        <div className={cn(
            "flex items-center justify-between py-2",
            highlight && "border-t pt-3 mt-2"
        )}>
            <span className={cn(
                "text-sm",
                highlight ? "font-semibold text-slate-800 dark:text-slate-200" : "text-muted-foreground"
            )}>
                {label}
            </span>
            <span className={cn(
                "font-mono",
                highlight && "font-bold text-lg",
                alert && "text-red-600 dark:text-red-400",
                !highlight && !alert && "text-slate-700 dark:text-slate-300"
            )}>
                {value}
            </span>
        </div>
    );
}

// ============================================
// HELPER: Generate Alerts from Data
// ============================================
function generateAlerts(data: DashboardData): Alert[] {
    const alerts: Alert[] = [];

    if (data.kpis.payments.overdueInvoiceCount > 0) {
        alerts.push({
            id: "overdue-invoices",
            title: "Overdue Invoices",
            description: `${data.kpis.payments.overdueInvoiceCount} invoices past due date`,
            severity: "critical",
            icon: FileText,
            value: formatCurrency(data.kpis.payments.overdueAmount),
        });
    }

    if (data.kpis.quality.criticalNCRs > 0) {
        alerts.push({
            id: "critical-ncrs",
            title: "Critical Quality Issues",
            description: `${data.kpis.quality.criticalNCRs} critical NCRs require immediate action`,
            severity: "critical",
            icon: ShieldWarning,
            value: `${data.kpis.quality.criticalNCRs} NCRs`,
        });
    }

    if (data.kpis.logistics.delayedShipments > 0) {
        alerts.push({
            id: "delayed-shipments",
            title: "Delayed Shipments",
            description: `${data.kpis.logistics.delayedShipments} shipments behind schedule`,
            severity: "warning",
            icon: Truck,
            value: `Avg ${data.kpis.logistics.avgDeliveryDelay}d`,
        });
    }

    if (data.kpis.quality.openNCRs > 5) {
        alerts.push({
            id: "open-ncrs",
            title: "NCR Backlog",
            description: `${data.kpis.quality.openNCRs} NCRs awaiting resolution`,
            severity: "warning",
            icon: Warning,
            value: `${data.kpis.quality.openNCRs} open`,
        });
    }

    if (data.kpis.logistics.onTimeRate < 80 && data.kpis.logistics.totalShipments > 0) {
        alerts.push({
            id: "low-delivery-rate",
            title: "Low On-Time Delivery",
            description: "Delivery performance below 80% threshold",
            severity: "warning",
            icon: Truck,
            value: `${data.kpis.logistics.onTimeRate.toFixed(1)}%`,
        });
    }

    // Sort by severity
    return alerts.sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
    });
}

// ============================================
// MILESTONE TRACKER VIEW
// ============================================
function MilestoneTrackerView({
    milestones,
    onNavigateToPO
}: {
    milestones: MilestoneRow[];
    onNavigateToPO: (poId: string) => void;
}) {
    const [filter, setFilter] = useState<"all" | "delayed" | "at-risk" | "completed">("all");

    const filteredMilestones = milestones.filter(m => {
        if (filter === "all") return true;
        if (filter === "delayed") return m.status === "DELAYED" || (m.expectedDate && new Date(m.expectedDate) < new Date() && m.progressPercent < 100);
        if (filter === "at-risk") return m.status === "AT_RISK" || (m.progressPercent > 0 && m.progressPercent < 50);
        if (filter === "completed") return m.progressPercent >= 100 || m.status === "COMPLETED";
        return true;
    });

    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);
    const [milesCols, setMilesCols] = useState<string[]>(["poMilestone", "supplier", "progress", "status", "expected", "invoice", "amount"]);

    const MS_VIEW_DEF: Record<string, { label: string; hCls?: string; cCls?: string; cell: (m: MilestoneRow) => ReactNode }> = {
        poMilestone: { label: "PO / Milestone", cell: (m) => (<div><p className="font-medium text-slate-800 dark:text-slate-200">{m.poNumber}</p><p className="text-sm text-muted-foreground truncate max-w-[200px]">{m.milestoneName}</p></div>) },
        supplier: { label: "Supplier", cell: (m) => <span className="text-sm">{m.supplierName}</span> },
        progress: { label: "Progress", hCls: "text-center", cell: (m) => (<div className="flex items-center gap-2"><div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className={cn("h-full rounded-full transition-all", m.progressPercent >= 100 ? "bg-emerald-500" : m.progressPercent >= 50 ? "bg-amber-500" : "bg-slate-400")} style={{ width: `${Math.min(m.progressPercent, 100)}%` }} /></div><span className="text-sm font-mono w-12">{m.progressPercent.toFixed(0)}%</span></div>) },
        status: { label: "Status", hCls: "text-center", cCls: "text-center", cell: (m) => (<Badge variant={m.status === "COMPLETED" ? "default" : m.status === "DELAYED" ? "destructive" : m.status === "AT_RISK" ? "secondary" : "outline"} className="text-xs">{m.status}</Badge>) },
        expected: { label: "Expected", cell: (m) => <span className="text-sm">{m.expectedDate ? new Date(m.expectedDate).toLocaleDateString() : "—"}</span> },
        invoice: { label: "Invoice", cell: (m) => m.invoiceStatus ? (<Badge variant={m.invoiceStatus === "PAID" ? "default" : m.invoiceStatus === "APPROVED" ? "secondary" : "outline"} className="text-xs">{m.invoiceStatus}</Badge>) : (<span className="text-muted-foreground text-xs">No invoice</span>) },
        amount: { label: "Amount", hCls: "text-right", cCls: "text-right font-mono text-sm", cell: (m) => formatCurrency(m.amount) },
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                        Milestone Tracker
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Track milestone progress, invoices, and payment status
                    </p>
                </div>
                <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Milestones</SelectItem>
                        <SelectItem value="delayed">Delayed</SelectItem>
                        <SelectItem value="at-risk">At Risk</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {milesCols.map((col) => (
                                    <TableHead
                                        key={col}
                                        draggable
                                        onDragStart={() => setDragCol(col)}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                        onDragEnd={() => { if (dragCol && dragOverCol && dragCol !== dragOverCol) reorderCols(milesCols, dragCol, dragOverCol, setMilesCols); setDragCol(null); setDragOverCol(null); }}
                                        className={cn(MS_VIEW_DEF[col].hCls, "cursor-grab active:cursor-grabbing select-none", dragCol === col && "opacity-40 bg-muted/60", dragOverCol === col && dragCol !== col && "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]")}
                                    >
                                        <div className="flex items-center gap-1">
                                            <DotsSixVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                                            {MS_VIEW_DEF[col].label}
                                        </div>
                                    </TableHead>
                                ))}
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMilestones.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={milesCols.length + 1} className="text-center py-8 text-muted-foreground">
                                        No milestones found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMilestones.map((milestone, idx) => (
                                    <TableRow key={`${milestone.poId}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                        {milesCols.map((col) => (
                                            <TableCell key={col} className={MS_VIEW_DEF[col].cCls}>{MS_VIEW_DEF[col].cell(milestone)}</TableCell>
                                        ))}
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onNavigateToPO(milestone.poId)}
                                            >
                                                <ArrowSquareOut className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================
// RISK ASSESSMENT VIEW
// ============================================
function RiskAssessmentView({
    risks,
    cashflow,
    supplierProgress,
    onNavigateToPO,
    onNavigateToSupplier,
}: {
    risks: RiskAssessment[];
    cashflow: CashflowForecast[];
    supplierProgress: SupplierProgressRow[];
    onNavigateToPO: (poId: string) => void;
    onNavigateToSupplier: (supplierId: string) => void;
}) {
    const riskLevelColors = {
        LOW: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
        HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
        CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    };

    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);
    const [riskCols3, setRiskCols3] = useState<string[]>(["po", "supplier", "risk", "score", "delay"]);
    const [supRiskCols, setSupRiskCols] = useState<string[]>(["supplierName", "pos", "physical", "financial", "totalValue", "paid", "riskScore"]);

    const RISK_DEF3: Record<string, { label: string; hCls?: string; cCls?: string; cell: (r: RiskAssessment) => ReactNode }> = {
        po: { label: "PO", cell: (r) => <span className="font-medium">{r.poNumber}</span> },
        supplier: { label: "Supplier", cell: (r) => <span className="text-sm">{r.supplierName}</span> },
        risk: { label: "Risk", hCls: "text-center", cCls: "text-center", cell: (r) => <Badge className={riskLevelColors[r.riskLevel]}>{r.riskLevel}</Badge> },
        score: { label: "Score", hCls: "text-center", cCls: "text-center font-mono", cell: (r) => `${r.riskScore}/100` },
        delay: { label: "Delay", hCls: "text-center", cCls: "text-center text-sm", cell: (r) => r.predictedDelay > 0 ? `+${r.predictedDelay}d` : "On track" },
    };

    const SUP_RISK_DEF: Record<string, { label: string; hCls?: string; cCls?: string; cell: (s: SupplierProgressRow) => ReactNode }> = {
        supplierName: { label: "Supplier", cell: (s) => <span className="font-medium">{s.supplierName}</span> },
        pos: { label: "POs", hCls: "text-center", cCls: "text-center", cell: (s) => s.poCount },
        physical: { label: "Physical %", hCls: "text-center", cell: (s) => (<div className="flex items-center gap-2 justify-center"><div className="w-12 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(s.physicalProgress, 100)}%` }} /></div><span className="text-xs font-mono w-10">{s.physicalProgress.toFixed(0)}%</span></div>) },
        financial: { label: "Financial %", hCls: "text-center", cell: (s) => (<div className="flex items-center gap-2 justify-center"><div className="w-12 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(s.financialProgress, 100)}%` }} /></div><span className="text-xs font-mono w-10">{s.financialProgress.toFixed(0)}%</span></div>) },
        totalValue: { label: "Total Value", hCls: "text-right", cCls: "text-right font-mono text-sm", cell: (s) => formatCurrency(s.totalValue) },
        paid: { label: "Paid", hCls: "text-right", cCls: "text-right font-mono text-sm text-emerald-600", cell: (s) => formatCurrency(s.paidAmount) },
        riskScore: { label: "Risk", hCls: "text-center", cCls: "text-center", cell: (s) => (<Badge className={s.riskScore >= 60 ? "bg-red-100 text-red-700" : s.riskScore >= 40 ? "bg-orange-100 text-orange-700" : s.riskScore >= 20 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>{s.riskScore}</Badge>) },
    };

    return (
        <div className="space-y-6">
            {/* Risk Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-emerald-200 dark:border-emerald-800">
                    <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">Low Risk POs</p>
                        <p className="text-2xl font-bold text-emerald-600">{risks.filter(r => r.riskLevel === "LOW").length}</p>
                    </CardContent>
                </Card>
                <Card className="border-amber-200 dark:border-amber-800">
                    <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">Medium Risk</p>
                        <p className="text-2xl font-bold text-amber-600">{risks.filter(r => r.riskLevel === "MEDIUM").length}</p>
                    </CardContent>
                </Card>
                <Card className="border-orange-200 dark:border-orange-800">
                    <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">High Risk</p>
                        <p className="text-2xl font-bold text-orange-600">{risks.filter(r => r.riskLevel === "HIGH").length}</p>
                    </CardContent>
                </Card>
                <Card className="border-red-200 dark:border-red-800">
                    <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">Critical</p>
                        <p className="text-2xl font-bold text-red-600">{risks.filter(r => r.riskLevel === "CRITICAL").length}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* PO Risk Assessment */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">PO Risk Assessment</CardTitle>
                        <CardDescription>AI-driven risk scoring for active purchase orders</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {riskCols3.map((col) => (
                                        <TableHead
                                            key={col}
                                            draggable
                                            onDragStart={() => setDragCol(col)}
                                            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                            onDragEnd={() => { if (dragCol && dragOverCol && dragCol !== dragOverCol) reorderCols(riskCols3, dragCol, dragOverCol, setRiskCols3); setDragCol(null); setDragOverCol(null); }}
                                            className={cn(RISK_DEF3[col].hCls, "cursor-grab active:cursor-grabbing select-none", dragCol === col && "opacity-40 bg-muted/60", dragOverCol === col && dragCol !== col && "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]")}
                                        >
                                            <div className="flex items-center gap-1">
                                                <DotsSixVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                                                {RISK_DEF3[col].label}
                                            </div>
                                        </TableHead>
                                    ))}
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {risks.slice(0, 10).map((risk) => (
                                    <TableRow key={risk.poId} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                        {riskCols3.map((col) => (
                                            <TableCell key={col} className={RISK_DEF3[col].cCls}>{RISK_DEF3[col].cell(risk)}</TableCell>
                                        ))}
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onNavigateToPO(risk.poId)}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Cashflow Forecast */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Cashflow Forecast</CardTitle>
                        <CardDescription>Predicted payment exposure over next 90 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {cashflow.map((period) => (
                                <div key={period.period} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-sm">{period.period}</span>
                                        <span className="font-mono text-lg">{formatCurrency(period.expectedPayments + period.pendingInvoices)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                        <div>
                                            <span>Approved: </span>
                                            <span className="font-mono text-emerald-600">{formatCurrency(period.expectedPayments)}</span>
                                        </div>
                                        <div>
                                            <span>Pending: </span>
                                            <span className="font-mono text-amber-600">{formatCurrency(period.pendingInvoices)}</span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                                        <div
                                            className="h-full bg-emerald-500"
                                            style={{ width: `${(period.expectedPayments / Math.max(period.cumulativeExposure, 1)) * 100}%` }}
                                        />
                                        <div
                                            className="h-full bg-amber-400"
                                            style={{ width: `${(period.pendingInvoices / Math.max(period.cumulativeExposure, 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Supplier Performance */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Supplier Performance Scorecard</CardTitle>
                    <CardDescription>Physical vs financial progress by supplier</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {supRiskCols.map((col) => (
                                    <TableHead
                                        key={col}
                                        draggable
                                        onDragStart={() => setDragCol(col)}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                        onDragEnd={() => { if (dragCol && dragOverCol && dragCol !== dragOverCol) reorderCols(supRiskCols, dragCol, dragOverCol, setSupRiskCols); setDragCol(null); setDragOverCol(null); }}
                                        className={cn(SUP_RISK_DEF[col].hCls, "cursor-grab active:cursor-grabbing select-none", dragCol === col && "opacity-40 bg-muted/60", dragOverCol === col && dragCol !== col && "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]")}
                                    >
                                        <div className="flex items-center gap-1">
                                            <DotsSixVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                                            {SUP_RISK_DEF[col].label}
                                        </div>
                                    </TableHead>
                                ))}
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {supplierProgress.slice(0, 10).map((supplier) => (
                                <TableRow key={supplier.supplierId} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                    {supRiskCols.map((col) => (
                                        <TableCell key={col} className={SUP_RISK_DEF[col].cCls}>{SUP_RISK_DEF[col].cell(supplier)}</TableCell>
                                    ))}
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onNavigateToSupplier(supplier.supplierId)}
                                        >
                                            <ArrowSquareOut className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================
// COMPONENT: Dashboard Skeleton
// ============================================
function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Big Three Skeleton */}
            <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="border-l-4 border-l-slate-200">
                        <CardContent className="pt-6">
                            <Skeleton className="h-4 w-24 mb-3" />
                            <Skeleton className="h-10 w-40 mb-3" />
                            <Skeleton className="h-3 w-28" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Secondary Metrics Skeleton */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="py-4">
                            <Skeleton className="h-3 w-16 mb-2" />
                            <Skeleton className="h-6 w-20" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Progress Bars Skeleton */}
            <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="pt-5">
                            <div className="flex justify-between mb-3">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-6 w-16" />
                            </div>
                            <Skeleton className="h-2.5 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* S-Curve Skeleton */}
            <Card>
                <CardContent className="pt-6">
                    <Skeleton className="h-[350px] w-full" />
                </CardContent>
            </Card>
        </div>
    );
}
