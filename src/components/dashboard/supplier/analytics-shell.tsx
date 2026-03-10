"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Download, CalendarBlank, Funnel, MagnifyingGlass, X,
    CaretDown, FileText, Truck, Receipt, ShieldCheck, ShieldWarning, Target, Gauge, Buildings,
} from "@phosphor-icons/react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AnalyticsSkeleton, FilterChip, type SupplierAnalyticsPayload } from "./analytics-shared";

// ============================================
// FILTER CONTEXT
// ============================================
interface FilterState {
    searchQuery: string;
    projectFilter: string;
    statusFilter: string;
    timeframe: string;
    customFrom?: Date;
    customTo?: Date;
}

interface FilterContextType extends FilterState {
    setSearchQuery: (v: string) => void;
    setProjectFilter: (v: string) => void;
    setStatusFilter: (v: string) => void;
    setTimeframe: (v: string) => void;
    setCustomFrom: (v: Date | undefined) => void;
    setCustomTo: (v: Date | undefined) => void;
    clearAll: () => void;
    hasActiveFilters: boolean;
    analyticsData: SupplierAnalyticsPayload | null;
    analyticsLoading: boolean;
    analyticsError: string | null;
    refreshAnalytics: () => void;
}

const FilterContext = createContext<FilterContextType | null>(null);

export function useAnalyticsFilters() {
    const ctx = useContext(FilterContext);
    if (!ctx) throw new Error("useAnalyticsFilters must be used within AnalyticsFilterProvider");
    return ctx;
}

// ============================================
// NAV ITEMS
// ============================================
const NAV_ITEMS = [
    { id: "overview", label: "Overview", icon: Gauge, href: "/dashboard/supplier/analytics" },
    { id: "orders", label: "PO Status", icon: FileText, href: "/dashboard/supplier/analytics/orders" },
    { id: "deliveries", label: "Deliveries", icon: Truck, href: "/dashboard/supplier/analytics/deliveries" },
    { id: "invoices", label: "Invoices", icon: Receipt, href: "/dashboard/supplier/analytics/invoices" },
    { id: "ncrs", label: "NCRs", icon: ShieldWarning, href: "/dashboard/supplier/analytics/ncrs" },
    { id: "milestones", label: "Milestones", icon: Target, href: "/dashboard/supplier/analytics/milestones" },
    { id: "compliance", label: "Compliance", icon: ShieldCheck, href: "/dashboard/supplier/analytics/compliance" },
] as const;

// Status options per section
const STATUS_OPTIONS: Record<string, { value: string; label: string }[]> = {
    overview: [],
    orders: [
        { value: "accepted", label: "Accepted" },
        { value: "pending_response", label: "Pending Response" },
        { value: "completed", label: "Completed" },
    ],
    deliveries: [
        { value: "completed", label: "Completed" },
        { value: "in-progress", label: "In Progress" },
        { value: "delayed", label: "Delayed" },
        { value: "pending", label: "Pending" },
    ],
    invoices: [
        { value: "paid", label: "Paid" },
        { value: "approved", label: "Approved" },
        { value: "pending-approval", label: "Pending Approval" },
    ],
    ncrs: [
        { value: "open", label: "Open" },
        { value: "supplier-responded", label: "Responded" },
    ],
    milestones: [
        { value: "completed", label: "Completed" },
        { value: "submitted", label: "Submitted" },
        { value: "pending", label: "Pending" },
    ],
    compliance: [
        { value: "valid", label: "Valid" },
        { value: "expiring", label: "Expiring" },
        { value: "missing", label: "Missing" },
    ],
};

function getActiveSection(pathname: string): string {
    const segment = pathname.split("/").pop();
    if (segment === "analytics") return "overview";
    return segment || "overview";
}

// ============================================
// ANALYTICS SHELL (Layout + Filter Bar)
// ============================================
export function AnalyticsShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const activeSection = getActiveSection(pathname);

    // Filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [projectFilter, setProjectFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [timeframe, setTimeframeValue] = useState("all");
    const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
    const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
    const [showFilters, setShowFilters] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<SupplierAnalyticsPayload | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analyticsError, setAnalyticsError] = useState<string | null>(null);

    const setTimeframe = useCallback((value: string) => {
        setTimeframeValue(value);

        if (value !== "custom") {
            setCustomFrom(undefined);
            setCustomTo(undefined);
            return;
        }

        setCustomFrom((prev) => prev ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    }, []);

    // Get status options for current section and derive effective filter
    const statusOptions = STATUS_OPTIONS[activeSection] || [];
    const validStatusValues = statusOptions.map(o => o.value);
    const effectiveStatusFilter = statusFilter === "all" || validStatusValues.includes(statusFilter) ? statusFilter : "all";

    const fetchAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        try {
            const params = new URLSearchParams();

            if (projectFilter !== "all") {
                params.set("projectId", projectFilter);
            }

            if (timeframe === "custom") {
                if (customFrom) params.set("dateFrom", customFrom.toISOString());
                if (customTo) params.set("dateTo", customTo.toISOString());
            } else if (timeframe !== "all") {
                const now = new Date();
                let from: Date | null = null;
                if (timeframe === "7d") from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                if (timeframe === "30d") from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                if (timeframe === "90d") from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                if (from) {
                    params.set("dateFrom", from.toISOString());
                    params.set("dateTo", now.toISOString());
                }
            }

            const res = await fetch(`/api/dashboard/supplier/analytics?${params.toString()}`);
            if (!res.ok) {
                throw new Error("Failed to fetch supplier analytics");
            }

            const json = await res.json();
            if (!json.success || !json.data) {
                throw new Error(json.error || "Invalid analytics response");
            }

            setAnalyticsData(json.data as SupplierAnalyticsPayload);
        } catch (error) {
            setAnalyticsError(error instanceof Error ? error.message : "Failed to load analytics");
        } finally {
            setAnalyticsLoading(false);
        }
    }, [projectFilter, timeframe, customFrom, customTo]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const projectList = analyticsData?.projects ?? [];

    const hasActiveFilters =
        searchQuery !== "" ||
        projectFilter !== "all" ||
        effectiveStatusFilter !== "all" ||
        timeframe !== "all";
    const clearAll = useCallback(() => {
        setSearchQuery("");
        setProjectFilter("all");
        setStatusFilter("all");
        setTimeframe("all");
    }, [setTimeframe]);

    const handleExport = useCallback((format: "csv" | "xlsx") => {
        toast.info(`Supplier analytics ${format.toUpperCase()} export is not wired yet.`);
    }, []);

    const filterCtx: FilterContextType = {
        searchQuery,
        projectFilter,
        statusFilter: effectiveStatusFilter,
        timeframe,
        customFrom,
        customTo,
        setSearchQuery,
        setProjectFilter,
        setStatusFilter,
        setTimeframe,
        setCustomFrom,
        setCustomTo,
        clearAll, hasActiveFilters,
        analyticsData,
        analyticsLoading,
        analyticsError,
        refreshAnalytics: fetchAnalytics,
    };

    return (
        <FilterContext.Provider value={filterCtx}>
            <div className="w-full max-w-[1440px] mx-auto space-y-0 px-1 pb-3">
                {/* ── HEADER ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                            <Buildings className="w-5 h-5 text-blue-600 dark:text-blue-400" weight="duotone" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight leading-none">Supplier Analytics</h1>
                            <p className="text-xs text-muted-foreground mt-0.5">PO status · Deliveries · Invoices · Compliance</p>
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
                                {projectList.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
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
                        <Button
                            variant={showFilters ? "default" : "outline"}
                            size="sm"
                            className={cn("h-9 rounded-xl text-xs gap-1.5", showFilters && "bg-indigo-600 hover:bg-indigo-700 text-white")}
                            onClick={() => setShowFilters(v => !v)}
                        >
                            <Funnel className="w-3.5 h-3.5" weight={showFilters ? "fill" : "regular"} />
                            Filters
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs gap-1.5">
                                    <Download className="w-3.5 h-3.5" /> Export <CaretDown className="w-3 h-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleExport("csv")} className="text-xs gap-2"><FileText className="w-3.5 h-3.5" />CSV</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport("xlsx")} className="text-xs gap-2"><FileText className="w-3.5 h-3.5" />Excel</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* ── FILTER PANEL (expandable) ── */}
                {showFilters && (
                    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 mb-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative flex-1 min-w-[200px] max-w-xs">
                                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search POs, invoices, NCRs..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-xs rounded-xl border-border/60"
                                />
                            </div>
                            {statusOptions.length > 0 && (
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-40 h-9 text-xs rounded-xl border-border/60">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {statusOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground hover:text-foreground" onClick={clearAll}>
                                    <X className="w-3.5 h-3.5 mr-1" /> Clear All
                                </Button>
                            )}
                        </div>
                        {hasActiveFilters && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {searchQuery && <FilterChip label={`Search: "${searchQuery}"`} onRemove={() => setSearchQuery("")} />}
                                {projectFilter !== "all" && <FilterChip label={`Project: ${projectList.find(p => p.id === projectFilter)?.name ?? projectFilter}`} onRemove={() => setProjectFilter("all")} />}
                                {statusFilter !== "all" && <FilterChip label={`Status: ${statusFilter}`} onRemove={() => setStatusFilter("all")} />}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB NAVIGATION ── */}
                <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/40 -mx-1 px-1 py-2 mb-6">
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                        {NAV_ITEMS.map(item => {
                            const Icon = item.icon;
                            const isActive = item.id === activeSection;
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200",
                                        isActive
                                            ? "bg-foreground text-background shadow-sm"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" weight={isActive ? "fill" : "duotone"} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* ── PAGE CONTENT ── */}
                {analyticsLoading ? (
                    <div className="py-4">
                        <AnalyticsSkeleton />
                    </div>
                ) : analyticsError ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                        {analyticsError}
                    </div>
                ) : (
                    children
                )}
            </div>
        </FilterContext.Provider>
    );
}
