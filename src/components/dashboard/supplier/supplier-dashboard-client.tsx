"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Download, CalendarBlank, CurrencyDollar, CheckCircle,
    Clock, Funnel, Truck, Receipt,
    CaretDown, ChartBar, Rows, MagnifyingGlass, X,
    ShieldCheck, FileText, CalendarCheck, Target, Gauge, ShieldWarning,
    Buildings,
} from "@phosphor-icons/react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Supplier Charts
import { POStatusRadial } from "./charts/po-status-radial";
import type { POStatusData } from "./charts/po-status-radial";
import { DeliveryGantt } from "./charts/delivery-gantt";
import type { DeliveryTimelineItem } from "./charts/delivery-gantt";
import { InvoiceCycleLine } from "./charts/invoice-cycle-line";
import type { InvoiceCyclePoint } from "./charts/invoice-cycle-line";
import { ComplianceGauge } from "./charts/compliance-gauge";
import type { ComplianceData } from "./charts/compliance-gauge";
import { NCRStackedBars } from "./charts/ncr-stacked-bars";
import type { NCRMonthData } from "./charts/ncr-stacked-bars";
import { DocumentGrid } from "./charts/document-grid";
import type { DocumentStatusItem } from "./charts/document-grid";

// ============================================
// TYPES
// ============================================
interface SupplierKPIs {
    totalActivePOs: number;
    pendingDeliveries: number;
    invoicesPendingApproval: number;
    ncrsAssigned: number;
    onTimeDeliveryScore: number;
    averagePaymentCycle: number;
    upcomingDeliveriesThisWeek: number;
    documentComplianceScore: number;
    milestonesPendingApproval: number;
    totalPaymentsReceived: number;
    totalPOValue: number;
    currency: string;
}

interface POItem {
    id: string;
    poNumber: string;
    project: string;
    totalValue: number;
    currency: string;
    status: string;
    createdAt: string;
    deliveryProgress: number;
}

interface InvoiceItem {
    id: string;
    invoiceNumber: string;
    poNumber: string;
    amount: number;
    status: string;
    submittedDate: string;
    dueDate: string;
    paidAt: string | null;
}

interface MilestoneItem {
    id: string;
    title: string;
    poNumber: string;
    expectedDate: string;
    amount: number;
    status: string;
    paymentPercentage: number;
}

interface NCRItem {
    id: string;
    ncrNumber: string;
    title: string;
    severity: string;
    status: string;
    reportedAt: string;
    slaDueAt: string | null;
}

// ============================================
// SECTION NAV
// ============================================
const SECTIONS = [
    { id: "overview", label: "Overview", icon: Gauge },
    { id: "orders", label: "PO Status", icon: FileText },
    { id: "deliveries", label: "Deliveries", icon: Truck },
    { id: "invoices", label: "Invoices", icon: Receipt },
    { id: "ncrs", label: "NCRs", icon: ShieldWarning },
    { id: "milestones", label: "Milestones", icon: Target },
    { id: "compliance", label: "Compliance", icon: ShieldCheck },
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
// MOCK DATA — replaced by API once wired
// ============================================
function mockKPIs(): SupplierKPIs {
    return {
        totalActivePOs: 4, pendingDeliveries: 3, invoicesPendingApproval: 2,
        ncrsAssigned: 1, onTimeDeliveryScore: 87, averagePaymentCycle: 18,
        upcomingDeliveriesThisWeek: 2, documentComplianceScore: 85,
        milestonesPendingApproval: 3, totalPaymentsReceived: 145000,
        totalPOValue: 520000, currency: "USD",
    };
}

function mockPOs(): POItem[] {
    return [
        { id: "1", poNumber: "PO-2024-001", project: "Al Wakra Highway", totalValue: 180000, currency: "USD", status: "ACCEPTED", createdAt: "2025-11-05", deliveryProgress: 65 },
        { id: "2", poNumber: "PO-2024-002", project: "Lusail Station", totalValue: 220000, currency: "USD", status: "ACCEPTED", createdAt: "2025-12-10", deliveryProgress: 30 },
        { id: "3", poNumber: "PO-2024-003", project: "Industrial City", totalValue: 75000, currency: "USD", status: "PENDING_RESPONSE", createdAt: "2026-01-15", deliveryProgress: 0 },
        { id: "4", poNumber: "PO-2024-004", project: "Al Wakra Highway", totalValue: 45000, currency: "USD", status: "COMPLETED", createdAt: "2025-08-20", deliveryProgress: 100 },
    ];
}

function mockPOStatus(): POStatusData {
    return {
        delivered: { count: 1, value: 45000 },
        inProgress: { count: 2, value: 400000 },
        pending: { count: 1, value: 75000 },
        overdue: { count: 0, value: 0 },
        total: { count: 4, value: 520000 },
    };
}

function mockDeliveryTimeline(): DeliveryTimelineItem[] {
    return [
        { id: "d1", poNumber: "PO-2024-001", description: "Steel reinforcement bars", stages: [
            { name: "dispatch", date: "2026-01-20", status: "completed" }, { name: "transit", date: "2026-01-25", status: "completed" },
            { name: "delivered", date: "2026-02-01", status: "completed" }, { name: "inspected", date: null, status: "in-progress" },
        ]},
        { id: "d2", poNumber: "PO-2024-001", description: "Concrete mix grade C40", stages: [
            { name: "dispatch", date: "2026-02-03", status: "completed" }, { name: "transit", date: "2026-02-05", status: "in-progress" },
            { name: "delivered", date: null, status: "pending" }, { name: "inspected", date: null, status: "pending" },
        ]},
        { id: "d3", poNumber: "PO-2024-002", description: "HVAC ductwork", stages: [
            { name: "dispatch", date: "2026-01-28", status: "completed" }, { name: "transit", date: "2026-02-01", status: "delayed" },
            { name: "delivered", date: null, status: "pending" }, { name: "inspected", date: null, status: "pending" },
        ]},
    ];
}

function mockInvoiceCycle(): InvoiceCyclePoint[] {
    return [
        { id: "i1", invoiceNumber: "INV-001", submittedDate: "2025-09-15", daysToApproval: 8, amount: 22500, status: "PAID" },
        { id: "i2", invoiceNumber: "INV-002", submittedDate: "2025-10-20", daysToApproval: 12, amount: 18000, status: "PAID" },
        { id: "i3", invoiceNumber: "INV-003", submittedDate: "2025-11-10", daysToApproval: 16, amount: 35000, status: "APPROVED" },
        { id: "i4", invoiceNumber: "INV-004", submittedDate: "2025-12-05", daysToApproval: 10, amount: 28000, status: "PAID" },
        { id: "i5", invoiceNumber: "INV-005", submittedDate: "2026-01-15", daysToApproval: 20, amount: 41500, status: "PENDING_APPROVAL" },
    ];
}

function mockInvoices(): InvoiceItem[] {
    return [
        { id: "i1", invoiceNumber: "INV-001", poNumber: "PO-2024-004", amount: 22500, status: "PAID", submittedDate: "2025-09-15", dueDate: "2025-10-15", paidAt: "2025-09-23" },
        { id: "i2", invoiceNumber: "INV-002", poNumber: "PO-2024-004", amount: 18000, status: "PAID", submittedDate: "2025-10-20", dueDate: "2025-11-20", paidAt: "2025-11-01" },
        { id: "i3", invoiceNumber: "INV-003", poNumber: "PO-2024-001", amount: 35000, status: "APPROVED", submittedDate: "2025-11-10", dueDate: "2025-12-10", paidAt: null },
        { id: "i4", invoiceNumber: "INV-004", poNumber: "PO-2024-001", amount: 28000, status: "PAID", submittedDate: "2025-12-05", dueDate: "2026-01-05", paidAt: "2025-12-15" },
        { id: "i5", invoiceNumber: "INV-005", poNumber: "PO-2024-002", amount: 41500, status: "PENDING_APPROVAL", submittedDate: "2026-01-15", dueDate: "2026-02-15", paidAt: null },
    ];
}

function mockComplianceData(): ComplianceData {
    return {
        overallScore: 85,
        documents: [
            { type: "Trade License", status: "valid", expiryDate: "2027-03-15", uploadDate: "2025-04-01" },
            { type: "ISO 9001 Certificate", status: "valid", expiryDate: "2026-12-31", uploadDate: "2025-01-15" },
            { type: "Insurance Policy", status: "expiring", expiryDate: "2026-03-10", uploadDate: "2025-03-10" },
            { type: "Tax Registration", status: "valid", uploadDate: "2025-06-20" },
            { type: "Safety Compliance Cert", status: "missing" },
            { type: "Environmental Permit", status: "valid", expiryDate: "2027-06-30", uploadDate: "2025-07-01" },
        ],
    };
}

function mockDocuments(): DocumentStatusItem[] {
    return [
        { id: "doc1", type: "Trade License", status: "valid", expiryDate: "2027-03-15", uploadDate: "2025-04-01" },
        { id: "doc2", type: "ISO 9001 Certificate", status: "valid", expiryDate: "2026-12-31", uploadDate: "2025-01-15" },
        { id: "doc3", type: "Insurance Policy", status: "expiring", expiryDate: "2026-03-10", uploadDate: "2025-03-10" },
        { id: "doc4", type: "Tax Registration", status: "valid", uploadDate: "2025-06-20" },
        { id: "doc5", type: "Safety Compliance Cert", status: "missing" },
        { id: "doc6", type: "Environmental Permit", status: "valid", expiryDate: "2027-06-30", uploadDate: "2025-07-01" },
    ];
}

function mockNCRMonthly(): NCRMonthData[] {
    return [
        { month: "Sep 25", accepted: 1, rejected: 0, awaiting: 0 },
        { month: "Oct 25", accepted: 0, rejected: 1, awaiting: 0 },
        { month: "Nov 25", accepted: 1, rejected: 0, awaiting: 1 },
        { month: "Dec 25", accepted: 2, rejected: 0, awaiting: 0 },
        { month: "Jan 26", accepted: 0, rejected: 0, awaiting: 1 },
        { month: "Feb 26", accepted: 0, rejected: 0, awaiting: 0 },
    ];
}

function mockNCRs(): NCRItem[] {
    return [
        { id: "n1", ncrNumber: "NCR-001", title: "Damaged steel bars on delivery", severity: "MAJOR", status: "OPEN", reportedAt: "2026-01-20", slaDueAt: "2026-02-03" },
        { id: "n2", ncrNumber: "NCR-002", title: "Wrong spec concrete mix", severity: "MINOR", status: "SUPPLIER_RESPONDED", reportedAt: "2025-12-15", slaDueAt: null },
    ];
}

function mockMilestones(): MilestoneItem[] {
    return [
        { id: "m1", title: "Material Procurement Complete", poNumber: "PO-2024-001", expectedDate: "2026-01-30", amount: 36000, status: "COMPLETED", paymentPercentage: 20 },
        { id: "m2", title: "First Delivery Batch", poNumber: "PO-2024-001", expectedDate: "2026-02-15", amount: 54000, status: "SUBMITTED", paymentPercentage: 30 },
        { id: "m3", title: "Installation Phase 1", poNumber: "PO-2024-001", expectedDate: "2026-03-30", amount: 90000, status: "PENDING", paymentPercentage: 50 },
        { id: "m4", title: "Initial Delivery", poNumber: "PO-2024-002", expectedDate: "2026-02-28", amount: 66000, status: "PENDING", paymentPercentage: 30 },
        { id: "m5", title: "Quality Inspection", poNumber: "PO-2024-002", expectedDate: "2026-03-15", amount: 44000, status: "PENDING", paymentPercentage: 20 },
    ];
}

// ============================================
// MAIN COMPONENT
// ============================================
export function SupplierDashboardClient({ initialTab }: { initialTab?: string }) {
    const [loading, setLoading] = useState(true);
    const validTab = SECTIONS.find(s => s.id === initialTab)?.id;
    const [activeSection, setActiveSection] = useState<SectionId>(validTab || "overview");

    // Data state
    const [kpis] = useState<SupplierKPIs>(mockKPIs());
    const [poStatus] = useState<POStatusData>(mockPOStatus());
    const [pos] = useState<POItem[]>(mockPOs());
    const [deliveryTimeline] = useState<DeliveryTimelineItem[]>(mockDeliveryTimeline());
    const [invoiceCycle] = useState<InvoiceCyclePoint[]>(mockInvoiceCycle());
    const [invoices] = useState<InvoiceItem[]>(mockInvoices());
    const [compliance] = useState<ComplianceData>(mockComplianceData());
    const [documents] = useState<DocumentStatusItem[]>(mockDocuments());
    const [ncrMonthly] = useState<NCRMonthData[]>(mockNCRMonthly());
    const [ncrs] = useState<NCRItem[]>(mockNCRs());
    const [milestones] = useState<MilestoneItem[]>(mockMilestones());

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [projectFilter, setProjectFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [timeframe, setTimeframe] = useState("all");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [viewModes, setViewModes] = useState<Record<string, "chart" | "table">>({
        orders: "chart", deliveries: "chart", invoices: "chart",
        ncrs: "chart", milestones: "table", compliance: "chart",
    });
    const toggleView = useCallback((section: string, mode: "chart" | "table") => {
        setViewModes(prev => ({ ...prev, [section]: mode }));
    }, []);

    // Real projects from API
    const [projectList, setProjectList] = useState<Array<{ id: string; name: string }>>([]);

    useEffect(() => {
        async function fetchProjects() {
            try {
                const res = await fetch("/api/projects/list");
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data?.projects) {
                        setProjectList(json.data.projects.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
                    }
                }
            } catch { /* ignore */ }
        }
        fetchProjects();
    }, []);

    // Unique projects from POs
    const uniqueProjects = useMemo(() => [...new Set(pos.map(p => p.project))].sort(), [pos]);

    // Scroll spy
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => { for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id as SectionId); },
            { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
        );
        Object.values(sectionRefs.current).forEach(r => { if (r) observer.observe(r); });
        return () => observer.disconnect();
    }, []);

    // Simulate loading
    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 600);
        return () => clearTimeout(t);
    }, []);

    // Scroll to initial tab section after loading
    useEffect(() => {
        if (!loading && validTab && sectionRefs.current[validTab]) {
            setTimeout(() => {
                sectionRefs.current[validTab]?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        }
    }, [loading, validTab]);

    // ── Filtered data ──
    const filteredPOs = useMemo(() => {
        let items = pos;
        if (searchQuery) items = items.filter(p => p.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) || p.project.toLowerCase().includes(searchQuery.toLowerCase()));
        if (projectFilter !== "all") items = items.filter(p => p.project === projectFilter);
        if (statusFilter !== "all") items = items.filter(p => p.status.toLowerCase() === statusFilter);
        return items;
    }, [pos, searchQuery, projectFilter, statusFilter]);

    const filteredDeliveries = useMemo(() => {
        let items = deliveryTimeline;
        if (searchQuery) items = items.filter(d => d.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) || d.description.toLowerCase().includes(searchQuery.toLowerCase()));
        if (projectFilter !== "all") {
            const projectPOs = pos.filter(p => p.project === projectFilter).map(p => p.poNumber);
            items = items.filter(d => projectPOs.includes(d.poNumber));
        }
        return items;
    }, [deliveryTimeline, searchQuery, projectFilter, pos]);

    const filteredInvoices = useMemo(() => {
        let items = invoices;
        if (searchQuery) items = items.filter(i => i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || i.poNumber.toLowerCase().includes(searchQuery.toLowerCase()));
        if (statusFilter !== "all") items = items.filter(i => i.status.toLowerCase().replace(/_/g, "-") === statusFilter);
        return items;
    }, [invoices, searchQuery, statusFilter]);

    const filteredNCRs = useMemo(() => {
        let items = ncrs;
        if (searchQuery) items = items.filter(n => n.ncrNumber.toLowerCase().includes(searchQuery.toLowerCase()) || n.title.toLowerCase().includes(searchQuery.toLowerCase()));
        if (statusFilter !== "all") items = items.filter(n => n.status.toLowerCase() === statusFilter);
        return items;
    }, [ncrs, searchQuery, statusFilter]);

    const filteredMilestones = useMemo(() => {
        let items = milestones;
        if (searchQuery) items = items.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.poNumber.toLowerCase().includes(searchQuery.toLowerCase()));
        if (statusFilter !== "all") items = items.filter(m => m.status.toLowerCase() === statusFilter);
        return items;
    }, [milestones, searchQuery, statusFilter]);

    // ── Export ──
    const handleExport = useCallback((format: "csv" | "xlsx") => {
        toast.success(`Exported supplier data as ${format.toUpperCase()}`);
    }, []);

    if (loading) return <DashboardSkeleton />;

    const hasActiveFilters = searchQuery || projectFilter !== "all" || statusFilter !== "all";

    return (
        <div className="w-full max-w-[1440px] mx-auto space-y-6 px-1 pt-6 pb-20">
            {/* ── HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                        <Buildings className="w-5 h-5 text-blue-600 dark:text-blue-400" weight="duotone" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight leading-none">Supplier Dashboard</h1>
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
                            {(projectList.length > 0 ? projectList : uniqueProjects.map((p, i) => ({ id: `p-${i}`, name: p }))).map(p => (
                                <SelectItem key={typeof p === "string" ? p : p.id} value={typeof p === "string" ? p : p.name}>{typeof p === "string" ? p : p.name}</SelectItem>
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
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                            <SelectItem value="90d">Last 90 Days</SelectItem>
                            <SelectItem value="ytd">Year to Date</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant={showAdvancedFilters ? "default" : "outline"}
                        size="sm"
                        className={cn("h-9 rounded-xl text-xs gap-1.5", showAdvancedFilters && "bg-indigo-600 hover:bg-indigo-700 text-white")}
                        onClick={() => setShowAdvancedFilters(v => !v)}
                    >
                        <Funnel className="w-3.5 h-3.5" weight={showAdvancedFilters ? "fill" : "regular"} />
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

            {/* ── ADVANCED FILTERS PANEL ── */}
            {showAdvancedFilters && (
                <Card className="rounded-2xl border-border/60 bg-card/80 backdrop-blur-sm p-4">
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
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-40 h-9 text-xs rounded-xl border-border/60">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="accepted">Accepted</SelectItem>
                                <SelectItem value="pending_response">Pending Response</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="pending-approval">Pending Approval</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="submitted">Submitted</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => { setSearchQuery(""); setProjectFilter("all"); setStatusFilter("all"); }}>
                                <X className="w-3.5 h-3.5 mr-1" /> Clear All
                            </Button>
                        )}
                    </div>
                    {hasActiveFilters && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {searchQuery && <FilterChip label={`Search: "${searchQuery}"`} onRemove={() => setSearchQuery("")} />}
                            {projectFilter !== "all" && <FilterChip label={`Project: ${projectFilter}`} onRemove={() => setProjectFilter("all")} />}
                            {statusFilter !== "all" && <FilterChip label={`Status: ${statusFilter}`} onRemove={() => setStatusFilter("all")} />}
                        </div>
                    )}
                </Card>
            )}

            {/* ── STICKY SECTION NAV ── */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/40 -mx-1 px-1 py-2">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                    {SECTIONS.map(s => {
                        const Icon = s.icon;
                        return (
                            <button
                                key={s.id}
                                onClick={() => { sectionRefs.current[s.id]?.scrollIntoView({ behavior: "smooth", block: "start" }); setActiveSection(s.id); }}
                                className={cn(
                                    "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200",
                                    activeSection === s.id
                                        ? "bg-foreground text-background shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" weight={activeSection === s.id ? "fill" : "duotone"} />
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                SECTION 1: OVERVIEW (KPI Cards)
            ═══════════════════════════════════════════ */}
            <div id="overview" ref={el => { sectionRefs.current["overview"] = el; }} className="scroll-mt-20 space-y-5">
                <SectionHeader icon={Gauge} iconBg="bg-slate-100 dark:bg-slate-500/20" iconColor="text-slate-600 dark:text-slate-400" title="Overview" subtitle="Key performance indicators at a glance" />

                <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                    <KPICard label="Active POs" value={kpis.totalActivePOs.toString()} icon={FileText} color="blue" subtitle={fmt(kpis.totalPOValue, kpis.currency === "USD" ? "$" : kpis.currency + " ")} />
                    <KPICard label="Pending Deliveries" value={kpis.pendingDeliveries.toString()} icon={Truck} color="amber" subtitle={`${kpis.upcomingDeliveriesThisWeek} this week`} />
                    <KPICard label="Invoices Pending" value={kpis.invoicesPendingApproval.toString()} icon={Receipt} color="violet" subtitle={`Avg ${kpis.averagePaymentCycle}d cycle`} />
                    <KPICard label="Open NCRs" value={kpis.ncrsAssigned.toString()} icon={ShieldWarning} color="red" alert={kpis.ncrsAssigned > 0} subtitle="Requires response" />
                    <KPICard label="On-Time Delivery" value={pct(kpis.onTimeDeliveryScore, 0)} icon={CheckCircle} color="emerald" subtitle="Delivery score" />
                </div>
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                    <KPICard label="Compliance Score" value={pct(kpis.documentComplianceScore, 0)} icon={ShieldCheck} color="emerald" subtitle="Document health" />
                    <KPICard label="Milestones Pending" value={kpis.milestonesPendingApproval.toString()} icon={Target} color="amber" subtitle="Awaiting client approval" />
                    <KPICard label="Payments Received" value={fmt(kpis.totalPaymentsReceived)} icon={CurrencyDollar} color="emerald" subtitle="Total to date" />
                    <KPICard label="Avg Payment Cycle" value={`${kpis.averagePaymentCycle}d`} icon={Clock} color="blue" subtitle="Invoice to payment" />
                    <KPICard label="This Week" value={kpis.upcomingDeliveriesThisWeek.toString()} icon={CalendarCheck} color="blue" subtitle="Upcoming deliveries" />
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                SECTION 2: PO STATUS
            ═══════════════════════════════════════════ */}
            <div id="orders" ref={el => { sectionRefs.current["orders"] = el; }} className="scroll-mt-20 space-y-5">
                <SectionHeader
                    icon={FileText} iconBg="bg-blue-100 dark:bg-blue-500/20" iconColor="text-blue-600 dark:text-blue-400"
                    title="Purchase Order Status" subtitle={`${filteredPOs.length} purchase orders`}
                    badge={kpis.totalActivePOs > 0 ? { label: `${kpis.totalActivePOs} Active`, variant: "default" } : undefined}
                    rightContent={<ViewToggle section="orders" current={viewModes.orders} onChange={toggleView} />}
                />

                {viewModes.orders === "chart" ? (
                    <div className="grid gap-5 lg:grid-cols-2">
                        <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-3">PO Distribution</p>
                            <POStatusRadial data={poStatus} />
                        </Card>
                        <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-3">Orders List</p>
                            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                                {filteredPOs.map(po => (
                                    <div key={po.id} className="flex items-center gap-3 rounded-xl border border-border/40 p-3 bg-card/50 hover:bg-muted/30 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                                            <FileText className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" weight="duotone" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold">{po.poNumber}</span>
                                                <StatusPill status={po.status.toLowerCase().replace(/_/g, "-")} />
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{po.project}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-bold font-mono">{fmt(po.totalValue, "$")}</p>
                                            <div className="flex items-center gap-1 mt-1 justify-end">
                                                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${po.deliveryProgress}%` }} />
                                                </div>
                                                <span className="text-[9px] text-muted-foreground">{po.deliveryProgress}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                ) : (
                    <Card className="rounded-2xl border-border/60 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="text-[10px] font-bold uppercase">PO Number</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Project</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Value</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Progress</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPOs.map(po => (
                                    <TableRow key={po.id} className="text-xs hover:bg-muted/20">
                                        <TableCell className="font-semibold">{po.poNumber}</TableCell>
                                        <TableCell>{po.project}</TableCell>
                                        <TableCell className="font-mono">{fmt(po.totalValue)}</TableCell>
                                        <TableCell><StatusPill status={po.status.toLowerCase().replace(/_/g, "-")} /></TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5"><div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${po.deliveryProgress}%` }} /></div><span className="text-[10px]">{po.deliveryProgress}%</span></div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{new Date(po.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>

            {/* ═══════════════════════════════════════════
                SECTION 3: DELIVERY TIMELINE
            ═══════════════════════════════════════════ */}
            <div id="deliveries" ref={el => { sectionRefs.current["deliveries"] = el; }} className="scroll-mt-20 space-y-5">
                <SectionHeader
                    icon={Truck} iconBg="bg-cyan-100 dark:bg-cyan-500/20" iconColor="text-cyan-600 dark:text-cyan-400"
                    title="Delivery Timeline" subtitle={`${filteredDeliveries.length} active shipments`}
                    badge={kpis.pendingDeliveries > 0 ? { label: `${kpis.pendingDeliveries} Pending`, variant: "destructive" } : undefined}
                    rightContent={<ViewToggle section="deliveries" current={viewModes.deliveries} onChange={toggleView} />}
                />

                {viewModes.deliveries === "chart" ? (
                    <Card className="rounded-2xl border-border/60 bg-card p-5">
                        <DeliveryGantt items={filteredDeliveries} />
                    </Card>
                ) : (
                    <Card className="rounded-2xl border-border/60 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="text-[10px] font-bold uppercase">PO</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Description</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Dispatched</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Transit</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Delivered</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Inspected</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDeliveries.map(d => {
                                    const hasDelayed = d.stages.some(s => s.status === "delayed");
                                    const allDone = d.stages.every(s => s.status === "completed");
                                    const overallStatus = hasDelayed ? "delayed" : allDone ? "completed" : "in-progress";
                                    return (
                                        <TableRow key={d.id} className="text-xs hover:bg-muted/20">
                                            <TableCell className="font-semibold">{d.poNumber}</TableCell>
                                            <TableCell className="max-w-[180px] truncate">{d.description}</TableCell>
                                            {d.stages.map(s => (
                                                <TableCell key={s.name}>
                                                    {s.date ? new Date(s.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                                                </TableCell>
                                            ))}
                                            <TableCell><StatusPill status={overallStatus} /></TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>

            {/* ═══════════════════════════════════════════
                SECTION 4: INVOICE CYCLE
            ═══════════════════════════════════════════ */}
            <div id="invoices" ref={el => { sectionRefs.current["invoices"] = el; }} className="scroll-mt-20 space-y-5">
                <SectionHeader
                    icon={Receipt} iconBg="bg-violet-100 dark:bg-violet-500/20" iconColor="text-violet-600 dark:text-violet-400"
                    title="Invoice Cycle Analytics" subtitle={`${filteredInvoices.length} invoices tracked`}
                    rightContent={<ViewToggle section="invoices" current={viewModes.invoices} onChange={toggleView} />}
                />

                {viewModes.invoices === "chart" ? (
                    <div className="grid gap-5 lg:grid-cols-2">
                        <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-3">Days to Approval Trend</p>
                            <InvoiceCycleLine data={invoiceCycle} />
                        </Card>
                        <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-3">Invoice Summary</p>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <StatCard label="Total Invoiced" value={fmt(invoices.reduce((s, i) => s + i.amount, 0))} color="blue" />
                                <StatCard label="Paid" value={fmt(invoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.amount, 0))} color="emerald" />
                                <StatCard label="Pending Approval" value={fmt(invoices.filter(i => i.status === "PENDING_APPROVAL").reduce((s, i) => s + i.amount, 0))} color="amber" />
                                <StatCard label="Avg Cycle" value={`${kpis.averagePaymentCycle}d`} color="violet" />
                            </div>
                            <div className="space-y-2">
                                {filteredInvoices.slice(0, 4).map(inv => (
                                    <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 bg-card/50">
                                        <div>
                                            <span className="text-xs font-bold">{inv.invoiceNumber}</span>
                                            <span className="text-[10px] text-muted-foreground ml-2">{inv.poNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono">{fmt(inv.amount)}</span>
                                            <StatusPill status={inv.status.toLowerCase().replace(/_/g, "-")} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                ) : (
                    <Card className="rounded-2xl border-border/60 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="text-[10px] font-bold uppercase">Invoice #</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">PO</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Amount</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Submitted</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Due Date</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Paid</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInvoices.map(inv => (
                                    <TableRow key={inv.id} className="text-xs hover:bg-muted/20">
                                        <TableCell className="font-semibold">{inv.invoiceNumber}</TableCell>
                                        <TableCell>{inv.poNumber}</TableCell>
                                        <TableCell className="font-mono">{fmt(inv.amount)}</TableCell>
                                        <TableCell>{new Date(inv.submittedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</TableCell>
                                        <TableCell>{new Date(inv.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</TableCell>
                                        <TableCell><StatusPill status={inv.status.toLowerCase().replace(/_/g, "-")} /></TableCell>
                                        <TableCell>{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>

            {/* ═══════════════════════════════════════════
                SECTION 5: NCR SUMMARY
            ═══════════════════════════════════════════ */}
            <div id="ncrs" ref={el => { sectionRefs.current["ncrs"] = el; }} className="scroll-mt-20 space-y-5">
                <SectionHeader
                    icon={ShieldWarning} iconBg="bg-red-100 dark:bg-red-500/20" iconColor="text-red-600 dark:text-red-400"
                    title="NCR Summary" subtitle={`${filteredNCRs.length} non-conformance reports`}
                    badge={kpis.ncrsAssigned > 0 ? { label: `${kpis.ncrsAssigned} Open`, variant: "destructive" } : undefined}
                    rightContent={<ViewToggle section="ncrs" current={viewModes.ncrs} onChange={toggleView} />}
                />

                {viewModes.ncrs === "chart" ? (
                    <div className="grid gap-5 lg:grid-cols-2">
                        <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-3">Monthly NCR Trend (6 Months)</p>
                            <NCRStackedBars data={ncrMonthly} />
                        </Card>
                        <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-3">Open NCRs</p>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <StatCard label="Open" value={ncrs.filter(n => n.status === "OPEN").length.toString()} color="red" alert />
                                <StatCard label="Responded" value={ncrs.filter(n => n.status === "SUPPLIER_RESPONDED").length.toString()} color="amber" />
                                <StatCard label="Total" value={ncrs.length.toString()} color="blue" />
                            </div>
                            <div className="space-y-2">
                                {filteredNCRs.map(ncr => (
                                    <div key={ncr.id} className="rounded-xl border border-border/40 p-3 bg-card/50">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold">{ncr.ncrNumber}</span>
                                                <SeverityBadge severity={ncr.severity} />
                                            </div>
                                            <StatusPill status={ncr.status.toLowerCase().replace(/_/g, "-")} />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">{ncr.title}</p>
                                        <div className="flex items-center gap-3 mt-1.5 text-[9px] text-muted-foreground">
                                            <span>Reported: {new Date(ncr.reportedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                                            {ncr.slaDueAt && <span className="text-amber-600 font-semibold">SLA: {new Date(ncr.slaDueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>}
                                        </div>
                                    </div>
                                ))}
                                {filteredNCRs.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No NCRs matching filters</p>}
                            </div>
                        </Card>
                    </div>
                ) : (
                    <Card className="rounded-2xl border-border/60 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="text-[10px] font-bold uppercase">NCR #</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Title</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Severity</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Reported</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">SLA Due</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredNCRs.map(ncr => (
                                    <TableRow key={ncr.id} className="text-xs hover:bg-muted/20">
                                        <TableCell className="font-semibold">{ncr.ncrNumber}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">{ncr.title}</TableCell>
                                        <TableCell><SeverityBadge severity={ncr.severity} /></TableCell>
                                        <TableCell><StatusPill status={ncr.status.toLowerCase().replace(/_/g, "-")} /></TableCell>
                                        <TableCell>{new Date(ncr.reportedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</TableCell>
                                        <TableCell>{ncr.slaDueAt ? new Date(ncr.slaDueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>

            {/* ═══════════════════════════════════════════
                SECTION 6: MILESTONES
            ═══════════════════════════════════════════ */}
            <div id="milestones" ref={el => { sectionRefs.current["milestones"] = el; }} className="scroll-mt-20 space-y-5">
                <SectionHeader
                    icon={Target} iconBg="bg-amber-100 dark:bg-amber-500/20" iconColor="text-amber-600 dark:text-amber-400"
                    title="Milestones" subtitle={`${filteredMilestones.length} milestones tracked`}
                    badge={kpis.milestonesPendingApproval > 0 ? { label: `${kpis.milestonesPendingApproval} Pending`, variant: "outline" } : undefined}
                    rightContent={<ViewToggle section="milestones" current={viewModes.milestones} onChange={toggleView} />}
                />

                {viewModes.milestones === "chart" ? (
                    <Card className="rounded-2xl border-border/60 bg-card p-5">
                        <div className="space-y-3">
                            {filteredMilestones.map(m => {
                                const progress = m.status === "COMPLETED" ? 100 : m.status === "SUBMITTED" ? 75 : 0;
                                const isOverdue = m.status === "PENDING" && new Date(m.expectedDate) < new Date();
                                return (
                                    <div key={m.id} className="rounded-xl border border-border/40 p-4 bg-card/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold">{m.title}</span>
                                                <StatusPill status={isOverdue ? "overdue" : m.status.toLowerCase()} />
                                            </div>
                                            <span className="text-xs font-mono">{fmt(m.amount)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-500",
                                                        m.status === "COMPLETED" ? "bg-emerald-500" : m.status === "SUBMITTED" ? "bg-blue-500" : isOverdue ? "bg-red-500" : "bg-amber-500"
                                                    )}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground w-8 text-right">{progress}%</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span>{m.poNumber} · {m.paymentPercentage}% payment</span>
                                            <span>Due: {new Date(m.expectedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                ) : (
                    <Card className="rounded-2xl border-border/60 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="text-[10px] font-bold uppercase">Milestone</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">PO</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Amount</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Payment %</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Due Date</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMilestones.map(m => (
                                    <TableRow key={m.id} className="text-xs hover:bg-muted/20">
                                        <TableCell className="font-semibold max-w-[200px] truncate">{m.title}</TableCell>
                                        <TableCell>{m.poNumber}</TableCell>
                                        <TableCell className="font-mono">{fmt(m.amount)}</TableCell>
                                        <TableCell>{m.paymentPercentage}%</TableCell>
                                        <TableCell>{new Date(m.expectedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</TableCell>
                                        <TableCell><StatusPill status={m.status.toLowerCase()} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>

            {/* ═══════════════════════════════════════════
                SECTION 7: COMPLIANCE & DOCUMENTS
            ═══════════════════════════════════════════ */}
            <div id="compliance" ref={el => { sectionRefs.current["compliance"] = el; }} className="scroll-mt-20 space-y-5">
                <SectionHeader
                    icon={ShieldCheck} iconBg="bg-emerald-100 dark:bg-emerald-500/20" iconColor="text-emerald-600 dark:text-emerald-400"
                    title="Compliance & Documents" subtitle={`${documents.length} documents tracked`}
                    rightContent={<ViewToggle section="compliance" current={viewModes.compliance} onChange={toggleView} />}
                />

                {viewModes.compliance === "chart" ? (
                    <div className="grid gap-5 lg:grid-cols-2">
                        <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-3">Compliance Score</p>
                            <ComplianceGauge data={compliance} />
                        </Card>
                        <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-3">Document Status</p>
                            <DocumentGrid documents={documents} />
                        </Card>
                    </div>
                ) : (
                    <Card className="rounded-2xl border-border/60 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="text-[10px] font-bold uppercase">Document</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Expiry</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase">Uploaded</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documents.map(doc => (
                                    <TableRow key={doc.id} className="text-xs hover:bg-muted/20">
                                        <TableCell className="font-semibold">{doc.type}</TableCell>
                                        <TableCell><StatusPill status={doc.status} /></TableCell>
                                        <TableCell>{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</TableCell>
                                        <TableCell>{doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>
        </div>
    );
}

// ============================================
// HELPER COMPONENTS
// ============================================
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

function KPICard({ label, value, icon: Icon, color, subtitle, alert }: {
    label: string; value: string; icon: React.ElementType; color: "blue" | "emerald" | "amber" | "violet" | "red"; subtitle?: string; alert?: boolean;
}) {
    const fg = {
        blue: "text-blue-600 dark:text-blue-400",
        emerald: "text-emerald-600 dark:text-emerald-400",
        amber: "text-amber-600 dark:text-amber-400",
        violet: "text-violet-600 dark:text-violet-400",
        red: "text-red-600 dark:text-red-400",
    }[color];
    return (
        <div className={cn("rounded-2xl border border-border/60 bg-card p-4", alert && "border-red-200/80 dark:border-red-800/40")}>
            <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("w-4 h-4", fg)} weight="duotone" />
                <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-xl font-bold font-mono tabular-nums">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
    );
}

function StatCard({ label, value, color, alert }: { label: string; value: string; color: "blue" | "emerald" | "amber" | "violet" | "red"; alert?: boolean }) {
    const palette = {
        blue: "text-blue-600 dark:text-blue-400",
        emerald: "text-emerald-600 dark:text-emerald-400",
        amber: "text-amber-600 dark:text-amber-400",
        violet: "text-violet-600 dark:text-violet-400",
        red: "text-red-600 dark:text-red-400",
    }[color];
    return (
        <div className={cn("rounded-xl border border-border/40 p-3 text-center bg-card/50", alert && "border-red-200/80 dark:border-red-800/40")}>
            <p className={cn("text-lg font-bold font-mono tabular-nums", palette)}>{value}</p>
            <p className="text-[9px] text-muted-foreground font-medium">{label}</p>
        </div>
    );
}

function ViewToggle({ section, current, onChange }: { section: string; current: "chart" | "table"; onChange: (section: string, mode: "chart" | "table") => void }) {
    return (
        <div className="flex items-center rounded-xl border border-border/60 bg-muted/30 p-0.5">
            <button onClick={() => onChange(section, "chart")}
                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200",
                    current === "chart" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                <ChartBar className="w-3.5 h-3.5" weight="duotone" />Charts
            </button>
            <button onClick={() => onChange(section, "table")}
                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200",
                    current === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                <Rows className="w-3.5 h-3.5" weight="duotone" />Table
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
        "completed": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "accepted": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "approved": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "paid": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "valid": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "passed": "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        "in-progress": "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300",
        "submitted": "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300",
        "pending-response": "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
        "pending-approval": "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
        "pending": "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
        "expiring": "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
        "supplier-responded": "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300",
        "open": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "delayed": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "overdue": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "missing": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "expired": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "rejected": "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
        "draft": "bg-slate-100 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300",
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

function SeverityBadge({ severity }: { severity: string }) {
    const styles: Record<string, string> = {
        CRITICAL: "bg-red-600 text-white",
        MAJOR: "bg-amber-500 text-white",
        MINOR: "bg-blue-500 text-white",
    };
    return (
        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase", styles[severity] || "bg-muted text-muted-foreground")}>
            {severity}
        </span>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-8 pt-8">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-64 rounded-2xl" />
                <div className="flex gap-2"><Skeleton className="h-9 w-32 rounded-xl" /><Skeleton className="h-9 w-28 rounded-xl" /></div>
            </div>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                <Skeleton className="h-80 rounded-2xl" />
                <Skeleton className="h-80 rounded-2xl" />
            </div>
            <Skeleton className="h-64 rounded-2xl" />
        </div>
    );
}
