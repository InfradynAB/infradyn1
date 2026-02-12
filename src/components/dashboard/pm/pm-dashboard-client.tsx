"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
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
    FileCsv,
    FileXls,
    ListBullets,
    Funnel,
    ShieldWarning,
    Package,
    Truck,
    Receipt,
    ArrowUp,
    CaretDown,
    Lightning,
    ArrowsLeftRight,
    Gauge,
    CalendarCheck,
    Clipboard,
    Target,
    UsersFour,
    Wrench,
    MagnifyingGlass,
    X,
    ChartBar,
    Rows,
    Faders,
    ArrowLeft,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// PM Charts
import { TrafficLightChart } from "./charts/traffic-light-chart";
import type { TrafficLightData } from "./charts/traffic-light-chart";
import { MilestoneProgressChart } from "./charts/milestone-progress";
import type { MilestoneItem } from "./charts/milestone-progress";
import { NCRTrendChart } from "./charts/ncr-trend-chart";
import type { NCRTrendPoint } from "./charts/ncr-trend-chart";
import { CostWaterfallChart } from "./charts/cost-waterfall-chart";
import type { WaterfallItem } from "./charts/cost-waterfall-chart";
import { BudgetUtilizationBar } from "./charts/budget-utilization";
import { InspectionCalendar } from "./charts/inspection-calendar";
import type { InspectionEvent } from "./charts/inspection-calendar";
import { SupplierRadarChart } from "./charts/supplier-radar-chart";
import type { SupplierScorecard } from "./charts/supplier-radar-chart";
import { MaterialAvailabilityChart } from "./charts/material-availability-chart";
import type { MaterialItem } from "./charts/material-availability-chart";

// PM Widgets
import { DeliveryPipeline } from "./widgets/delivery-pipeline";
import type { DeliveryItem } from "./widgets/delivery-pipeline";
import { ChangeOrdersWidget } from "./widgets/change-orders-widget";
import type { ChangeOrderItem } from "./widgets/change-orders-widget";

// Shared charts from executive
import { HealthGauge } from "../charts/health-gauge";
import { RiskHeatmap } from "../charts/risk-heatmap";

import type { DashboardKPIs } from "@/lib/services/kpi-engine";

// ============================================
// TYPES
// ============================================
interface DashboardData {
    kpis: DashboardKPIs;
    charts: {
        sCurve: Array<{ month: string; plannedCumulative: number; actualCumulative: number }>;
        coBreakdown: { scope: number; rate: number; quantity: number; schedule: number; total: number };
    };
}

interface RiskItem {
    id: string;
    name: string;
    supplierRisk: 1 | 2 | 3 | 4 | 5;
    projectImpact: 1 | 2 | 3 | 4 | 5;
    category: string;
}

// ============================================
// SECTION NAV
// ============================================
const SECTIONS = [
    { id: "overview", label: "Overview", icon: Gauge },
    { id: "deliveries", label: "Deliveries", icon: Truck },
    { id: "materials", label: "Materials", icon: Package },
    { id: "quality", label: "Quality & NCRs", icon: ShieldWarning },
    { id: "milestones", label: "Milestones", icon: Target },
    { id: "suppliers", label: "Suppliers", icon: UsersFour },
    { id: "financials", label: "Cost & Budget", icon: CurrencyDollar },
    { id: "inspections", label: "Inspections", icon: CalendarCheck },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

// ============================================
// HELPERS
// ============================================
const fmt = (value: number | undefined | null, currency = "$") => {
    const num = Number(value) || 0;
    if (num >= 1_000_000) return `${currency}${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${currency}${(num / 1_000).toFixed(1)}K`;
    return `${currency}${num.toFixed(0)}`;
};
const pct = (v: number | undefined | null, d = 1) => `${(Number(v) || 0).toFixed(d)}%`;

// ============================================
// MAIN COMPONENT
// ============================================
export function PMDashboardClient() {
    const pathname = usePathname();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeframe, setTimeframe] = useState("all");
    const [projectFilter, setProjectFilter] = useState("all");
    const [activeSection, setActiveSection] = useState<SectionId>("overview");
    const [exporting, setExporting] = useState(false);

    // Filters & view modes
    const [searchQuery, setSearchQuery] = useState("");
    const [supplierFilter, setSupplierFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [viewModes, setViewModes] = useState<Record<string, "chart" | "table">>({
        deliveries: "chart", materials: "chart", quality: "chart",
        milestones: "chart", suppliers: "table", financials: "chart", inspections: "chart",
    });
    const toggleView = useCallback((section: string, mode: "chart" | "table") => {
        setViewModes(prev => ({ ...prev, [section]: mode }));
    }, []);

    // PM-specific state
    const [risks, setRisks] = useState<RiskItem[]>([]);
    const [trafficLight] = useState<TrafficLightData>(mockTrafficLight);
    const [milestones] = useState<MilestoneItem[]>(mockMilestones);
    const [ncrTrend] = useState<NCRTrendPoint[]>(mockNCRTrend);
    const [waterfall, setWaterfall] = useState<WaterfallItem[]>([]);
    const [inspections] = useState<InspectionEvent[]>(mockInspections);
    const [supplierCards] = useState<SupplierScorecard[]>(mockSupplierScorecards);
    const [materials] = useState<MaterialItem[]>(mockMaterials);
    const [deliveries] = useState<DeliveryItem[]>(mockDeliveries);
    const [changeOrders] = useState<ChangeOrderItem[]>(mockChangeOrders);

    // Real suppliers from database
    const [realSuppliers, setRealSuppliers] = useState<Array<{ id: string; name: string }>>([]);

    // Real projects from database
    const [projectList, setProjectList] = useState<Array<{ id: string; name: string }>>([]);

    const routeSection = useMemo<SectionId | null>(() => {
        const match = pathname.match(/^\/dashboard\/pm\/([^/?#]+)/);
        if (!match) return null;
        const candidate = match[1] as SectionId;
        return SECTIONS.some((section) => section.id === candidate) ? candidate : null;
    }, [pathname]);

    // Fetch real suppliers and projects from API
    useEffect(() => {
        async function fetchSuppliers() {
            try {
                const res = await fetch("/api/suppliers/list");
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data?.suppliers) {
                        setRealSuppliers(json.data.suppliers.map((s: { id: string; name: string }) => ({
                            id: s.id,
                            name: s.name,
                        })));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch suppliers:", err);
            }
        }
        async function fetchProjects() {
            try {
                const res = await fetch("/api/projects/list");
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data?.projects) {
                        setProjectList(json.data.projects.map((p: { id: string; name: string }) => ({
                            id: p.id,
                            name: p.name,
                        })));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch projects:", err);
            }
        }
        fetchSuppliers();
        fetchProjects();
    }, []);

    // Derived filter options - use real suppliers from DB
    const uniqueSuppliers = useMemo(() => realSuppliers.map(s => s.name).sort(), [realSuppliers]);

    // Filtered data
    const filteredDeliveries = useMemo(() => deliveries.filter(d => {
        if (supplierFilter !== "all" && d.supplier !== supplierFilter) return false;
        if (statusFilter !== "all" && d.status !== statusFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!`${d.description} ${d.poNumber} ${d.supplier} ${d.trackingRef || ""}`.toLowerCase().includes(q)) return false;
        }
        return true;
    }), [deliveries, supplierFilter, statusFilter, searchQuery]);

    const filteredMaterials = useMemo(() => materials.filter(m => {
        if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    }), [materials, searchQuery]);

    const filteredMilestones = useMemo(() => milestones.filter(m => {
        if (statusFilter !== "all" && m.status !== statusFilter) return false;
        if (searchQuery && !`${m.name} ${m.poNumber}`.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    }), [milestones, statusFilter, searchQuery]);

    const filteredSuppliers = useMemo(() => supplierCards.filter(s => {
        if (supplierFilter !== "all" && s.supplierName !== supplierFilter) return false;
        if (searchQuery && !s.supplierName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    }), [supplierCards, supplierFilter, searchQuery]);

    const filteredInspections = useMemo(() => inspections.filter(e => {
        if (statusFilter !== "all" && e.status !== statusFilter) return false;
        if (supplierFilter !== "all" && e.supplier !== supplierFilter) return false;
        if (searchQuery && !`${e.title} ${e.supplier}`.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    }), [inspections, statusFilter, supplierFilter, searchQuery]);

    const filteredChangeOrders = useMemo(() => changeOrders.filter(c => {
        if (statusFilter !== "all" && c.status !== statusFilter) return false;
        if (searchQuery && !`${c.title} ${c.reference} ${c.poNumber}`.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    }), [changeOrders, statusFilter, searchQuery]);

    const activeFilterCount = [searchQuery !== "", supplierFilter !== "all", statusFilter !== "all"].filter(Boolean).length;

    const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
        overview: null, deliveries: null, materials: null, quality: null,
        milestones: null, suppliers: null, financials: null, inspections: null,
    });

    // projectList is now fetched from API (see useEffect above)

    // ── Scroll spy ──
    useEffect(() => {
        if (routeSection) {
            setActiveSection(routeSection);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => { for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id as SectionId); },
            { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
        );
        Object.values(sectionRefs.current).forEach((r) => { if (r) observer.observe(r); });
        return () => observer.disconnect();
    }, [loading, routeSection]);

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

            // Build waterfall from KPIs
            const k = json.data.kpis;
            setWaterfall(buildWaterfall(k));

            // Try fetching PM-specific risk data
            try {
                const rRes = await fetch(`/api/dashboard/risks?${params.toString()}`);
                if (rRes.ok) {
                    const rj = await rRes.json();
                    if (rj.success) setRisks(rj.data?.risks || mockRisks());
                } else setRisks(mockRisks());
            } catch { setRisks(mockRisks()); }

        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }, [timeframe, projectFilter]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const handleExport = async (format: "xlsx" | "csv" | "json") => {
        setExporting(true);
        try {
            const res = await fetch(`/api/dashboard/export?format=${format}&type=pm-detailed`);
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url;
            a.download = `pm-dashboard-${new Date().toISOString().slice(0, 10)}.${format}`;
            a.click(); window.URL.revokeObjectURL(url);
            toast.success(`${format.toUpperCase()} exported`);
        } catch { toast.error("Export failed"); }
        finally { setExporting(false); }
    };

    const healthScore = data ? calcHealthScore(data.kpis) : 0;
    const healthBreakdown = data ? calcHealthBreakdown(data.kpis) : [];
    const overdueDeliveries = deliveries.filter(d => d.status === "delayed").length;

    // ── Error state ──
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="w-full max-w-md rounded-2xl shadow-xl border-destructive/20">
                    <div className="pt-10 pb-8 text-center px-6">
                        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center mx-auto mb-5">
                            <Warning className="w-8 h-8 text-red-600 dark:text-red-400" weight="duotone" />
                        </div>
                        <p className="text-lg font-bold">Something went wrong</p>
                        <p className="text-sm text-muted-foreground mt-1.5 mb-6">{error}</p>
                        <Button onClick={fetchDashboard} variant="outline" className="rounded-xl">
                            <ArrowsClockwise className="w-4 h-4 mr-2" /> Retry
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════
    return (
        <div className="relative">
            {/* ─── STICKY HEADER ─── */}
            <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-2xl border-b border-border/60 -mx-4 px-4 lg:-mx-6 lg:px-6">
                <div className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
                            <Link href="/dashboard/analytics"><ArrowLeft className="h-4 w-4" /></Link>
                        </Button>
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                            <Wrench className="w-5 h-5 text-white" weight="bold" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight leading-none">Project Manager Dashboard</h1>
                            <p className="text-xs text-muted-foreground mt-0.5">Material tracking · Deliveries · Quality · Cost exposure</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Select value={projectFilter} onValueChange={setProjectFilter}>
                            <SelectTrigger className="w-40 h-9 text-xs rounded-xl border-border/60 bg-card">
                                <Funnel className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                <SelectValue placeholder="All Projects" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projectList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
                        <Button
                            variant={showAdvancedFilters ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "h-9 rounded-xl text-xs gap-1.5 px-3",
                                showAdvancedFilters ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-card"
                            )}
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        >
                            <Faders className="w-3.5 h-3.5" weight="duotone" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className={cn(
                                    "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center",
                                    showAdvancedFilters ? "bg-white/20" : "bg-indigo-600 text-white"
                                )}>{activeFilterCount}</span>
                            )}
                        </Button>
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
                        const active = (routeSection ?? activeSection) === s.id;
                        return (
                            <Link
                                key={s.id}
                                href={`/dashboard/pm/${s.id}`}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap",
                                    active
                                        ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 scale-[1.02]"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className="w-4 h-4" weight={active ? "fill" : "duotone"} />
                                {s.label}
                                {s.id === "deliveries" && overdueDeliveries > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">{overdueDeliveries}</span>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* ─── FILTER PANEL ─── */}
                {showAdvancedFilters && (
                    <div className="border-t border-border/40 py-3 animate-in slide-in-from-top-1 duration-200">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px] max-w-sm">
                                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search POs, suppliers, materials..."
                                    value={searchQuery}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-xs rounded-xl border-border/60 bg-background"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                                    </button>
                                )}
                            </div>

                            {/* Supplier Filter */}
                            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                                <SelectTrigger className="w-44 h-9 text-xs rounded-xl border-border/60 bg-background">
                                    <UsersFour className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                    <SelectValue placeholder="All Suppliers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Suppliers</SelectItem>
                                    {uniqueSuppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-40 h-9 text-xs rounded-xl border-border/60 bg-background">
                                    <Funnel className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="in-transit">In Transit</SelectItem>
                                    <SelectItem value="at-port">At Port</SelectItem>
                                    <SelectItem value="customs">Customs</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="delayed">Delayed</SelectItem>
                                    <SelectItem value="on-track">On Track</SelectItem>
                                    <SelectItem value="at-risk">At Risk</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Clear All */}
                            {activeFilterCount > 0 && (
                                <Button variant="ghost" size="sm" className="h-9 text-xs rounded-xl gap-1.5 text-muted-foreground hover:text-foreground"
                                    onClick={() => { setSearchQuery(""); setSupplierFilter("all"); setStatusFilter("all"); }}>
                                    <X className="w-3.5 h-3.5" /> Clear all
                                </Button>
                            )}
                        </div>

                        {/* Active Filter Chips */}
                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Active:</span>
                                {searchQuery && <FilterChip label={`\"${searchQuery}\"`} onRemove={() => setSearchQuery("")} />}
                                {supplierFilter !== "all" && <FilterChip label={supplierFilter} onRemove={() => setSupplierFilter("all")} />}
                                {statusFilter !== "all" && <FilterChip label={statusFilter.replace(/-/g, " ")} onRemove={() => setStatusFilter("all")} />}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── BODY ─── */}
            {loading ? <DashboardSkeleton /> : data ? (
                <div className="space-y-12 pt-8 pb-24">

                    {/* ═══════════ SECTION 1: OVERVIEW ═══════════ */}
                    <section id="overview" ref={(el) => { sectionRefs.current.overview = el; }} className={cn("scroll-mt-32 space-y-6", routeSection && routeSection !== "overview" && "hidden")}>

                        {/* KPI Row 1: Core PM metrics */}
                        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                            <GlowKPI label="Material Availability" value={pct(calcMaterialAvailability(materials))} icon={Package} iconBg="bg-blue-100 dark:bg-blue-500/20" iconColor="text-blue-600 dark:text-blue-400" trend={calcMaterialAvailability(materials) >= 80 ? "Good" : "Low"} trendDir={calcMaterialAvailability(materials) >= 80 ? "up" : "alert"} />
                            <GlowKPI label="On-Time Delivery" value={pct(data.kpis.logistics.onTimeRate)} icon={Truck} iconBg="bg-emerald-100 dark:bg-emerald-500/20" iconColor="text-emerald-600 dark:text-emerald-400" trend={data.kpis.logistics.onTimeRate >= 85 ? "Healthy" : "At Risk"} trendDir={data.kpis.logistics.onTimeRate >= 85 ? "up" : "alert"} />
                            <GlowKPI label="Open NCRs" value={`${data.kpis.quality.openNCRs}`} icon={ShieldWarning} iconBg="bg-amber-100 dark:bg-amber-500/20" iconColor="text-amber-600 dark:text-amber-400" trend={`${data.kpis.quality.criticalNCRs} critical`} trendDir={data.kpis.quality.criticalNCRs > 0 ? "alert" : "up"} />
                            <GlowKPI label="Milestones" value={`${data.kpis.progress.milestonesCompleted}/${data.kpis.progress.milestonesTotal}`} icon={Target} iconBg="bg-violet-100 dark:bg-violet-500/20" iconColor="text-violet-600 dark:text-violet-400" trend={pct((data.kpis.progress.milestonesCompleted / Math.max(data.kpis.progress.milestonesTotal, 1)) * 100)} trendDir="neutral" />
                            <GlowKPI label="Cost Exposure" value={fmt(data.kpis.financial.forecastToComplete)} icon={CurrencyDollar} iconBg="bg-rose-100 dark:bg-rose-500/20" iconColor="text-rose-600 dark:text-rose-400" trend={data.kpis.financial.changeOrderImpact > 0 ? `+${fmt(data.kpis.financial.changeOrderImpact)} COs` : "No COs"} trendDir={data.kpis.financial.changeOrderImpact > 0 ? "alert" : "up"} />
                        </div>

                        {/* Health + Traffic Light */}
                        <div className="grid gap-5 lg:grid-cols-2">
                            <GlowCard>
                                <HealthGauge score={healthScore} label="Project Health" breakdown={healthBreakdown} />
                            </GlowCard>
                            <GlowCard>
                                <TrafficLightChart data={trafficLight} onLightClick={(status) => console.log("Filter:", status)} />
                            </GlowCard>
                        </div>

                        {/* Secondary KPIs */}
                        <div className="grid gap-3 grid-cols-3 md:grid-cols-6">
                            <MiniKPI icon={Clipboard} label="Active POs" value={`${data.kpis.progress.activePOs}`} />
                            <MiniKPI icon={ArrowsLeftRight} label="Active COs" value={`${changeOrders.filter(c => c.status === "in-progress").length}`} />
                            <MiniKPI icon={Receipt} label="Pending Invoices" value={`${data.kpis.payments.pendingInvoiceCount}`} alert={data.kpis.payments.pendingInvoiceCount > 5} />
                            <MiniKPI icon={Clock} label="Avg Pay Cycle" value={`${data.kpis.payments.avgPaymentCycleDays}d`} />
                            <MiniKPI icon={CheckCircle} label="QA Pass Rate" value={pct(calcQAPassRate(data.kpis))} />
                            <MiniKPI icon={Warning} label="Delayed Ships" value={`${data.kpis.logistics.delayedShipments}`} alert={data.kpis.logistics.delayedShipments > 0} />
                        </div>
                    </section>

                    {/* ═══════════ SECTION 2: DELIVERIES ═══════════ */}
                    <section id="deliveries" ref={(el) => { sectionRefs.current.deliveries = el; }} className={cn("scroll-mt-32 space-y-5", routeSection && routeSection !== "deliveries" && "hidden")}>
                        <SectionHeader icon={Truck} iconBg="bg-blue-100 dark:bg-blue-500/20" iconColor="text-blue-600 dark:text-blue-400" title="Delivery Tracking" subtitle={`${filteredDeliveries.length} shipments · ${filteredDeliveries.filter(d => d.status === "in-transit").length} in transit · ${filteredDeliveries.filter(d => d.status === "delayed").length} delayed`}
                            badge={overdueDeliveries > 0 ? { label: `${overdueDeliveries} Delayed`, variant: "destructive" as const } : undefined}
                            rightContent={<ViewToggle section="deliveries" current={viewModes.deliveries} onChange={toggleView} />}
                        />
                        {viewModes.deliveries === "chart" ? (
                            <div className="grid gap-5 lg:grid-cols-2">
                                <GlowCard>
                                    <DeliveryPipeline data={filteredDeliveries} onDeliveryClick={(id) => console.log("Delivery:", id)} />
                                </GlowCard>
                                <GlowCard>
                                    <TrafficLightChart data={trafficLight} onLightClick={(status) => console.log("Filter by:", status)} />
                                </GlowCard>
                            </div>
                        ) : (
                            <GlowCard noPad>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 dark:bg-muted/20">
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider">PO #</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Supplier</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Description</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Expected</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Qty</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Status</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Tracking</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredDeliveries.map(d => (
                                            <TableRow key={d.id} className="hover:bg-muted/20 cursor-pointer">
                                                <TableCell className="font-mono text-xs font-semibold">{d.poNumber}</TableCell>
                                                <TableCell className="text-xs">{d.supplier}</TableCell>
                                                <TableCell className="text-xs max-w-[200px] truncate">{d.description}</TableCell>
                                                <TableCell className="text-xs font-mono">{d.expectedDate.toLocaleDateString()}</TableCell>
                                                <TableCell className="text-xs font-mono text-right">{d.quantity.toLocaleString()} {d.unit}</TableCell>
                                                <TableCell className="text-center"><StatusPill status={d.status} /></TableCell>
                                                <TableCell className="text-xs font-mono text-muted-foreground">{d.trackingRef || "—"}</TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredDeliveries.length === 0 && (
                                            <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No deliveries match your filters</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </GlowCard>
                        )}
                    </section>

                    {/* ═══════════ SECTION 3: MATERIALS ═══════════ */}
                    <section id="materials" ref={(el) => { sectionRefs.current.materials = el; }} className={cn("scroll-mt-32 space-y-5", routeSection && routeSection !== "materials" && "hidden")}>
                        <SectionHeader icon={Package} iconBg="bg-teal-100 dark:bg-teal-500/20" iconColor="text-teal-600 dark:text-teal-400" title="Material Availability" subtitle={`${filteredMaterials.length} materials · Ordered, delivered, and installed quantities`}
                            rightContent={<ViewToggle section="materials" current={viewModes.materials} onChange={toggleView} />}
                        />
                        <div className="grid gap-4 md:grid-cols-3">
                            <MatStatCard label="Total Ordered" value={filteredMaterials.reduce((s, m) => s + m.ordered, 0).toLocaleString()} color="blue" />
                            <MatStatCard label="Total Delivered" value={filteredMaterials.reduce((s, m) => s + m.delivered, 0).toLocaleString()} color="emerald" />
                            <MatStatCard label="Availability Index" value={pct(calcMaterialAvailability(filteredMaterials))} color={calcMaterialAvailability(filteredMaterials) >= 80 ? "emerald" : "amber"} />
                        </div>
                        {viewModes.materials === "chart" ? (
                            <GlowCard>
                                <MaterialAvailabilityChart data={filteredMaterials} />
                            </GlowCard>
                        ) : (
                            <GlowCard noPad>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 dark:bg-muted/20">
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Material</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Ordered</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Delivered</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Installed</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Remaining</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Availability</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredMaterials.map(m => (
                                            <TableRow key={m.name} className="hover:bg-muted/20">
                                                <TableCell className="font-semibold text-xs">{m.name}</TableCell>
                                                <TableCell className="text-right font-mono text-xs">{m.ordered.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-mono text-xs">{m.delivered.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-mono text-xs">{m.installed.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-mono text-xs text-amber-600 dark:text-amber-400">{m.remaining.toLocaleString()}</TableCell>
                                                <TableCell className="text-right"><ScorePill score={Math.round((m.delivered / Math.max(m.ordered, 1)) * 100)} /></TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredMaterials.length === 0 && (
                                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No materials match your filters</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </GlowCard>
                        )}
                    </section>

                    {/* ═══════════ SECTION 4: QUALITY ═══════════ */}
                    <section id="quality" ref={(el) => { sectionRefs.current.quality = el; }} className={cn("scroll-mt-32 space-y-5", routeSection && routeSection !== "quality" && "hidden")}>
                        <SectionHeader icon={ShieldWarning} iconBg="bg-amber-100 dark:bg-amber-500/20" iconColor="text-amber-600 dark:text-amber-400" title="Quality & NCR Management" subtitle="Non-conformance reports, trends, and risk matrix"
                            badge={data.kpis.quality.criticalNCRs > 0 ? { label: `${data.kpis.quality.criticalNCRs} Critical`, variant: "destructive" as const } : undefined}
                        />
                        <div className="grid gap-4 md:grid-cols-4">
                            <NCRStatCard label="Total NCRs" value={data.kpis.quality.totalNCRs} color="blue" />
                            <NCRStatCard label="Open" value={data.kpis.quality.openNCRs} color="amber" />
                            <NCRStatCard label="Critical" value={data.kpis.quality.criticalNCRs} color="red" alert />
                            <NCRStatCard label="NCR Rate" value={`${data.kpis.quality.ncrRate.toFixed(1)}%`} color={data.kpis.quality.ncrRate > 5 ? "red" : "emerald"} />
                        </div>
                        <div className="grid gap-5 lg:grid-cols-2">
                            <GlowCard>
                                <NCRTrendChart data={ncrTrend} />
                            </GlowCard>
                            <GlowCard>
                                <RiskHeatmap data={risks} onCellClick={(items) => console.log("Risk:", items)} />
                            </GlowCard>
                        </div>
                    </section>

                    {/* ═══════════ SECTION 5: MILESTONES ═══════════ */}
                    <section id="milestones" ref={(el) => { sectionRefs.current.milestones = el; }} className={cn("scroll-mt-32 space-y-5", routeSection && routeSection !== "milestones" && "hidden")}>
                        <SectionHeader icon={Target} iconBg="bg-violet-100 dark:bg-violet-500/20" iconColor="text-violet-600 dark:text-violet-400" title="Milestones & Change Orders" subtitle={`${filteredMilestones.length} milestones · ${filteredChangeOrders.length} change orders`}
                            rightContent={<ViewToggle section="milestones" current={viewModes.milestones} onChange={toggleView} />}
                        />
                        {viewModes.milestones === "chart" ? (
                            <div className="grid gap-5 lg:grid-cols-2">
                                <GlowCard>
                                    <MilestoneProgressChart data={filteredMilestones} onMilestoneClick={(id) => console.log("Milestone:", id)} />
                                </GlowCard>
                                <GlowCard>
                                    <ChangeOrdersWidget data={filteredChangeOrders} onCOClick={(id) => console.log("CO:", id)} />
                                </GlowCard>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <GlowCard noPad>
                                    <div className="px-5 py-3 border-b border-border/40"><h3 className="text-sm font-semibold">Milestones</h3></div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40 dark:bg-muted/20">
                                                <TableHead className="font-semibold text-xs uppercase tracking-wider">Milestone</TableHead>
                                                <TableHead className="font-semibold text-xs uppercase tracking-wider">PO #</TableHead>
                                                <TableHead className="font-semibold text-xs uppercase tracking-wider">Due Date</TableHead>
                                                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Value</TableHead>
                                                <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Progress</TableHead>
                                                <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredMilestones.map(m => (
                                                <TableRow key={m.id} className="hover:bg-muted/20">
                                                    <TableCell className="font-semibold text-xs">{m.name}</TableCell>
                                                    <TableCell className="font-mono text-xs">{m.poNumber}</TableCell>
                                                    <TableCell className="font-mono text-xs">{m.dueDate.toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs">{fmt(m.value)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center gap-2 justify-center">
                                                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${m.progress}%` }} /></div>
                                                            <span className="text-[10px] font-mono">{m.progress}%</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center"><StatusPill status={m.status} /></TableCell>
                                                </TableRow>
                                            ))}
                                            {filteredMilestones.length === 0 && (
                                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No milestones match your filters</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </GlowCard>
                                <GlowCard noPad>
                                    <div className="px-5 py-3 border-b border-border/40"><h3 className="text-sm font-semibold">Change Orders</h3></div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40 dark:bg-muted/20">
                                                <TableHead className="font-semibold text-xs uppercase tracking-wider">Reference</TableHead>
                                                <TableHead className="font-semibold text-xs uppercase tracking-wider">Title</TableHead>
                                                <TableHead className="font-semibold text-xs uppercase tracking-wider">PO #</TableHead>
                                                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Cost Impact</TableHead>
                                                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Time</TableHead>
                                                <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredChangeOrders.map(c => (
                                                <TableRow key={c.id} className="hover:bg-muted/20">
                                                    <TableCell className="font-mono text-xs font-semibold">{c.reference}</TableCell>
                                                    <TableCell className="text-xs max-w-[200px] truncate">{c.title}</TableCell>
                                                    <TableCell className="font-mono text-xs">{c.poNumber}</TableCell>
                                                    <TableCell className={cn("text-right font-mono text-xs", c.costImpact < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>{c.costImpact < 0 ? "-" : "+"}{fmt(Math.abs(c.costImpact))}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs">{c.timeImpactDays > 0 ? `+${c.timeImpactDays}d` : "—"}</TableCell>
                                                    <TableCell className="text-center"><StatusPill status={c.status} /></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </GlowCard>
                            </div>
                        )}
                    </section>

                    {/* ═══════════ SECTION 6: SUPPLIERS ═══════════ */}
                    <section id="suppliers" ref={(el) => { sectionRefs.current.suppliers = el; }} className={cn("scroll-mt-32 space-y-5", routeSection && routeSection !== "suppliers" && "hidden")}>
                        <SectionHeader icon={UsersFour} iconBg="bg-indigo-100 dark:bg-indigo-500/20" iconColor="text-indigo-600 dark:text-indigo-400" title="Supplier Reliability" subtitle={`${filteredSuppliers.length} suppliers across your projects`}
                            rightContent={<ViewToggle section="suppliers" current={viewModes.suppliers} onChange={toggleView} />}
                        />
                        {viewModes.suppliers === "chart" ? (
                            <GlowCard>
                                <SupplierRadarChart suppliers={filteredSuppliers} maxDisplayed={3} />
                            </GlowCard>
                        ) : (
                            <GlowCard noPad>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 dark:bg-muted/20">
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Supplier</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Delivery</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Quality</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Compliance</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Comms</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Overall</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSuppliers.map((s) => (
                                            <TableRow key={s.supplierId} className="hover:bg-muted/20">
                                                <TableCell className="font-semibold">{s.supplierName}</TableCell>
                                                <TableCell className="text-center"><ScorePill score={s.delivery} /></TableCell>
                                                <TableCell className="text-center"><ScorePill score={s.quality} /></TableCell>
                                                <TableCell className="text-center"><ScorePill score={s.compliance} /></TableCell>
                                                <TableCell className="text-center"><ScorePill score={s.communication} /></TableCell>
                                                <TableCell className="text-center"><ScorePill score={s.overall} bold /></TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredSuppliers.length === 0 && (
                                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No suppliers match your filters</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </GlowCard>
                        )}
                    </section>

                    {/* ═══════════ SECTION 7: FINANCIALS ═══════════ */}
                    <section id="financials" ref={(el) => { sectionRefs.current.financials = el; }} className={cn("scroll-mt-32 space-y-5", routeSection && routeSection !== "financials" && "hidden")}>
                        <SectionHeader icon={CurrencyDollar} iconBg="bg-emerald-100 dark:bg-emerald-500/20" iconColor="text-emerald-600 dark:text-emerald-400" title="Cost & Budget" subtitle="Budget utilization, cost waterfall, and payment analytics" />
                        <GlowCard>
                            <BudgetUtilizationBar
                                originalBudget={data.kpis.financial.totalCommitted + data.kpis.financial.retentionHeld}
                                committed={data.kpis.financial.totalCommitted}
                                invoiced={data.kpis.financial.totalPaid + data.kpis.financial.totalUnpaid}
                                paid={data.kpis.financial.totalPaid}
                            />
                        </GlowCard>
                        <GlowCard>
                            <CostWaterfallChart data={waterfall} />
                        </GlowCard>
                        <div className="grid gap-4 md:grid-cols-4">
                            <FinCard label="Total Committed" value={fmt(data.kpis.financial.totalCommitted)} icon={CurrencyDollar} color="blue" />
                            <FinCard label="Paid" value={fmt(data.kpis.financial.totalPaid)} icon={CheckCircle} color="emerald" />
                            <FinCard label="Pending" value={fmt(data.kpis.financial.totalPending)} icon={Clock} color="amber" />
                            <FinCard label="CO Impact" value={fmt(data.kpis.financial.changeOrderImpact)} icon={Lightning} color="violet" />
                        </div>
                    </section>

                    {/* ═══════════ SECTION 8: INSPECTIONS ═══════════ */}
                    <section id="inspections" ref={(el) => { sectionRefs.current.inspections = el; }} className={cn("scroll-mt-32 space-y-5", routeSection && routeSection !== "inspections" && "hidden")}>
                        <SectionHeader icon={CalendarCheck} iconBg="bg-slate-200 dark:bg-slate-500/20" iconColor="text-slate-600 dark:text-slate-400" title="QA Inspections" subtitle={`${filteredInspections.length} inspections · Schedule, pass rates, and upcoming reviews`}
                            rightContent={<ViewToggle section="inspections" current={viewModes.inspections} onChange={toggleView} />}
                        />
                        <div className="grid gap-4 md:grid-cols-3">
                            <InspStatCard label="Scheduled" value={filteredInspections.filter(e => e.status === "scheduled").length} color="blue" />
                            <InspStatCard label="Passed" value={filteredInspections.filter(e => e.status === "passed").length} color="emerald" />
                            <InspStatCard label="Failed" value={filteredInspections.filter(e => e.status === "failed").length} color="red" alert={filteredInspections.filter(e => e.status === "failed").length > 0} />
                        </div>
                        {viewModes.inspections === "chart" ? (
                            <GlowCard>
                                <InspectionCalendar events={filteredInspections} onDayClick={(date, events) => console.log("Day:", date, events)} />
                            </GlowCard>
                        ) : (
                            <GlowCard noPad>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 dark:bg-muted/20">
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Date</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Inspection</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Supplier</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredInspections.map(e => (
                                            <TableRow key={e.id} className="hover:bg-muted/20">
                                                <TableCell className="font-mono text-xs">{e.date}</TableCell>
                                                <TableCell className="font-semibold text-xs">{e.title}</TableCell>
                                                <TableCell className="text-xs">{e.supplier}</TableCell>
                                                <TableCell className="text-center"><StatusPill status={e.status} /></TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredInspections.length === 0 && (
                                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">No inspections match your filters</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </GlowCard>
                        )}
                    </section>

                    {!routeSection && (
                    <div className="flex justify-center pt-6">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-2 rounded-xl hover:bg-muted" onClick={() => scrollTo("overview")}>
                            <ArrowUp className="w-4 h-4" /> Back to top
                        </Button>
                    </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}

// ============================================
// SHARED PREMIUM COMPONENTS
// ============================================
function GlowCard({ children, noPad, className }: { children: React.ReactNode; noPad?: boolean; className?: string }) {
    return (
        <div className={cn(
            "rounded-2xl border border-border/60 bg-card shadow-sm",
            "hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-300",
            !noPad && "p-5",
            className,
        )}>
            {children}
        </div>
    );
}

function GlowKPI({
    label, value, icon: Icon, iconBg, iconColor, trend, trendDir,
}: {
    label: string; value: string; icon: React.ElementType; iconBg: string; iconColor: string;
    trend: string; trendDir: "up" | "down" | "alert" | "neutral";
}) {
    return (
        <div className={cn(
            "rounded-2xl border border-border/60 bg-card p-5",
            "shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group",
        )}>
            <div className="flex items-start justify-between mb-3.5">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110", iconBg)}>
                    <Icon className={cn("w-5.5 h-5.5", iconColor)} weight="duotone" />
                </div>
                {trend && (
                    <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg",
                        trendDir === "up" && "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15",
                        trendDir === "down" && "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-500/15",
                        trendDir === "alert" && "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15",
                        trendDir === "neutral" && "text-muted-foreground bg-muted",
                    )}>
                        {trendDir === "up" && <TrendUp className="w-3 h-3" weight="bold" />}
                        {trendDir === "down" && <TrendDown className="w-3 h-3" weight="bold" />}
                        {trendDir === "alert" && <Warning className="w-3 h-3" weight="bold" />}
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-2xl font-bold font-mono tracking-tighter tabular-nums leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium">{label}</p>
        </div>
    );
}

function MiniKPI({ icon: Icon, label, value, alert }: { icon: React.ElementType; label: string; value: string; alert?: boolean }) {
    return (
        <div className={cn(
            "rounded-xl border p-3.5 transition-all duration-200",
            alert ? "border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-500/5" : "border-border/60 bg-card hover:bg-muted/30",
        )}>
            <div className="flex items-center gap-2 mb-1.5">
                <Icon className={cn("w-4 h-4", alert ? "text-red-500" : "text-muted-foreground/70")} weight="duotone" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
            </div>
            <p className={cn("text-lg font-bold font-mono tabular-nums", alert && "text-red-600 dark:text-red-400")}>{value}</p>
        </div>
    );
}

function SectionHeader({
    icon: Icon, iconBg, iconColor, title, subtitle, badge, rightContent,
}: {
    icon: React.ElementType; iconBg: string; iconColor: string; title: string; subtitle: string;
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
            <div className="flex items-center gap-3">
                {badge && <Badge variant={badge.variant} className="text-[10px] font-bold animate-pulse px-2.5 py-1 rounded-lg">{badge.label}</Badge>}
                {rightContent}
            </div>
        </div>
    );
}

function FinCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: "blue" | "emerald" | "amber" | "violet" }) {
    const styles = {
        blue: { fg: "text-blue-600 dark:text-blue-400" },
        emerald: { fg: "text-emerald-600 dark:text-emerald-400" },
        amber: { fg: "text-amber-600 dark:text-amber-400" },
        violet: { fg: "text-violet-600 dark:text-violet-400" },
    }[color];
    return (
        <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                    <Icon className={cn("w-4 h-4", styles.fg)} weight="duotone" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-xl font-bold font-mono tabular-nums">{value}</p>
        </div>
    );
}

function ScorePill({ score, bold }: { score: number; bold?: boolean }) {
    const color = score >= 80 ? "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15"
        : score >= 60 ? "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15"
        : "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/15";
    return (
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] tabular-nums font-mono", color, bold && "font-bold")}>
            {score}
        </span>
    );
}

function NCRStatCard({ label, value, color, alert }: { label: string; value: number | string; color: "blue" | "amber" | "red" | "emerald"; alert?: boolean }) {
    const palette = {
        blue: "text-blue-600 dark:text-blue-400",
        amber: "text-amber-600 dark:text-amber-400",
        red: "text-red-600 dark:text-red-400",
        emerald: "text-emerald-600 dark:text-emerald-400",
    }[color];
    return (
        <div className={cn("rounded-2xl border border-border/60 bg-card p-5 text-center", alert && "border-red-200/80 dark:border-red-800/40")}>
            <p className={cn("text-3xl font-bold font-mono tabular-nums", palette)}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
        </div>
    );
}

function MatStatCard({ label, value, color }: { label: string; value: string; color: "blue" | "emerald" | "amber" }) {
    const palette = { blue: "text-blue-600 dark:text-blue-400", emerald: "text-emerald-600 dark:text-emerald-400", amber: "text-amber-600 dark:text-amber-400" }[color];
    return (
        <div className="rounded-2xl border border-border/60 bg-card p-5 text-center">
            <p className={cn("text-2xl font-bold font-mono tabular-nums", palette)}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
        </div>
    );
}

function InspStatCard({ label, value, color, alert }: { label: string; value: number; color: "blue" | "emerald" | "red"; alert?: boolean }) {
    const palette = { blue: "text-blue-600 dark:text-blue-400", emerald: "text-emerald-600 dark:text-emerald-400", red: "text-red-600 dark:text-red-400" }[color];
    return (
        <div className={cn("rounded-2xl border border-border/60 bg-card p-5 text-center", alert && "border-red-200/80 dark:border-red-800/40")}>
            <p className={cn("text-3xl font-bold font-mono tabular-nums", palette)}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
        </div>
    );
}

function ViewToggle({ section, current, onChange }: { section: string; current: "chart" | "table"; onChange: (section: string, mode: "chart" | "table") => void }) {
    return (
        <div className="flex items-center rounded-xl border border-border/60 bg-muted/30 p-0.5">
            <button
                onClick={() => onChange(section, "chart")}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200",
                    current === "chart" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <ChartBar className="w-3.5 h-3.5" weight="duotone" />
                Charts
            </button>
            <button
                onClick={() => onChange(section, "table")}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200",
                    current === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Rows className="w-3.5 h-3.5" weight="duotone" />
                Table
            </button>
        </div>
    );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
            {label}
            <button onClick={onRemove} className="hover:text-indigo-900 dark:hover:text-indigo-100 ml-0.5">
                <X className="w-3 h-3" />
            </button>
        </span>
    );
}

function StatusPill({ status }: { status: string }) {
    const styles: Record<string, string> = {
        "delivered": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "in-transit": "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300",
        "at-port": "bg-cyan-100 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
        "customs": "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
        "scheduled": "bg-slate-100 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300",
        "delayed": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "in-progress": "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300",
        "on-track": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "at-risk": "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
        "overdue": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "completed": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "approved": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "submitted": "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300",
        "draft": "bg-slate-100 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300",
        "passed": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "failed": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "pending": "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
    };
    return (
        <span className={cn(
            "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
            styles[status] || "bg-muted text-muted-foreground"
        )}>
            {status.replace(/-/g, " ")}
        </span>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-8 pt-8">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="rounded-2xl border border-border/60 bg-card p-5">
                        <Skeleton className="h-11 w-11 rounded-2xl mb-3.5" />
                        <Skeleton className="h-7 w-28 mb-2" />
                        <Skeleton className="h-3.5 w-20" />
                    </div>
                ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                <Skeleton className="h-72 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
            </div>
            <div className="grid gap-3 grid-cols-3 md:grid-cols-6">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
        </div>
    );
}

// ============================================
// CALCULATIONS
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
function calcMaterialAvailability(materials: MaterialItem[]): number {
    const totalOrdered = materials.reduce((s, m) => s + m.ordered, 0);
    const totalDelivered = materials.reduce((s, m) => s + m.delivered, 0);
    return totalOrdered > 0 ? (totalDelivered / totalOrdered) * 100 : 0;
}
function calcQAPassRate(kpis: DashboardKPIs): number {
    const total = kpis.quality.totalNCRs + kpis.quality.closedNCRs;
    return total > 0 ? ((kpis.quality.closedNCRs) / total) * 100 : 100;
}
function buildWaterfall(kpis: DashboardKPIs): WaterfallItem[] {
    return [
        { name: "Original Budget", value: kpis.financial.totalCommitted, type: "start" },
        { name: "Change Orders", value: kpis.financial.changeOrderImpact, type: "increase" },
        { name: "Payments Made", value: kpis.financial.totalPaid, type: "decrease" },
        { name: "Committed", value: kpis.financial.totalCommitted + kpis.financial.changeOrderImpact - kpis.financial.totalPaid, type: "total" },
        { name: "At-Risk Value", value: kpis.financial.forecastToComplete * 0.15, type: "increase" },
        { name: "Total Exposure", value: kpis.financial.totalCommitted + kpis.financial.changeOrderImpact - kpis.financial.totalPaid + kpis.financial.forecastToComplete * 0.15, type: "total" },
    ];
}

// ============================================
// MOCK DATA
// ============================================
function mockTrafficLight(): TrafficLightData {
    return {
        green: { count: 18, label: "Delivered or on schedule", items: [] },
        amber: { count: 7, label: "1-7 days delay predicted", items: [] },
        red: { count: 3, label: "Confirmed > 7 days delay", items: [] },
    };
}
function mockMilestones(): MilestoneItem[] {
    return [
        { id: "m1", name: "Steel Structure Fabrication", dueDate: new Date("2026-02-15"), progress: 100, value: 450000, status: "completed", poNumber: "PO-2024-0012" },
        { id: "m2", name: "Electrical Panel Delivery", dueDate: new Date("2026-02-22"), progress: 72, value: 280000, status: "on-track", poNumber: "PO-2024-0018" },
        { id: "m3", name: "HVAC Equipment Install", dueDate: new Date("2026-03-01"), progress: 45, value: 620000, status: "at-risk", poNumber: "PO-2024-0021" },
        { id: "m4", name: "Fire Safety Systems", dueDate: new Date("2026-01-28"), progress: 30, value: 185000, status: "overdue", poNumber: "PO-2024-0025" },
        { id: "m5", name: "Cladding Materials", dueDate: new Date("2026-03-10"), progress: 60, value: 340000, status: "on-track", poNumber: "PO-2024-0030" },
        { id: "m6", name: "Plumbing Fixtures", dueDate: new Date("2026-02-05"), progress: 15, value: 95000, status: "overdue", poNumber: "PO-2024-0033" },
        { id: "m7", name: "Elevator System Phase 1", dueDate: new Date("2026-03-20"), progress: 88, value: 520000, status: "on-track", poNumber: "PO-2024-0040" },
    ];
}
function mockNCRTrend(): NCRTrendPoint[] {
    return [
        { month: "Mar", opened: 4, closed: 2, critical: 1 },
        { month: "Apr", opened: 6, closed: 3, critical: 2 },
        { month: "May", opened: 3, closed: 5, critical: 0 },
        { month: "Jun", opened: 5, closed: 4, critical: 1 },
        { month: "Jul", opened: 7, closed: 6, critical: 3 },
        { month: "Aug", opened: 4, closed: 5, critical: 1 },
        { month: "Sep", opened: 6, closed: 4, critical: 2 },
        { month: "Oct", opened: 3, closed: 6, critical: 0 },
        { month: "Nov", opened: 5, closed: 3, critical: 2 },
        { month: "Dec", opened: 8, closed: 5, critical: 3 },
        { month: "Jan", opened: 4, closed: 7, critical: 1 },
        { month: "Feb", opened: 3, closed: 4, critical: 0 },
    ];
}
function mockInspections(): InspectionEvent[] {
    const events: InspectionEvent[] = [];
    const year = 2026; const month = 1; // Feb
    const statuses: Array<"scheduled" | "passed" | "failed" | "pending"> = ["scheduled", "passed", "failed", "pending"];
    const suppliers = ["Supplier A", "Supplier B", "Supplier C"];
    for (let d = 3; d <= 28; d += 3) {
        events.push({
            id: `insp-${d}`,
            date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
            title: `${d <= 12 ? "Material" : d <= 20 ? "Welding" : "Coating"} Inspection`,
            status: statuses[d % 4],
            supplier: suppliers[d % 3],
        });
    }
    return events;
}
function mockSupplierScorecards(): SupplierScorecard[] {
    return [
        { supplierId: "s1", supplierName: "Al-Futtaim Steel", delivery: 92, quality: 88, compliance: 95, communication: 80, pricing: 75, overall: 86 },
        { supplierId: "s2", supplierName: "Gulf Electrical", delivery: 78, quality: 92, compliance: 85, communication: 90, pricing: 82, overall: 85 },
        { supplierId: "s3", supplierName: "Emirates HVAC", delivery: 65, quality: 70, compliance: 80, communication: 75, pricing: 90, overall: 76 },
        { supplierId: "s4", supplierName: "National Plumbing", delivery: 85, quality: 82, compliance: 78, communication: 88, pricing: 85, overall: 84 },
        { supplierId: "s5", supplierName: "Precision Fab", delivery: 90, quality: 95, compliance: 92, communication: 85, pricing: 70, overall: 86 },
    ];
}
function mockMaterials(): MaterialItem[] {
    return [
        { name: "Structural Steel", ordered: 5000, delivered: 4200, installed: 3800, remaining: 800 },
        { name: "Copper Cables", ordered: 12000, delivered: 9500, installed: 8200, remaining: 2500 },
        { name: "Concrete Mix", ordered: 8000, delivered: 7800, installed: 7500, remaining: 200 },
        { name: "HVAC Ducts", ordered: 3000, delivered: 1800, installed: 1200, remaining: 1200 },
        { name: "Fire Rated Doors", ordered: 450, delivered: 280, installed: 200, remaining: 170 },
        { name: "Glass Panels", ordered: 2000, delivered: 1500, installed: 1000, remaining: 500 },
    ];
}
function mockDeliveries(): DeliveryItem[] {
    return [
        { id: "d1", poNumber: "PO-0012", supplier: "Al-Futtaim Steel", description: "Steel Beams Batch #3", expectedDate: new Date("2026-02-10"), status: "in-transit", quantity: 500, unit: "tons", trackingRef: "TRK-4821" },
        { id: "d2", poNumber: "PO-0018", supplier: "Gulf Electrical", description: "MV Switchgear Panel", expectedDate: new Date("2026-02-03"), status: "delayed", quantity: 4, unit: "units", trackingRef: "TRK-4790" },
        { id: "d3", poNumber: "PO-0021", supplier: "Emirates HVAC", description: "AHU Units (Floor 12-15)", expectedDate: new Date("2026-02-14"), status: "at-port", quantity: 8, unit: "units", trackingRef: "TRK-4855" },
        { id: "d4", poNumber: "PO-0025", supplier: "National Fire", description: "Sprinkler Heads & Piping", expectedDate: new Date("2026-01-25"), status: "delayed", quantity: 2000, unit: "pcs" },
        { id: "d5", poNumber: "PO-0030", supplier: "Precision Fab", description: "Aluminum Cladding Panels", expectedDate: new Date("2026-02-20"), status: "scheduled", quantity: 1200, unit: "sqm" },
        { id: "d6", poNumber: "PO-0033", supplier: "National Plumbing", description: "Sanitary Fixtures", expectedDate: new Date("2026-02-12"), status: "customs", quantity: 350, unit: "sets", trackingRef: "TRK-4862" },
        { id: "d7", poNumber: "PO-0040", supplier: "Elevator Co.", description: "Elevator Car Assembly", expectedDate: new Date("2026-02-28"), status: "in-transit", quantity: 2, unit: "units", trackingRef: "TRK-4900" },
        { id: "d8", poNumber: "PO-0012", supplier: "Al-Futtaim Steel", description: "Rebar Batch #5", expectedDate: new Date("2026-02-08"), status: "delivered", quantity: 300, unit: "tons" },
    ];
}
function mockChangeOrders(): ChangeOrderItem[] {
    return [
        { id: "co1", reference: "CO-2026-0015", title: "Additional HVAC zones for floors 16-18", status: "in-progress", costImpact: 185000, timeImpactDays: 14, submittedDate: new Date("2026-01-20"), poNumber: "PO-0021" },
        { id: "co2", reference: "CO-2026-0016", title: "Upgraded fire rating for escape routes", status: "approved", costImpact: 72000, timeImpactDays: 5, submittedDate: new Date("2026-01-25"), poNumber: "PO-0025" },
        { id: "co3", reference: "CO-2026-0017", title: "Value engineering - alternative cladding", status: "submitted", costImpact: -45000, timeImpactDays: 0, submittedDate: new Date("2026-02-01"), poNumber: "PO-0030" },
        { id: "co4", reference: "CO-2026-0018", title: "Scope extension: parking level MEP", status: "draft", costImpact: 320000, timeImpactDays: 21, submittedDate: new Date("2026-02-05"), poNumber: "PO-0018" },
    ];
}
function mockRisks(): RiskItem[] {
    return [
        { id: "1", name: "Emirates HVAC - Late AHU Delivery", supplierRisk: 4, projectImpact: 4, category: "Supply Chain" },
        { id: "2", name: "Steel Quality NCR #23", supplierRisk: 3, projectImpact: 3, category: "Quality" },
        { id: "3", name: "Fire System Budget Overrun", supplierRisk: 2, projectImpact: 5, category: "Financial" },
        { id: "4", name: "Elevator Docs Pending", supplierRisk: 2, projectImpact: 2, category: "Compliance" },
        { id: "5", name: "Plumbing Critical NCR", supplierRisk: 5, projectImpact: 4, category: "Quality" },
        { id: "6", name: "Cladding Design Change", supplierRisk: 3, projectImpact: 3, category: "Design" },
    ];
}
