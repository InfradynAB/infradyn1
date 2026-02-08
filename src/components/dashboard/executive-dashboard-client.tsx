"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
    FileCsv,
    FileXls,
    ListBullets,
    ChartBar,
    MagnifyingGlass,
    Funnel,
    Buildings,
    ShieldWarning,
    Heartbeat,
    Package,
    Truck,
    Receipt,
    ArrowUp,
    CaretDown,
    Lightning,
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

// ============================================
// MAIN COMPONENT
// ============================================
export function ExecutiveDashboardClient() {
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [risks, setRisks] = useState<RiskItem[]>([]);
    const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
    const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeframe, setTimeframe] = useState("all");
    const [projectFilter, setProjectFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeSection, setActiveSection] = useState<SectionId>("overview");

    const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
        overview: null, projects: null, approvals: null, risks: null, financials: null, data: null,
    });

    const [supplierTrend] = useState<SupplierTrendPoint[]>([
        { month: "Sep", "Supplier A": 82, "Supplier B": 75, "Supplier C": 90, "Supplier D": 68 },
        { month: "Oct", "Supplier A": 85, "Supplier B": 78, "Supplier C": 88, "Supplier D": 72 },
        { month: "Nov", "Supplier A": 80, "Supplier B": 80, "Supplier C": 92, "Supplier D": 65 },
        { month: "Dec", "Supplier A": 88, "Supplier B": 76, "Supplier C": 91, "Supplier D": 70 },
        { month: "Jan", "Supplier A": 90, "Supplier B": 82, "Supplier C": 89, "Supplier D": 74 },
        { month: "Feb", "Supplier A": 87, "Supplier B": 85, "Supplier C": 93, "Supplier D": 78 },
    ]);

    // ── Scroll spy ──
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => { for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id as SectionId); },
            { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
        );
        Object.values(sectionRefs.current).forEach((r) => { if (r) observer.observe(r); });
        return () => observer.disconnect();
    }, [loading]);

    const scrollTo = (id: SectionId) => sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

    // ── Fetch ──
    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (timeframe !== "all") {
                const now = new Date();
                let from: Date;
                switch (timeframe) {
                    case "30d": from = new Date(now.setDate(now.getDate() - 30)); break;
                    case "90d": from = new Date(now.setDate(now.getDate() - 90)); break;
                    case "ytd": from = new Date(now.getFullYear(), 0, 1); break;
                    default: from = new Date(0);
                }
                params.set("dateFrom", from.toISOString());
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
    }, [timeframe, projectFilter]);

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
                                <SelectItem value="30d">Last 30 Days</SelectItem>
                                <SelectItem value="90d">Last 90 Days</SelectItem>
                                <SelectItem value="ytd">Year to Date</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={fetchDashboard}>
                            <ArrowsClockwise className={cn("w-4 h-4", loading && "animate-spin")} />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs gap-1.5 px-3.5 bg-card" disabled={exporting}>
                                    {exporting ? <ArrowsClockwise className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                    Export <CaretDown className="w-3 h-3 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                                <DropdownMenuItem onClick={() => handleExport("xlsx")}><FileXls className="w-4 h-4 mr-2" />Excel</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport("csv")}><FileCsv className="w-4 h-4 mr-2" />CSV</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport("json")}><ListBullets className="w-4 h-4 mr-2" />JSON</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* ─── NAV PILLS ─── */}
                <div className="flex items-center gap-1.5 pb-3 overflow-x-auto scrollbar-none">
                    {SECTIONS.map((s) => {
                        const Icon = s.icon;
                        const active = activeSection === s.id;
                        return (
                            <button
                                key={s.id}
                                onClick={() => scrollTo(s.id)}
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
                <div className="space-y-12 pt-8 pb-24">

                    {/* ═══════════ SECTION 1: OVERVIEW ═══════════ */}
                    <section id="overview" ref={(el) => { sectionRefs.current.overview = el; }} className="scroll-mt-32 space-y-6">

                        {/* KPI Cards */}
                        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                            <GlowKPI
                                label="Total Committed"
                                value={fmt(data.kpis.financial.totalCommitted)}
                                icon={CurrencyDollar}
                                iconBg="bg-blue-100 dark:bg-blue-500/20"
                                iconColor="text-blue-600 dark:text-blue-400"
                                trend="+6%"
                                trendDir="up"
                            />
                            <GlowKPI
                                label="Total Paid"
                                value={fmt(data.kpis.financial.totalPaid)}
                                icon={CheckCircle}
                                iconBg="bg-emerald-100 dark:bg-emerald-500/20"
                                iconColor="text-emerald-600 dark:text-emerald-400"
                                trend="+4.2%"
                                trendDir="up"
                            />
                            <GlowKPI
                                label="Unpaid / Pending"
                                value={fmt(data.kpis.financial.totalUnpaid)}
                                icon={Clock}
                                iconBg="bg-orange-100 dark:bg-orange-500/20"
                                iconColor="text-orange-600 dark:text-orange-400"
                                trend={data.kpis.financial.totalUnpaid > data.kpis.financial.totalPaid ? "High" : "Normal"}
                                trendDir={data.kpis.financial.totalUnpaid > data.kpis.financial.totalPaid ? "alert" : "neutral"}
                            />
                            <GlowKPI
                                label="Health Score"
                                value={`${healthScore.toFixed(0)}/100`}
                                icon={Heartbeat}
                                iconBg="bg-violet-100 dark:bg-violet-500/20"
                                iconColor="text-violet-600 dark:text-violet-400"
                                trend={healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "Fair" : "Critical"}
                                trendDir={healthScore >= 70 ? "up" : healthScore >= 40 ? "neutral" : "alert"}
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
                    <section id="projects" ref={(el) => { sectionRefs.current.projects = el; }} className="scroll-mt-32 space-y-5">
                        <SectionHeader icon={Buildings} iconBg="bg-indigo-100 dark:bg-indigo-500/20" iconColor="text-indigo-600 dark:text-indigo-400" title="Projects" subtitle={`${projects.length} active projects across your portfolio`} />
                        <GlowCard><ProjectBarChart data={projects} onProjectClick={(id) => router.push(`/dashboard/projects/${id}`)} /></GlowCard>
                        <GlowCard noPad>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40 dark:bg-muted/20">
                                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Project</TableHead>
                                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Contract Value</TableHead>
                                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Spent</TableHead>
                                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Physical</TableHead>
                                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Financial</TableHead>
                                        <TableHead className="w-10" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projects.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No projects found</TableCell></TableRow>
                                    ) : projects.map((p) => (
                                        <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30 transition-colors group" onClick={() => router.push(`/dashboard/projects/${p.id}`)}>
                                            <TableCell className="font-semibold">{p.name}</TableCell>
                                            <TableCell><StatusBadge status={p.status} /></TableCell>
                                            <TableCell className="text-right font-mono text-sm tabular-nums">{fmt(p.totalValue)}</TableCell>
                                            <TableCell className="text-right font-mono text-sm tabular-nums">{fmt(p.spend)}</TableCell>
                                            <TableCell><ProgressBar value={p.physicalProgress} showLabel /></TableCell>
                                            <TableCell><ProgressBar value={p.financialProgress} showLabel /></TableCell>
                                            <TableCell><CaretRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </GlowCard>
                    </section>

                    {/* ═══════════ SECTION 3: APPROVALS ═══════════ */}
                    <section id="approvals" ref={(el) => { sectionRefs.current.approvals = el; }} className="scroll-mt-32 space-y-5">
                        <SectionHeader
                            icon={Bell} iconBg="bg-amber-100 dark:bg-amber-500/20" iconColor="text-amber-600 dark:text-amber-400"
                            title="Pending Approvals"
                            subtitle={`${approvals.length} items awaiting your action`}
                            badge={urgentCount > 0 ? { label: `${urgentCount} Urgent`, variant: "destructive" as const } : undefined}
                        />
                        <GlowCard>
                            <ApprovalsQueue data={approvals.length > 0 ? approvals : generateMockApprovals()} onReview={(id) => console.log("Review:", id)} />
                        </GlowCard>
                    </section>

                    {/* ═══════════ SECTION 4: RISKS ═══════════ */}
                    <section id="risks" ref={(el) => { sectionRefs.current.risks = el; }} className="scroll-mt-32 space-y-5">
                        <SectionHeader
                            icon={ShieldWarning} iconBg="bg-red-100 dark:bg-red-500/20" iconColor="text-red-600 dark:text-red-400"
                            title="Risks & Compliance"
                            subtitle="Supplier risk matrix, compliance alerts, and trend analysis"
                            badge={alerts.filter(a => a.severity === "critical").length > 0 ? { label: `${alerts.filter(a => a.severity === "critical").length} Critical`, variant: "destructive" as const } : undefined}
                        />
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
                    </section>

                    {/* ═══════════ SECTION 5: FINANCIALS ═══════════ */}
                    <section id="financials" ref={(el) => { sectionRefs.current.financials = el; }} className="scroll-mt-32 space-y-5">
                        <SectionHeader icon={CurrencyDollar} iconBg="bg-emerald-100 dark:bg-emerald-500/20" iconColor="text-emerald-600 dark:text-emerald-400" title="Financial Intelligence" subtitle="Spend curves, change orders, and payment analytics" />
                        <div className="grid gap-5 lg:grid-cols-2">
                            <GlowCard><SCurveChart data={data.charts.sCurve} /></GlowCard>
                            <GlowCard><COImpactDonut data={data.charts.coBreakdown} /></GlowCard>
                        </div>
                        <div className="grid gap-4 md:grid-cols-4">
                            <FinCard label="Total Committed" value={fmt(data.kpis.financial.totalCommitted)} icon={CurrencyDollar} color="blue" />
                            <FinCard label="Total Invoiced" value={fmt(data.kpis.financial.totalPaid)} icon={CheckCircle} color="emerald" />
                            <FinCard label="Retention Held" value={fmt(data.kpis.financial.retentionHeld)} icon={Clock} color="amber" />
                            <FinCard label="CO Impact" value={fmt(data.kpis.financial.changeOrderImpact)} icon={Lightning} color="violet" />
                        </div>
                    </section>

                    {/* ═══════════ SECTION 6: ALL METRICS ═══════════ */}
                    <section id="data" ref={(el) => { sectionRefs.current.data = el; }} className="scroll-mt-32 space-y-5">
                        <SectionHeader icon={Receipt} iconBg="bg-slate-200 dark:bg-slate-500/20" iconColor="text-slate-600 dark:text-slate-400" title="All Metrics" subtitle="Complete KPI breakdown across every category" />
                        <div className="relative max-w-sm">
                            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Search metrics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10 rounded-xl text-sm bg-card" />
                        </div>
                        <GlowCard noPad><MetricsTable kpis={data.kpis} searchQuery={searchQuery} /></GlowCard>
                    </section>

                    <div className="flex justify-center pt-6">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-2 rounded-xl hover:bg-muted" onClick={() => scrollTo("overview")}>
                            <ArrowUp className="w-4 h-4" /> Back to top
                        </Button>
                    </div>
                </div>
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
    label, value, icon: Icon, iconBg, iconColor, trend, trendDir,
}: {
    label: string;
    value: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    trend: string;
    trendDir: "up" | "down" | "alert" | "neutral";
}) {
    return (
        <div className={cn(
            "rounded-2xl border border-border/60 bg-card p-5 lg:p-6",
            "shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group",
        )}>
            {/* Top row: icon + trend */}
            <div className="flex items-start justify-between mb-4">
                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    "transition-transform duration-300 group-hover:scale-110",
                    iconBg,
                )}>
                    <Icon className={cn("w-6 h-6", iconColor)} weight="duotone" />
                </div>
                {trend && (
                    <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl",
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
            {/* Value */}
            <p className="text-[1.75rem] lg:text-3xl font-bold font-mono tracking-tighter tabular-nums leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">{label}</p>
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
            <p className={cn("text-lg font-bold font-mono tabular-nums", alert && "text-red-600 dark:text-red-400")}>{value}</p>
        </div>
    );
}

// ============================================
// SECTION HEADER
// ============================================
function SectionHeader({
    icon: Icon, iconBg, iconColor, title, subtitle, badge,
}: {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
    badge?: { label: string; variant: "default" | "destructive" | "outline" };
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
            {badge && <Badge variant={badge.variant} className="text-[10px] font-bold animate-pulse px-2.5 py-1 rounded-lg">{badge.label}</Badge>}
        </div>
    );
}

// ============================================
// FINANCIAL CARD
// ============================================
function FinCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: "blue" | "emerald" | "amber" | "violet" }) {
    const styles = {
        blue: { bg: "bg-blue-50 dark:bg-blue-500/10", fg: "text-blue-600 dark:text-blue-400", border: "border-l-blue-500" },
        emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", fg: "text-emerald-600 dark:text-emerald-400", border: "border-l-emerald-500" },
        amber: { bg: "bg-amber-50 dark:bg-amber-500/10", fg: "text-amber-600 dark:text-amber-400", border: "border-l-amber-500" },
        violet: { bg: "bg-violet-50 dark:bg-violet-500/10", fg: "text-violet-600 dark:text-violet-400", border: "border-l-violet-500" },
    }[color];

    return (
        <div className={cn("rounded-2xl border border-border/60 border-l-4 bg-card p-5", styles.border)}>
            <div className="flex items-center gap-2.5 mb-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", styles.bg)}>
                    <Icon className={cn("w-4 h-4", styles.fg)} weight="duotone" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-xl font-bold font-mono tabular-nums">{value}</p>
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
            <p className={cn("text-4xl font-bold font-mono tabular-nums leading-none", alert ? palette.valFg : "text-emerald-600 dark:text-emerald-400")}>
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
    const metrics = [
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
                        <TableCell className="text-right font-mono text-sm tabular-nums font-bold">{m.value}</TableCell>
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
            {showLabel && <span className="text-[11px] font-mono text-muted-foreground w-9 text-right tabular-nums font-bold">{value.toFixed(0)}%</span>}
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
