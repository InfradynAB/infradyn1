"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
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
    CaretRight,
    Bell,
    ChartBar,
    MagnifyingGlass,
    Funnel,
    Buildings,
    ShieldWarning,
    Package,
    Truck,
    Receipt,
    ArrowUp,
    Lightning,
    Rows,
    Faders,
    DotsSixVertical,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Charts & Widgets
import { PortfolioDonut } from "./charts/portfolio-donut";
import { HealthGauge } from "./charts/health-gauge";
import { RiskHeatmap } from "./charts/risk-heatmap";
import { ProjectBarChart } from "./charts/project-bar-chart";
import { SupplierTrendChart } from "./charts/supplier-trend-chart";
import type { SupplierTrendPoint } from "./charts/supplier-trend-chart";
import { ApprovalsQueue } from "./widgets/approvals-queue";
import { ComplianceAlerts } from "./widgets/compliance-alerts";
import { SCurveChart } from "./s-curve-chart";
import { COImpactDonut } from "./co-impact-donut";
import { ExecutiveWorkspace } from "./executive-workspace";

import type { DashboardKPIs, SCurveDataPoint, COBreakdown } from "@/lib/services/kpi-engine";

// ============================================
// TYPES
// ============================================
interface DashboardData {
    kpis: DashboardKPIs;
    charts: {
        sCurve: SCurveDataPoint[];
        coBreakdown: COBreakdown;
    };
}

interface ProjectSummary {
    id: string;
    name: string;
    spend: number;
    percentage: number;
    status: "on-track" | "at-risk" | "delayed";
    physicalProgress: number;
    financialProgress: number;
    totalValue: number;
}

interface RiskItem {
    id: string;
    name: string;
    supplierRisk: 1 | 2 | 3 | 4 | 5;
    projectImpact: 1 | 2 | 3 | 4 | 5;
    category: string;
}

interface ApprovalItem {
    id: string;
    type: "invoice" | "change_order" | "milestone" | "ncr" | "document";
    title: string;
    reference: string;
    requestedBy: string;
    requestedAt: Date;
    amount?: number;
    priority: "low" | "normal" | "high" | "urgent";
    status: "pending" | "in-review" | "awaiting-info";
}

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

// ============================================
// SECTION NAV
// ============================================
const SECTIONS = [
    { id: "overview", label: "Overview", icon: ChartBar },
    { id: "projects", label: "Projects", icon: Buildings },
    { id: "approvals", label: "Approvals", icon: Bell },
    { id: "risks", label: "Risks & Alerts", icon: ShieldWarning },
    { id: "financials", label: "Financials", icon: CurrencyDollar },
    { id: "data", label: "All Metrics", icon: Receipt },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

// ============================================
// HELPERS
// ============================================
const fmt = (value: number | undefined | null, currency = "USD") => {
    const num = Number(value) || 0;
    if (num >= 1_000_000) return `${currency}  ${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${currency}  ${(num / 1_000).toFixed(1)}K`;
    return `${currency}  ${num.toFixed(0)}`;
};
const pct = (v: number | undefined | null, d = 1) => `${(Number(v) || 0).toFixed(d)}%`;
function reorderCols(arr: string[], from: string, to: string, set: React.Dispatch<React.SetStateAction<string[]>>) {
    const next = [...arr];
    const fi = next.indexOf(from);
    const ti = next.indexOf(to);
    if (fi < 0 || ti < 0 || fi === ti) return;
    next.splice(fi, 1);
    next.splice(ti, 0, from);
    set(next);
}

// ============================================
// MAIN COMPONENT
// ============================================
export function ExecutiveDashboardClient() {
    const pathname = usePathname();
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [risks, setRisks] = useState<RiskItem[]>([]);
    const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
    const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeframe, setTimeframe] = useState("all");
    const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
    const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
    const [projectFilter, setProjectFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [viewModes, setViewModes] = useState<Record<string, "chart" | "table">>({
        projects: "chart",
        approvals: "chart",
        risks: "chart",
        financials: "chart",
    });

    const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
        overview: null, projects: null, approvals: null, risks: null, financials: null, data: null,
    });

    const routeSection = useMemo<SectionId | null>(() => {
        const match = pathname.match(/^\/dashboard\/executive\/([^/?#]+)/);
        if (!match) return null;
        const candidate = match[1] as SectionId;
        return SECTIONS.some((section) => section.id === candidate) ? candidate : null;
    }, [pathname]);

    const toggleView = useCallback((section: string, mode: "chart" | "table") => {
        setViewModes((prev) => ({ ...prev, [section]: mode }));
    }, []);

    const [supplierTrend] = useState<SupplierTrendPoint[]>([
        { month: "Sep", "Supplier A": 82, "Supplier B": 75, "Supplier C": 90, "Supplier D": 68 },
        { month: "Oct", "Supplier A": 85, "Supplier B": 78, "Supplier C": 88, "Supplier D": 72 },
        { month: "Nov", "Supplier A": 80, "Supplier B": 80, "Supplier C": 92, "Supplier D": 65 },
        { month: "Dec", "Supplier A": 88, "Supplier B": 76, "Supplier C": 91, "Supplier D": 70 },
        { month: "Jan", "Supplier A": 90, "Supplier B": 82, "Supplier C": 89, "Supplier D": 74 },
        { month: "Feb", "Supplier A": 87, "Supplier B": 85, "Supplier C": 93, "Supplier D": 78 },
    ]);
    useEffect(() => {
        if (timeframe !== "custom") {
            setCustomFrom(undefined);
            setCustomTo(undefined);
            return;
        }

        if (!customFrom) setCustomFrom(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    }, [timeframe, customFrom]);

    // ── Fetch ──
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
            if (projectFilter !== "all") params.set("projectId", projectFilter);
            const res = await fetch(`/api/dashboard/analytics?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch dashboard data");
            const json = await res.json();
            if (!json.success || !json.data) throw new Error(json.error || "Invalid response");
            setData(json.data);

            const [pRes, rRes] = await Promise.all([
                fetch(`/api/dashboard/projects?${params.toString()}`),
                fetch(`/api/dashboard/risks?${params.toString()}`),
            ]);
            if (pRes.ok) { const pj = await pRes.json(); setProjects(pj.success && Array.isArray(pj.data) ? pj.data : []); }
            else setProjects([]);
            if (rRes.ok) {
                const rj = await rRes.json();
                if (rj.success) { setRisks(rj.data?.risks || []); setAlerts(rj.data?.alerts || []); setApprovals(rj.data?.approvals || []); }
            } else { setRisks(generateMockRisks()); setAlerts(generateMockAlerts(json.data.kpis)); setApprovals(generateMockApprovals()); }
        } catch (err) { setError(err instanceof Error ? err.message : "An error occurred"); }
        finally { setLoading(false); }
    }, [timeframe, projectFilter, customFrom, customTo]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const handleExport = async (format: "xlsx" | "csv" | "json") => {
        setExporting(true);
        try {
            const res = await fetch(`/api/dashboard/export?format=${format}&type=detailed`);
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url;
            a.download = `executive-dashboard-${new Date().toISOString().slice(0, 10)}.${format}`;
            a.click(); window.URL.revokeObjectURL(url);
            toast.success(`${format.toUpperCase()} exported`);
        } catch { toast.error("Export failed"); }
        finally { setExporting(false); }
    };

    const healthScore = data ? calcHealthScore(data.kpis) : 0;
    const healthBreakdown = data ? calcHealthBreakdown(data.kpis) : [];
    const urgentCount = approvals.filter(a => a.priority === "urgent").length;
    const currentSection: SectionId = routeSection ?? "overview";

    // ── Drag-to-reorder columns ──
    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);
    const [projCols, setProjCols] = useState(["project", "status", "contractValue", "spent", "physical", "financial", "link"]);
    const [approvCols, setApprovCols] = useState(["type", "title", "requestedBy", "requestedAt", "amount", "priority", "status"]);
    const [riskCols, setRiskCols] = useState(["risk", "category", "supplierRisk", "projectImpact"]);
    const [alertCols, setAlertCols] = useState(["alert", "severity", "entity"]);
    const [finCols, setFinCols] = useState(["metric", "value", "context"]);
    const finRows: { id: string; metric: string; value: string; context: string }[] = data ? [
        { id: "committed", metric: "Total Committed", value: fmt(data.kpis.financial.totalCommitted), context: "Approved portfolio commitment" },
        { id: "paid", metric: "Total Paid", value: fmt(data.kpis.financial.totalPaid), context: "Invoices processed" },
        { id: "unpaid", metric: "Total Unpaid", value: fmt(data.kpis.financial.totalUnpaid), context: "Open payment obligations" },
        { id: "retention", metric: "Retention Held", value: fmt(data.kpis.financial.retentionHeld), context: "Held against contractual milestones" },
        { id: "co", metric: "Change Order Impact", value: fmt(data.kpis.financial.changeOrderImpact), context: "Budget variation pressure" },
    ] : [];
    const PROJ_DEF: Record<string, { label: string; hCls?: string; cCls?: string; cell: (p: ProjectSummary) => React.ReactNode }> = {
        project: { label: "Project", cCls: "font-semibold", cell: (p) => p.name },
        status: { label: "Status", cell: (p) => <StatusBadge status={p.status} /> },
        contractValue: { label: "Contract Value", hCls: "text-right", cCls: "text-right font-mono text-sm tabular-nums", cell: (p) => fmt(p.totalValue) },
        spent: { label: "Spent", hCls: "text-right", cCls: "text-right font-mono text-sm tabular-nums", cell: (p) => fmt(p.spend) },
        physical: { label: "Physical", cell: (p) => <ProgressBar value={p.physicalProgress} showLabel /> },
        financial: { label: "Financial", cell: (p) => <ProgressBar value={p.financialProgress} showLabel /> },
        link: { label: "", cCls: "", cell: () => <CaretRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" /> },
    };
    const APPROV_DEF: Record<string, { label: string; hCls?: string; cCls?: string; cell: (a: ApprovalItem) => React.ReactNode }> = {
        type: { label: "Type", cCls: "uppercase text-xs font-semibold text-muted-foreground", cell: (a) => a.type.replace("_", " ") },
        title: { label: "Title", cCls: "font-medium", cell: (a) => a.title },
        requestedBy: { label: "Requested By", cell: (a) => a.requestedBy },
        requestedAt: { label: "Requested At", cCls: "text-muted-foreground", cell: (a) => new Date(a.requestedAt).toLocaleDateString() },
        amount: { label: "Amount", hCls: "text-right", cCls: "text-right font-mono", cell: (a) => a.amount ? fmt(a.amount) : "\u2014" },
        priority: { label: "Priority", cell: (a) => <Badge variant="outline" className="capitalize">{a.priority}</Badge> },
        status: { label: "Status", cell: (a) => <Badge variant="secondary" className="capitalize">{a.status.replace("-", " ")}</Badge> },
    };
    const RISK_DEF: Record<string, { label: string; hCls?: string; cCls?: string; cell: (r: RiskItem) => React.ReactNode }> = {
        risk: { label: "Risk", cCls: "font-medium", cell: (r) => r.name },
        category: { label: "Category", cell: (r) => r.category },
        supplierRisk: { label: "Supplier Risk", hCls: "text-right", cCls: "text-right font-mono", cell: (r) => r.supplierRisk },
        projectImpact: { label: "Project Impact", hCls: "text-right", cCls: "text-right font-mono", cell: (r) => r.projectImpact },
    };
    const ALERT_DEF: Record<string, { label: string; hCls?: string; cCls?: string; cell: (a: ComplianceAlert) => React.ReactNode }> = {
        alert: { label: "Alert", cCls: "font-medium", cell: (a) => a.title },
        severity: { label: "Severity", cell: (a) => <Badge variant={a.severity === "critical" ? "destructive" : "outline"} className="capitalize">{a.severity}</Badge> },
        entity: { label: "Entity", cCls: "text-muted-foreground", cell: (a) => a.relatedEntity },
    };
    const FIN_DEF: Record<string, { label: string; hCls?: string; cCls?: string; cell: (r: { id: string; metric: string; value: string; context: string }) => React.ReactNode }> = {
        metric: { label: "Metric", cell: (r) => r.metric },
        value: { label: "Value", hCls: "text-right", cCls: "text-right font-mono", cell: (r) => r.value },
        context: { label: "Context", cCls: "text-muted-foreground", cell: (r) => r.context },
    };
    const tableDatasets = useMemo(() => {
        if (!data) {
            return {
                overview: [],
                projects: [],
                approvals: [],
                risks: [],
                financials: [],
                data: [],
            };
        }

        const metricRows = buildMetricRows(data.kpis);

        return {
            overview: [
                { metric: "Total Committed", category: "Financial", value: fmt(data.kpis.financial.totalCommitted) },
                { metric: "Total Paid", category: "Financial", value: fmt(data.kpis.financial.totalPaid) },
                { metric: "Total Unpaid", category: "Financial", value: fmt(data.kpis.financial.totalUnpaid) },
                { metric: "Portfolio Health", category: "Health", value: `${healthScore.toFixed(0)}/100` },
                { metric: "On-Time Delivery", category: "Logistics", value: pct(data.kpis.logistics.onTimeRate) },
                { metric: "NCR Rate", category: "Quality", value: pct(data.kpis.quality.ncrRate) },
            ],
            projects: projects.map((p) => ({
                project: p.name,
                status: p.status,
                contractValue: fmt(p.totalValue),
                spent: fmt(p.spend),
                physicalProgress: `${p.physicalProgress.toFixed(0)}%`,
                financialProgress: `${p.financialProgress.toFixed(0)}%`,
            })),
            approvals: (approvals.length > 0 ? approvals : generateMockApprovals()).map((item) => ({
                type: item.type,
                title: item.title,
                requestedBy: item.requestedBy,
                requestedAt: new Date(item.requestedAt).toLocaleDateString(),
                amount: item.amount ? fmt(item.amount) : "—",
                priority: item.priority,
                status: item.status,
            })),
            risks: [
                ...(risks.length > 0 ? risks : generateMockRisks()).map((risk) => ({
                    kind: "risk",
                    risk: risk.name,
                    category: risk.category,
                    supplierRisk: risk.supplierRisk,
                    projectImpact: risk.projectImpact,
                })),
                ...(alerts.length > 0 ? alerts : generateMockAlerts(data.kpis)).map((alert) => ({
                    kind: "alert",
                    risk: alert.title,
                    category: alert.type,
                    supplierRisk: "—",
                    projectImpact: alert.severity,
                })),
            ],
            financials: [
                { metric: "Total Committed", value: fmt(data.kpis.financial.totalCommitted), context: "Approved portfolio commitment" },
                { metric: "Total Paid", value: fmt(data.kpis.financial.totalPaid), context: "Invoices processed" },
                { metric: "Total Unpaid", value: fmt(data.kpis.financial.totalUnpaid), context: "Open payment obligations" },
                { metric: "Retention Held", value: fmt(data.kpis.financial.retentionHeld), context: "Held against contractual milestones" },
                { metric: "Change Order Impact", value: fmt(data.kpis.financial.changeOrderImpact), context: "Budget variation pressure" },
            ],
            data: metricRows,
        };
    }, [data, projects, approvals, risks, alerts, healthScore]);

    // ── Error ──
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="w-full max-w-md rounded-2xl shadow-xl border-destructive/20">
                    <CardContent className="pt-10 pb-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center mx-auto mb-5">
                            <Warning className="w-8 h-8 text-red-600 dark:text-red-400" weight="duotone" />
                        </div>
                        <p className="text-lg font-bold">Something went wrong</p>
                        <p className="text-sm text-muted-foreground mt-1.5 mb-6">{error}</p>
                        <Button onClick={fetchDashboard} variant="outline" className="rounded-xl">
                            <ArrowsClockwise className="w-4 h-4 mr-2" /> Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════
    return (
        <div className="relative">
            {/* ─── STICKY HEADER ─── */}
            <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-2xl border-b border-border/60 -mx-4 px-4 lg:-mx-6 lg:px-6">
                <div className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                            <Buildings className="w-5 h-5 text-primary-foreground" weight="bold" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight leading-none">Executive Dashboard</h1>
                            <p className="text-xs text-muted-foreground mt-0.5">Real-time portfolio intelligence</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Select value={projectFilter} onValueChange={setProjectFilter}>
                            <SelectTrigger className="w-[150px] h-9 text-xs rounded-xl border-border/60 bg-card">
                                <Funnel className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                <SelectValue placeholder="All Projects" />
                            </SelectTrigger>
                            <SelectContent><SelectItem value="all">All Projects</SelectItem>
                                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={timeframe} onValueChange={setTimeframe}>
                            <SelectTrigger className="w-[130px] h-9 text-xs rounded-xl border-border/60 bg-card">
                                <CalendarBlank className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
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
                                    className="w-[150px] h-9 text-xs rounded-xl"
                                />
                                <DatePicker
                                    value={customTo}
                                    onChange={setCustomTo}
                                    placeholder="To"
                                    className="w-[150px] h-9 text-xs rounded-xl"
                                />
                            </div>
                        )}
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={fetchDashboard}>
                            <ArrowsClockwise className={cn("w-4 h-4", loading && "animate-spin")} />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-xl text-xs gap-1.5 px-3.5 bg-card"
                            onClick={() => {
                                const params = new URLSearchParams({
                                    source: "executive",
                                    timeframe,
                                });
                                if (timeframe === "custom" && customFrom) {
                                    params.set("dateFrom", customFrom.toISOString());
                                    params.set("dateTo", (customTo ?? new Date()).toISOString());
                                }
                                if (projectFilter !== "all") {
                                    params.set("projectId", projectFilter);
                                }
                                router.push(`/dashboard/export?${params.toString()}`);
                            }}
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* ─── NAV PILLS ─── */}
                <div className="flex items-center gap-1.5 pb-3 overflow-x-auto scrollbar-none">
                    {SECTIONS.map((s) => {
                        const Icon = s.icon;
                        const active = currentSection === s.id;
                        return (
                            <button
                                key={s.id}
                                onClick={() => {
                                    const target = s.id === "overview" ? "/dashboard/executive" : `/dashboard/executive/${s.id}`;
                                    router.push(target);
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap",
                                    active
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className="w-4 h-4" weight={active ? "fill" : "duotone"} />
                                {s.label}
                                {s.id === "approvals" && urgentCount > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">{urgentCount}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── BODY ─── */}
            {loading ? <DashboardSkeleton /> : data ? (
                <ExecutiveWorkspace datasets={tableDatasets} initialDataset={currentSection}>
                    <div className="space-y-12 pt-8 pb-24">

                        {/* ═══════════ SECTION 1: OVERVIEW ═══════════ */}
                        <section id="overview" ref={(el) => { sectionRefs.current.overview = el; }} className={cn("scroll-mt-32 space-y-6", currentSection !== "overview" && "hidden")}>

                            {/* KPI Cards */}
                            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                                <GlowKPI
                                    label="Total Committed"
                                    value={fmt(data.kpis.financial.totalCommitted)}
                                    trend="+6%"
                                    trendDir="up"
                                    sideStat={`${projects.length}`}
                                    sideLabel="active projects"
                                    subText={`${data.kpis.progress.activePOs} active POs`}
                                    subHref="/dashboard/executive/projects"
                                />
                                <GlowKPI
                                    label="Total Paid"
                                    value={fmt(data.kpis.financial.totalPaid)}
                                    trend="+4.2%"
                                    trendDir="up"
                                    sideStat={pct((data.kpis.financial.totalPaid / Math.max(data.kpis.financial.totalCommitted, 1)) * 100)}
                                    sideLabel="paid / committed"
                                    subText={`${data.kpis.payments.pendingInvoiceCount} pending invoices`}
                                    subHref="/dashboard/executive/financials"
                                />
                                <GlowKPI
                                    label="Unpaid / Pending"
                                    value={fmt(data.kpis.financial.totalUnpaid)}
                                    trend={data.kpis.financial.totalUnpaid > data.kpis.financial.totalPaid ? "High" : "Normal"}
                                    trendDir={data.kpis.financial.totalUnpaid > data.kpis.financial.totalPaid ? "alert" : "neutral"}
                                    sideStat={`${data.kpis.payments.overdueInvoiceCount}`}
                                    sideLabel="overdue invoices"
                                    subText={fmt(data.kpis.payments.overdueAmount)}
                                    subHref="/dashboard/executive/financials"
                                />
                                <GlowKPI
                                    label="Health Score"
                                    value={`${healthScore.toFixed(0)}/100`}
                                    trend={healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "Fair" : "Critical"}
                                    trendDir={healthScore >= 70 ? "up" : healthScore >= 40 ? "neutral" : "alert"}
                                    sideStat={`${data.kpis.quality.criticalNCRs}`}
                                    sideLabel="critical NCRs"
                                    subText={`${data.kpis.logistics.delayedShipments} delayed shipments`}
                                    subHref="/dashboard/executive/risks"
                                />
                            </div>

                            {/* Health + Portfolio */}
                            <div className="grid gap-5 lg:grid-cols-2">
                                <GlowCard><HealthGauge score={healthScore} label="Procurement Health" breakdown={healthBreakdown} /></GlowCard>
                                <GlowCard>
                                    <PortfolioDonut
                                        data={projects.map(p => ({ id: p.id, name: p.name, spend: p.spend, percentage: p.percentage, status: p.status }))}
                                        totalSpend={data.kpis.financial.totalCommitted}
                                    />
                                </GlowCard>
                            </div>

                            {/* Secondary KPIs */}
                            <div className="grid gap-3 grid-cols-3 md:grid-cols-6">
                                <MiniKPI icon={Package} label="Active POs" value={`${data.kpis.progress.activePOs}/${data.kpis.progress.totalPOs}`} />
                                <MiniKPI icon={CurrencyDollar} label="Retention" value={fmt(data.kpis.financial.retentionHeld)} />
                                <MiniKPI icon={ShieldWarning} label="NCR Rate" value={pct(data.kpis.quality.ncrRate)} alert={data.kpis.quality.ncrRate > 5} />
                                <MiniKPI icon={Truck} label="On-Time" value={pct(data.kpis.logistics.onTimeRate)} alert={data.kpis.logistics.onTimeRate < 80} />
                                <MiniKPI icon={Receipt} label="Overdue" value={`${data.kpis.payments.overdueInvoiceCount}`} alert={data.kpis.payments.overdueInvoiceCount > 0} />
                                <MiniKPI icon={Clock} label="Avg Pay" value={`${data.kpis.payments.avgPaymentCycleDays}d`} />
                            </div>
                        </section>

                        {/* ═══════════ SECTION 2: PROJECTS ═══════════ */}
                        <section id="projects" ref={(el) => { sectionRefs.current.projects = el; }} className={cn("scroll-mt-32 space-y-5", currentSection !== "projects" && "hidden")}>
                            <SectionHeader
                                icon={Buildings}
                                iconBg="bg-indigo-100 dark:bg-indigo-500/20"
                                iconColor="text-indigo-600 dark:text-indigo-400"
                                title="Projects"
                                subtitle={`${projects.length} active projects across your portfolio`}
                                rightContent={<ViewToggle section="projects" current={viewModes.projects} onChange={toggleView} />}
                            />
                            {viewModes.projects === "chart" ? (
                                <GlowCard><ProjectBarChart data={projects} onProjectClick={(id) => router.push(`/dashboard/projects/${id}`)} /></GlowCard>
                            ) : (
                                <>
                                    <ExplainView
                                        title="Projects Table View"
                                        description="Compare project health and spend line-by-line. You can sort and scan contract value, actual spend, and progress columns before exporting."
                                        columns={["Project", "Status", "Contract Value", "Spent", "Physical", "Financial"]}
                                        onExport={() => handleExport("xlsx")}
                                    />
                                    <GlowCard noPad>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/40 dark:bg-muted/20">
                                                    {projCols.map(col => (
                                                        <TableHead key={col} draggable
                                                            onDragStart={() => setDragCol(col)}
                                                            onDragOver={e => { e.preventDefault(); setDragOverCol(col); }}
                                                            onDrop={() => { reorderCols(projCols, dragCol!, col, setProjCols); setDragCol(null); setDragOverCol(null); }}
                                                            onDragEnd={() => { setDragCol(null); setDragOverCol(null); }}
                                                            className={cn("font-semibold text-xs uppercase tracking-wider cursor-grab active:cursor-grabbing select-none", PROJ_DEF[col].hCls,
                                                                dragCol === col && "opacity-40 bg-muted/60",
                                                                dragOverCol === col && dragCol !== col && "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]",
                                                            )}>
                                                            {col === "link" ? <span className="w-10" /> : <span className="flex items-center gap-1"><DotsSixVertical className="w-3 h-3 text-muted-foreground/50 shrink-0" />{PROJ_DEF[col].label}</span>}
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {projects.length === 0 ? (
                                                    <TableRow><TableCell colSpan={projCols.length} className="text-center py-10 text-muted-foreground">No projects found</TableCell></TableRow>
                                                ) : projects.map((p) => (
                                                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30 transition-colors group" onClick={() => router.push(`/dashboard/projects/${p.id}`)}>
                                                        {projCols.map(col => <TableCell key={col} className={PROJ_DEF[col].cCls}>{PROJ_DEF[col].cell(p)}</TableCell>)}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </GlowCard>
                                </>
                            )}
                        </section>

                        {/* ═══════════ SECTION 3: APPROVALS ═══════════ */}
                        <section id="approvals" ref={(el) => { sectionRefs.current.approvals = el; }} className={cn("scroll-mt-32 space-y-5", currentSection !== "approvals" && "hidden")}>
                            <SectionHeader
                                icon={Bell} iconBg="bg-amber-100 dark:bg-amber-500/20" iconColor="text-amber-600 dark:text-amber-400"
                                title="Pending Approvals"
                                subtitle={`${approvals.length} items awaiting your action`}
                                badge={urgentCount > 0 ? { label: `${urgentCount} Urgent`, variant: "destructive" as const } : undefined}
                                rightContent={<ViewToggle section="approvals" current={viewModes.approvals} onChange={toggleView} />}
                            />
                            {viewModes.approvals === "chart" ? (
                                <GlowCard>
                                    <ApprovalsQueue data={approvals.length > 0 ? approvals : generateMockApprovals()} onReview={(id) => console.log("Review:", id)} />
                                </GlowCard>
                            ) : (
                                <>
                                    <ExplainView
                                        title="Approvals Table View"
                                        description="Track who requested each approval, its priority, and financial exposure. Use this list to process queues quickly and export for follow-ups."
                                        columns={["Type", "Title", "Requested By", "Requested At", "Amount", "Priority", "Status"]}
                                        onExport={() => handleExport("csv")}
                                    />
                                    <GlowCard noPad>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/40 dark:bg-muted/20">
                                                    {approvCols.map(col => (
                                                        <TableHead key={col} draggable
                                                            onDragStart={() => setDragCol(col)}
                                                            onDragOver={e => { e.preventDefault(); setDragOverCol(col); }}
                                                            onDrop={() => { reorderCols(approvCols, dragCol!, col, setApprovCols); setDragCol(null); setDragOverCol(null); }}
                                                            onDragEnd={() => { setDragCol(null); setDragOverCol(null); }}
                                                            className={cn("font-semibold text-xs uppercase tracking-wider cursor-grab active:cursor-grabbing select-none", APPROV_DEF[col].hCls,
                                                                dragCol === col && "opacity-40 bg-muted/60",
                                                                dragOverCol === col && dragCol !== col && "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]",
                                                            )}>
                                                            <span className="flex items-center gap-1"><DotsSixVertical className="w-3 h-3 text-muted-foreground/50 shrink-0" />{APPROV_DEF[col].label}</span>
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(approvals.length > 0 ? approvals : generateMockApprovals()).map((item) => (
                                                    <TableRow key={item.id} className="hover:bg-muted/20">
                                                        {approvCols.map(col => <TableCell key={col} className={APPROV_DEF[col].cCls}>{APPROV_DEF[col].cell(item)}</TableCell>)}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </GlowCard>
                                </>
                            )}
                        </section>

                        {/* ═══════════ SECTION 4: RISKS ═══════════ */}
                        <section id="risks" ref={(el) => { sectionRefs.current.risks = el; }} className={cn("scroll-mt-32 space-y-5", currentSection !== "risks" && "hidden")}>
                            <SectionHeader
                                icon={ShieldWarning} iconBg="bg-red-100 dark:bg-red-500/20" iconColor="text-red-600 dark:text-red-400"
                                title="Risks & Compliance"
                                subtitle="Supplier risk matrix, compliance alerts, and trend analysis"
                                badge={alerts.filter(a => a.severity === "critical").length > 0 ? { label: `${alerts.filter(a => a.severity === "critical").length} Critical`, variant: "destructive" as const } : undefined}
                                rightContent={<ViewToggle section="risks" current={viewModes.risks} onChange={toggleView} />}
                            />
                            {viewModes.risks === "chart" ? (
                                <>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <RiskStatCard icon={Lightning} title="Critical NCRs" value={data.kpis.quality.criticalNCRs} subtitle={`${data.kpis.quality.openNCRs} open · ${data.kpis.quality.closedNCRs} closed`} alert={data.kpis.quality.criticalNCRs > 0} color="red" />
                                        <RiskStatCard icon={Truck} title="Delayed Shipments" value={data.kpis.logistics.delayedShipments} subtitle={`Avg delay: ${data.kpis.logistics.avgDeliveryDelay}d`} alert={data.kpis.logistics.delayedShipments > 0} color="amber" />
                                        <RiskStatCard icon={Receipt} title="Overdue Payments" value={data.kpis.payments.overdueInvoiceCount} subtitle={`${fmt(data.kpis.payments.overdueAmount)} outstanding`} alert={data.kpis.payments.overdueInvoiceCount > 0} color="orange" />
                                    </div>
                                    <div className="grid gap-5 lg:grid-cols-2">
                                        <GlowCard><RiskHeatmap data={risks} onCellClick={(items) => console.log("Risk:", items)} /></GlowCard>
                                        <GlowCard><ComplianceAlerts data={alerts} onAlertClick={(a) => console.log("Alert:", a)} /></GlowCard>
                                    </div>
                                    <GlowCard><SupplierTrendChart data={supplierTrend} suppliers={[]} /></GlowCard>
                                </>
                            ) : (
                                <>
                                    <ExplainView
                                        title="Risks Table View"
                                        description="Review risk severity and compliance alerts as rows. This is optimized for operational follow-up and export to external action trackers."
                                        columns={["Risk", "Category", "Supplier Risk", "Project Impact", "Alert Severity", "Related Entity"]}
                                        onExport={() => handleExport("xlsx")}
                                    />
                                    <div className="grid gap-5 lg:grid-cols-2">
                                        <GlowCard noPad>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted/40 dark:bg-muted/20">
                                                        {riskCols.map(col => (
                                                            <TableHead key={col} draggable
                                                                onDragStart={() => setDragCol(col)}
                                                                onDragOver={e => { e.preventDefault(); setDragOverCol(col); }}
                                                                onDrop={() => { reorderCols(riskCols, dragCol!, col, setRiskCols); setDragCol(null); setDragOverCol(null); }}
                                                                onDragEnd={() => { setDragCol(null); setDragOverCol(null); }}
                                                                className={cn("font-semibold text-xs uppercase tracking-wider cursor-grab active:cursor-grabbing select-none", RISK_DEF[col].hCls,
                                                                    dragCol === col && "opacity-40 bg-muted/60",
                                                                    dragOverCol === col && dragCol !== col && "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]",
                                                                )}>
                                                                <span className="flex items-center gap-1"><DotsSixVertical className="w-3 h-3 text-muted-foreground/50 shrink-0" />{RISK_DEF[col].label}</span>
                                                            </TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(risks.length > 0 ? risks : generateMockRisks()).map((risk) => (
                                                        <TableRow key={risk.id} className="hover:bg-muted/20">
                                                            {riskCols.map(col => <TableCell key={col} className={RISK_DEF[col].cCls}>{RISK_DEF[col].cell(risk)}</TableCell>)}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </GlowCard>
                                        <GlowCard noPad>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted/40 dark:bg-muted/20">
                                                        {alertCols.map(col => (
                                                            <TableHead key={col} draggable
                                                                onDragStart={() => setDragCol(col)}
                                                                onDragOver={e => { e.preventDefault(); setDragOverCol(col); }}
                                                                onDrop={() => { reorderCols(alertCols, dragCol!, col, setAlertCols); setDragCol(null); setDragOverCol(null); }}
                                                                onDragEnd={() => { setDragCol(null); setDragOverCol(null); }}
                                                                className={cn("font-semibold text-xs uppercase tracking-wider cursor-grab active:cursor-grabbing select-none", ALERT_DEF[col].hCls,
                                                                    dragCol === col && "opacity-40 bg-muted/60",
                                                                    dragOverCol === col && dragCol !== col && "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]",
                                                                )}>
                                                                <span className="flex items-center gap-1"><DotsSixVertical className="w-3 h-3 text-muted-foreground/50 shrink-0" />{ALERT_DEF[col].label}</span>
                                                            </TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(alerts.length > 0 ? alerts : generateMockAlerts(data.kpis)).map((alert) => (
                                                        <TableRow key={alert.id} className="hover:bg-muted/20">
                                                            {alertCols.map(col => <TableCell key={col} className={ALERT_DEF[col].cCls}>{ALERT_DEF[col].cell(alert)}</TableCell>)}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </GlowCard>
                                    </div>
                                </>
                            )}
                        </section>

                        {/* ═══════════ SECTION 5: FINANCIALS ═══════════ */}
                        <section id="financials" ref={(el) => { sectionRefs.current.financials = el; }} className={cn("scroll-mt-32 space-y-5", currentSection !== "financials" && "hidden")}>
                            <SectionHeader
                                icon={CurrencyDollar}
                                iconBg="bg-emerald-100 dark:bg-emerald-500/20"
                                iconColor="text-emerald-600 dark:text-emerald-400"
                                title="Financial Intelligence"
                                subtitle="Spend curves, change orders, and payment analytics"
                                rightContent={<ViewToggle section="financials" current={viewModes.financials} onChange={toggleView} />}
                            />
                            {viewModes.financials === "chart" ? (
                                <>
                                    <div className="grid gap-5 lg:grid-cols-2">
                                        <GlowCard><SCurveChart data={data.charts.sCurve} /></GlowCard>
                                        <GlowCard><COImpactDonut data={data.charts.coBreakdown} /></GlowCard>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-4">
                                        <FinCard label="Total Committed" value={fmt(data.kpis.financial.totalCommitted)} icon={CurrencyDollar} />
                                        <FinCard label="Total Invoiced" value={fmt(data.kpis.financial.totalPaid)} icon={CheckCircle} />
                                        <FinCard label="Retention Held" value={fmt(data.kpis.financial.retentionHeld)} icon={Clock} />
                                        <FinCard label="CO Impact" value={fmt(data.kpis.financial.changeOrderImpact)} icon={Lightning} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <ExplainView
                                        title="Financial Table View"
                                        description="This table gives a finance-first snapshot for committed, paid, unpaid, retention and change-order impact. Use it to export quickly for leadership review."
                                        columns={["Metric", "Value", "Context"]}
                                        onExport={() => handleExport("csv")}
                                    />
                                    <GlowCard noPad>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/40 dark:bg-muted/20">
                                                    {finCols.map(col => (
                                                        <TableHead key={col} draggable
                                                            onDragStart={() => setDragCol(col)}
                                                            onDragOver={e => { e.preventDefault(); setDragOverCol(col); }}
                                                            onDrop={() => { reorderCols(finCols, dragCol!, col, setFinCols); setDragCol(null); setDragOverCol(null); }}
                                                            onDragEnd={() => { setDragCol(null); setDragOverCol(null); }}
                                                            className={cn("font-semibold text-xs uppercase tracking-wider cursor-grab active:cursor-grabbing select-none", FIN_DEF[col].hCls,
                                                                dragCol === col && "opacity-40 bg-muted/60",
                                                                dragOverCol === col && dragCol !== col && "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]",
                                                            )}>
                                                            <span className="flex items-center gap-1"><DotsSixVertical className="w-3 h-3 text-muted-foreground/50 shrink-0" />{FIN_DEF[col].label}</span>
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {finRows.map(r => (
                                                    <TableRow key={r.id} className="hover:bg-muted/20">
                                                        {finCols.map(col => <TableCell key={col} className={FIN_DEF[col].cCls}>{FIN_DEF[col].cell(r)}</TableCell>)}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </GlowCard>
                                </>
                            )}
                        </section>

                        {/* ═══════════ SECTION 6: ALL METRICS ═══════════ */}
                        <section id="data" ref={(el) => { sectionRefs.current.data = el; }} className={cn("scroll-mt-32 space-y-5", currentSection !== "data" && "hidden")}>
                            <SectionHeader icon={Receipt} iconBg="bg-slate-200 dark:bg-slate-500/20" iconColor="text-slate-600 dark:text-slate-400" title="All Metrics" subtitle="Complete KPI breakdown across every category" />
                            <ExplainView
                                title="Metrics Table View"
                                description="Use search to filter KPI rows by category or metric name. This view is optimized for auditing and quick exports."
                                columns={["Category", "Metric", "Value"]}
                                onExport={() => handleExport("xlsx")}
                            />
                            <div className="relative max-w-sm">
                                <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder="Search metrics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10 rounded-xl text-sm bg-card" />
                            </div>
                            <GlowCard noPad><MetricsTable kpis={data.kpis} searchQuery={searchQuery} /></GlowCard>
                        </section>

                        <div className="flex justify-center pt-6">
                            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-2 rounded-xl hover:bg-muted" onClick={() => router.push("/dashboard/executive")}>
                                <ArrowUp className="w-4 h-4" /> Back to top
                            </Button>
                        </div>
                    </div>
                </ExecutiveWorkspace>
            ) : null}
        </div>
    );
}

// ============================================
// PREMIUM CARD WRAPPER
// ============================================
function GlowCard({ children, noPad, className }: { children: React.ReactNode; noPad?: boolean; className?: string }) {
    return (
        <div className={cn(
            "rounded-2xl border border-border/60 bg-card shadow-sm",
            "hover:shadow-md hover:shadow-primary/5 transition-all duration-300",
            !noPad && "p-1",
            className,
        )}>
            {children}
        </div>
    );
}

// ============================================
// KPI CARD — the hero card with big icon, value, trend
// ============================================
function GlowKPI({
    label, value, trend, trendDir, sideStat, sideLabel, subText, subHref,
}: {
    label: string;
    value: string;
    trend: string;
    trendDir: "up" | "down" | "alert" | "neutral";
    sideStat?: string;
    sideLabel?: string;
    subText?: string;
    subHref?: string;
}) {
    return (
        <div className={cn(
            "rounded-2xl border border-border/60 bg-card p-3.5 lg:p-4",
            "shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group",
        )}>
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-foreground/90 leading-tight">{label}</p>
                {trend && (
                    <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl",
                        trendDir === "up" && "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15",
                        trendDir === "down" && "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-500/15",
                        trendDir === "alert" && "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15",
                        trendDir === "neutral" && "text-muted-foreground bg-muted",
                    )}>
                        {trendDir === "up" && <TrendUp className="w-3.5 h-3.5" weight="bold" />}
                        {trendDir === "down" && <TrendDown className="w-3.5 h-3.5" weight="bold" />}
                        {trendDir === "alert" && <Warning className="w-3.5 h-3.5" weight="bold" />}
                        {trend}
                    </span>
                )}
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-[1.75rem] lg:text-[1.95rem] font-semibold font-sans tracking-tight tabular-nums leading-none">{value}</p>
                {sideStat && (
                    <div className="text-right">
                        <p className="text-[1.85rem] font-medium font-sans tabular-nums leading-none">{sideStat}</p>
                    </div>
                )}
            </div>

            {(subText || sideLabel) && (
                <div className="mt-1.5 flex items-end justify-between gap-2">
                    {subText ? (
                        subHref ? (
                            <Link href={subHref} className="text-xs text-muted-foreground truncate hover:text-foreground underline-offset-2 hover:underline">
                                {subText}
                            </Link>
                        ) : (
                            <p className="text-xs text-muted-foreground truncate">{subText}</p>
                        )
                    ) : <span />}
                    {sideLabel && <p className="text-xs text-muted-foreground text-right">{sideLabel}</p>}
                </div>
            )}
        </div>
    );
}

// ============================================
// MINI KPI
// ============================================
function MiniKPI({ icon: Icon, label, value, alert }: { icon: React.ElementType; label: string; value: string; alert?: boolean }) {
    return (
        <div className={cn(
            "rounded-xl border p-3.5 transition-all duration-200",
            alert
                ? "border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-500/5"
                : "border-border/60 bg-card hover:bg-muted/30",
        )}>
            <div className="flex items-center gap-2 mb-1.5">
                <Icon className={cn("w-4 h-4", alert ? "text-red-500" : "text-muted-foreground/70")} weight="duotone" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
            </div>
            <p className={cn("text-lg font-bold font-sans tabular-nums", alert && "text-red-600 dark:text-red-400")}>{value}</p>
        </div>
    );
}

// ============================================
// SECTION HEADER
// ============================================
function SectionHeader({
    icon: Icon, iconBg, iconColor, title, subtitle, badge, rightContent,
}: {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
    badge?: { label: string; variant: "default" | "destructive" | "outline" };
    rightContent?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center", iconBg)}>
                    <Icon className={cn("w-5.5 h-5.5", iconColor)} weight="duotone" />
                </div>
                <div>
                    <h2 className="text-lg font-bold tracking-tight">{title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {rightContent}
                {badge && <Badge variant={badge.variant} className="text-[10px] font-bold animate-pulse px-2.5 py-1 rounded-lg">{badge.label}</Badge>}
            </div>
        </div>
    );
}

function ViewToggle({ section, current, onChange }: { section: string; current: "chart" | "table"; onChange: (section: string, mode: "chart" | "table") => void }) {
    return (
        <div className="inline-flex items-center rounded-xl border border-border/60 bg-card p-1">
            <Button
                type="button"
                variant={current === "chart" ? "default" : "ghost"}
                size="sm"
                className="h-7 gap-1.5 rounded-lg px-2.5 text-[11px]"
                onClick={() => onChange(section, "chart")}
            >
                <ChartBar className="w-3.5 h-3.5" /> Chart
            </Button>
            <Button
                type="button"
                variant={current === "table" ? "default" : "ghost"}
                size="sm"
                className="h-7 gap-1.5 rounded-lg px-2.5 text-[11px]"
                onClick={() => onChange(section, "table")}
            >
                <Rows className="w-3.5 h-3.5" /> Table
            </Button>
        </div>
    );
}

function ExplainView({ title, description, columns, onExport }: { title: string; description: string; columns: string[]; onExport: () => void }) {
    return (
        <div className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
                <p className="text-sm font-semibold flex items-center gap-2"><Faders className="w-4 h-4 text-primary" /> {title}</p>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
                <p className="text-[11px] text-muted-foreground mt-2">Columns: {columns.join(" · ")}</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={onExport}>
                <Download className="w-3.5 h-3.5" /> Export Table
            </Button>
        </div>
    );
}

// ============================================
// FINANCIAL CARD
// ============================================
function FinCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
    return (
        <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/40">
                    <Icon className="w-4 h-4 text-muted-foreground" weight="duotone" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-xl font-bold font-sans tabular-nums">{value}</p>
        </div>
    );
}

// ============================================
// RISK STAT CARD
// ============================================
function RiskStatCard({ icon: Icon, title, value, subtitle, alert, color }: {
    icon: React.ElementType; title: string; value: number; subtitle: string; alert: boolean; color: "red" | "amber" | "orange";
}) {
    const palette = {
        red: { bg: "bg-red-100 dark:bg-red-500/15", fg: "text-red-600 dark:text-red-400", valFg: "text-red-600 dark:text-red-400" },
        amber: { bg: "bg-amber-100 dark:bg-amber-500/15", fg: "text-amber-600 dark:text-amber-400", valFg: "text-amber-600 dark:text-amber-400" },
        orange: { bg: "bg-orange-100 dark:bg-orange-500/15", fg: "text-orange-600 dark:text-orange-400", valFg: "text-orange-600 dark:text-orange-400" },
    }[color];

    return (
        <div className={cn(
            "rounded-2xl border border-border/60 bg-card p-5",
            alert && "border-red-200/80 dark:border-red-800/40",
        )}>
            <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", palette.bg)}>
                    <Icon className={cn("w-4.5 h-4.5", palette.fg)} weight="duotone" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{title}</span>
            </div>
            <p className={cn("text-4xl font-bold font-sans tabular-nums leading-none", alert ? palette.valFg : "text-emerald-600 dark:text-emerald-400")}>
                {value}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
        </div>
    );
}

// ============================================
// METRICS TABLE
// ============================================
function MetricsTable({ kpis, searchQuery }: { kpis: DashboardKPIs; searchQuery: string }) {
    const metrics = buildMetricRows(kpis);
    const q = searchQuery.toLowerCase();
    const filtered = metrics.filter(m => m.label.toLowerCase().includes(q) || m.cat.toLowerCase().includes(q));
    const catBadge: Record<string, string> = {
        Financial: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        Progress: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        Quality: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        Logistics: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 border-violet-200 dark:border-violet-800",
        Payments: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    };

    return (
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/40 dark:bg-muted/20">
                    <TableHead className="font-semibold text-xs uppercase tracking-wider w-[130px]">Category</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Metric</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Value</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filtered.map((m, i) => (
                    <TableRow key={i} className="hover:bg-muted/20">
                        <TableCell><Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 rounded-md font-semibold", catBadge[m.cat])}>{m.cat}</Badge></TableCell>
                        <TableCell className="font-medium text-sm">{m.label}</TableCell>
                        <TableCell className="text-right font-sans text-sm tabular-nums font-bold">{m.value}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

// ============================================
// SHARED
// ============================================
function StatusBadge({ status }: { status: "on-track" | "at-risk" | "delayed" }) {
    const cfg = {
        "on-track": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        "at-risk": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        "delayed": "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 border-red-200 dark:border-red-800",
    };
    return <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 rounded-md capitalize font-semibold", cfg[status])}>{status.replace("-", " ")}</Badge>;
}

function ProgressBar({ value, showLabel }: { value: number; showLabel?: boolean }) {
    return (
        <div className="flex items-center gap-2.5">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        value >= 80 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-muted-foreground/40"
                    )}
                    style={{ width: `${Math.min(value, 100)}%` }}
                />
            </div>
            {showLabel && <span className="text-[11px] font-sans text-muted-foreground w-9 text-right tabular-nums font-bold">{value.toFixed(0)}%</span>}
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-8 pt-8">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-2xl border border-border/60 bg-card p-6">
                        <Skeleton className="h-12 w-12 rounded-2xl mb-4" />
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-3.5 w-24" />
                    </div>
                ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                <Skeleton className="h-80 rounded-2xl" />
                <Skeleton className="h-80 rounded-2xl" />
            </div>
            <div className="grid gap-3 grid-cols-3 md:grid-cols-6">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
        </div>
    );
}

// ============================================
// HEALTH SCORE
// ============================================
function calcHealthScore(kpis: DashboardKPIs): number {
    const f = Math.min(100, (kpis.financial.totalPaid / Math.max(kpis.financial.totalCommitted, 1)) * 100);
    const q = Math.max(0, 100 - (kpis.quality.ncrRate || 0) * 10);
    const l = kpis.logistics.onTimeRate || 100;
    const p = kpis.progress.physicalProgress || 0;
    return f * 0.25 + q * 0.25 + l * 0.25 + p * 0.25;
}
function calcHealthBreakdown(kpis: DashboardKPIs) {
    return [
        { category: "Financial", score: Math.min(100, (kpis.financial.totalPaid / Math.max(kpis.financial.totalCommitted, 1)) * 100), weight: 25 },
        { category: "Quality", score: Math.max(0, 100 - (kpis.quality.ncrRate || 0) * 10), weight: 25 },
        { category: "Logistics", score: kpis.logistics.onTimeRate || 100, weight: 25 },
        { category: "Progress", score: kpis.progress.physicalProgress || 0, weight: 25 },
    ];
}

function buildMetricRows(kpis: DashboardKPIs) {
    return [
        { cat: "Financial", label: "Total Committed", value: fmt(kpis.financial.totalCommitted) },
        { cat: "Financial", label: "Total Paid", value: fmt(kpis.financial.totalPaid) },
        { cat: "Financial", label: "Total Unpaid", value: fmt(kpis.financial.totalUnpaid) },
        { cat: "Financial", label: "Retention Held", value: fmt(kpis.financial.retentionHeld) },
        { cat: "Financial", label: "CO Impact", value: fmt(kpis.financial.changeOrderImpact) },
        { cat: "Progress", label: "Physical Progress", value: pct(kpis.progress.physicalProgress) },
        { cat: "Progress", label: "Financial Progress", value: pct(kpis.progress.financialProgress) },
        { cat: "Progress", label: "Active POs", value: `${kpis.progress.activePOs}` },
        { cat: "Progress", label: "Total POs", value: `${kpis.progress.totalPOs}` },
        { cat: "Progress", label: "Milestones", value: `${kpis.progress.milestonesCompleted}/${kpis.progress.milestonesTotal}` },
        { cat: "Quality", label: "Total NCRs", value: `${kpis.quality.totalNCRs}` },
        { cat: "Quality", label: "Open NCRs", value: `${kpis.quality.openNCRs}` },
        { cat: "Quality", label: "Critical NCRs", value: `${kpis.quality.criticalNCRs}` },
        { cat: "Quality", label: "NCR Rate", value: pct(kpis.quality.ncrRate, 2) },
        { cat: "Logistics", label: "Total Shipments", value: `${kpis.logistics.totalShipments}` },
        { cat: "Logistics", label: "On-Time Rate", value: pct(kpis.logistics.onTimeRate) },
        { cat: "Logistics", label: "Delayed", value: `${kpis.logistics.delayedShipments}` },
        { cat: "Logistics", label: "In Transit", value: `${kpis.logistics.inTransit}` },
        { cat: "Payments", label: "Avg Payment Cycle", value: `${kpis.payments.avgPaymentCycleDays}d` },
        { cat: "Payments", label: "Pending Invoices", value: `${kpis.payments.pendingInvoiceCount}` },
        { cat: "Payments", label: "Overdue Invoices", value: `${kpis.payments.overdueInvoiceCount}` },
        { cat: "Payments", label: "Overdue Amount", value: fmt(kpis.payments.overdueAmount) },
    ];
}

// ============================================
// MOCK DATA
// ============================================
function generateMockRisks(): RiskItem[] {
    return [
        { id: "1", name: "Supplier A - Late Delivery", supplierRisk: 4, projectImpact: 3, category: "Supply Chain" },
        { id: "2", name: "Material Quality Issue", supplierRisk: 3, projectImpact: 4, category: "Quality" },
        { id: "3", name: "Budget Overrun Risk", supplierRisk: 2, projectImpact: 5, category: "Financial" },
        { id: "4", name: "Documentation Delay", supplierRisk: 2, projectImpact: 2, category: "Compliance" },
        { id: "5", name: "Critical NCR Pending", supplierRisk: 5, projectImpact: 5, category: "Quality" },
    ];
}
function generateMockAlerts(kpis: DashboardKPIs): ComplianceAlert[] {
    const a: ComplianceAlert[] = [];
    if (kpis.payments.overdueInvoiceCount > 0) a.push({ id: "1", type: "overdue_payment", severity: "critical", title: `${kpis.payments.overdueInvoiceCount} Overdue Invoices`, description: `${fmt(kpis.payments.overdueAmount)} outstanding`, relatedEntity: "Invoices", entityId: "invoices" });
    if (kpis.quality.criticalNCRs > 0) a.push({ id: "2", type: "excessive_ncr", severity: "critical", title: `${kpis.quality.criticalNCRs} Critical NCRs`, description: "Require immediate attention", relatedEntity: "NCRs", entityId: "ncrs" });
    if (kpis.logistics.delayedShipments > 0) a.push({ id: "3", type: "delayed_po", severity: "warning", title: `${kpis.logistics.delayedShipments} Delayed Shipments`, description: `Average delay: ${kpis.logistics.avgDeliveryDelay} days`, relatedEntity: "Shipments", entityId: "shipments" });
    return a;
}
function generateMockApprovals(): ApprovalItem[] {
    return [
        { id: "1", type: "invoice", title: "Invoice INV-2024-0142", reference: "INV-2024-0142", requestedBy: "John Doe", requestedAt: new Date(), amount: 45000, priority: "urgent", status: "pending" },
        { id: "2", type: "change_order", title: "CO for Scope Extension", reference: "CO-2024-0018", requestedBy: "Jane Smith", requestedAt: new Date(Date.now() - 86400000), amount: 125000, priority: "high", status: "in-review" },
        { id: "3", type: "milestone", title: "Milestone 3 Completion", reference: "MS-PO-0042-03", requestedBy: "Supplier XYZ", requestedAt: new Date(Date.now() - 172800000), priority: "normal", status: "awaiting-info" },
        { id: "4", type: "ncr", title: "NCR Resolution Approval", reference: "NCR-2024-0023", requestedBy: "QA Team", requestedAt: new Date(Date.now() - 259200000), priority: "high", status: "pending" },
    ];
}
