"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Search,
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { exportTabularData } from "@/lib/export-engine";

// ============================================================================
// Types
// ============================================================================

interface NCRTrendPoint {
  month: string;
  opened: number;
  closed: number;
  critical: number;
}

interface IssueTypeBreakdown {
  issueType: string;
  count: number;
  percentage: number;
}

interface SupplierNCRSummary {
  supplierId: string;
  supplierName: string;
  total: number;
  open: number;
  critical: number;
  avgResolutionDays: number;
}

type SupplierNCRMetric = "open" | "critical" | "total" | "avgResolutionDays";

interface NCRItem {
  id: string;
  ncrNumber: string;
  title: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "REOPENED";
  issueType: string;
  supplierName: string;
  projectName: string;
  poNumber: string;
  createdAt: string;
  slaDueAt: string | null;
  isOverdue: boolean;
  resolutionDays: number | null;
}

interface QualityKPIs {
  totalNCRs: number;
  openNCRs: number;
  criticalOpen: number;
  overdueNCRs: number;
  avgResolutionTime: number;
  escalationRate: number;
  costOfQuality: number;
  closureRate: number;
}

type NcrDatasetKey = "kpis" | "trend" | "issueTypes" | "suppliers" | "register";
type NcrPreset = "default" | "risk" | "timeline" | "operational" | "custom";

// ============================================================================
// Mock Data
// ============================================================================

function mockKPIs(): QualityKPIs {
  return {
    totalNCRs: 42, openNCRs: 14, criticalOpen: 3, overdueNCRs: 5,
    avgResolutionTime: 8.2, escalationRate: 12, costOfQuality: 45000, closureRate: 67,
  };
}

function mockTrend(): NCRTrendPoint[] {
  return [
    { month: "Sep", opened: 5, closed: 3, critical: 1 },
    { month: "Oct", opened: 7, closed: 4, critical: 2 },
    { month: "Nov", opened: 4, closed: 6, critical: 1 },
    { month: "Dec", opened: 6, closed: 5, critical: 0 },
    { month: "Jan", opened: 8, closed: 7, critical: 3 },
    { month: "Feb", opened: 3, closed: 4, critical: 1 },
  ];
}

function mockIssueTypes(): IssueTypeBreakdown[] {
  return [
    { issueType: "Dimensional Defect", count: 12, percentage: 29 },
    { issueType: "Surface Damage", count: 9, percentage: 21 },
    { issueType: "Wrong Specification", count: 7, percentage: 17 },
    { issueType: "Missing Items", count: 6, percentage: 14 },
    { issueType: "Documentation Error", count: 5, percentage: 12 },
    { issueType: "Other", count: 3, percentage: 7 },
  ];
}

function mockSupplierNCRs(): SupplierNCRSummary[] {
  return [
    { supplierId: "s1", supplierName: "RAK Ceramics", total: 7, open: 3, critical: 2, avgResolutionDays: 14 },
    { supplierId: "s2", supplierName: "Emirates Building Systems", total: 5, open: 2, critical: 0, avgResolutionDays: 8 },
    { supplierId: "s3", supplierName: "Al-Futtaim Steel", total: 3, open: 1, critical: 1, avgResolutionDays: 6 },
    { supplierId: "s4", supplierName: "National Paints", total: 4, open: 2, critical: 0, avgResolutionDays: 12 },
  ];
}

function mockNCRList(): NCRItem[] {
  return [
    { id: "n1", ncrNumber: "NCR-001", title: "Steel beam dimensional defect", severity: "CRITICAL", status: "OPEN", issueType: "Dimensional Defect", supplierName: "Al-Futtaim Steel", projectName: "Al Maryah Tower", poNumber: "PO-2025-001", createdAt: "2026-01-28", slaDueAt: "2026-02-04", isOverdue: true, resolutionDays: null },
    { id: "n2", ncrNumber: "NCR-002", title: "Ceramic tiles surface scratches", severity: "MAJOR", status: "IN_PROGRESS", issueType: "Surface Damage", supplierName: "RAK Ceramics", projectName: "Dubai Mall Extension", poNumber: "PO-2025-012", createdAt: "2026-02-01", slaDueAt: "2026-02-10", isOverdue: false, resolutionDays: null },
    { id: "n3", ncrNumber: "NCR-003", title: "Wrong paint specification delivered", severity: "MINOR", status: "CLOSED", issueType: "Wrong Specification", supplierName: "National Paints", projectName: "DIFC Gates", poNumber: "PO-2025-008", createdAt: "2026-01-15", slaDueAt: "2026-01-25", isOverdue: false, resolutionDays: 7 },
    { id: "n4", ncrNumber: "NCR-004", title: "Missing documentation for steel cert", severity: "MAJOR", status: "OPEN", issueType: "Documentation Error", supplierName: "Al-Futtaim Steel", projectName: "Al Maryah Tower", poNumber: "PO-2025-001", createdAt: "2026-02-05", slaDueAt: "2026-02-12", isOverdue: false, resolutionDays: null },
    { id: "n5", ncrNumber: "NCR-005", title: "Short delivery - 15 units missing", severity: "CRITICAL", status: "OPEN", issueType: "Missing Items", supplierName: "RAK Ceramics", projectName: "Dubai Mall Extension", poNumber: "PO-2025-012", createdAt: "2026-02-03", slaDueAt: "2026-02-06", isOverdue: true, resolutionDays: null },
  ];
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  MAJOR: "bg-amber-100 text-amber-700 border-amber-200",
  MINOR: "bg-blue-100 text-blue-700 border-blue-200",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  CLOSED: "bg-emerald-100 text-emerald-700",
  REOPENED: "bg-purple-100 text-purple-700",
};

const PIE_COLORS = ["#6366F1", "#EC4899", "#14B8A6", "#F97316", "#8B5CF6", "#6B7280"];

function prettyLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getNcrPresetColumns(columns: string[], preset: NcrPreset) {
  if (preset === "risk") {
    return columns.filter((col) =>
      ["ncrNumber", "severity", "status", "isOverdue", "critical", "open", "overdueNCRs", "criticalOpen", "supplierName"].includes(col)
    );
  }
  if (preset === "timeline") {
    return columns.filter((col) =>
      ["month", "opened", "closed", "critical", "createdAt", "slaDueAt", "resolutionDays", "avgResolutionDays"].includes(col)
    );
  }
  if (preset === "operational") {
    return columns.filter((col) =>
      ["ncrNumber", "title", "supplierName", "projectName", "poNumber", "status", "issueType", "open", "total", "avgResolutionDays"].includes(col)
    );
  }
  return columns;
}

function formatCell(value: string | number | boolean | null | undefined, column: string) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (column.toLowerCase().includes("rate") || column === "closureRate" || column === "escalationRate") return `${value}%`;
  if (column.toLowerCase().includes("days") && typeof value === "number") return `${value}d`;
  if (column === "costOfQuality" && typeof value === "number") return `$${value.toLocaleString()}`;
  return String(value);
}

// ============================================================================
// Component
// ============================================================================

export function QualityNCRAnalyticsClient() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<QualityKPIs | null>(null);
  const [trend, setTrend] = useState<NCRTrendPoint[]>([]);
  const [issueTypes, setIssueTypes] = useState<IssueTypeBreakdown[]>([]);
  const [supplierNCRs, setSupplierNCRs] = useState<SupplierNCRSummary[]>([]);
  const [ncrList, setNcrList] = useState<NCRItem[]>([]);
  const [supplierNcrView, setSupplierNcrView] = useState<"overview" | "metric">("overview");
  const [supplierNcrMetric, setSupplierNcrMetric] = useState<SupplierNCRMetric>("open");
  const [workspaceMode, setWorkspaceMode] = useState<"analytics" | "table">("analytics");
  const [activeDataset, setActiveDataset] = useState<NcrDatasetKey>("register");
  const [workspacePreset, setWorkspacePreset] = useState<NcrPreset>("default");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [showViewExplanation, setShowViewExplanation] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [savedCustomViews, setSavedCustomViews] = useState<Partial<Record<NcrDatasetKey, string[]>>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem("quality-ncr-custom-views-v1");
      if (!raw) return {};
      return JSON.parse(raw) as Partial<Record<NcrDatasetKey, string[]>>;
    } catch {
      return {};
    }
  });
  const [manualColumns, setManualColumns] = useState<Partial<Record<NcrDatasetKey, string[]>>>({});

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [overdueFilter, setOverdueFilter] = useState("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setKpis(mockKPIs());
      setTrend(mockTrend());
      setIssueTypes(mockIssueTypes());
      setSupplierNCRs(mockSupplierNCRs());
      setNcrList(mockNCRList());
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredNCRs = ncrList.filter((n) => {
    if (searchQuery && !n.ncrNumber.toLowerCase().includes(searchQuery.toLowerCase()) && !n.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (severityFilter !== "all" && n.severity !== severityFilter) return false;
    if (statusFilter !== "all" && n.status !== statusFilter) return false;
    if (supplierFilter !== "all" && n.supplierName !== supplierFilter) return false;
    if (projectFilter !== "all" && n.projectName !== projectFilter) return false;
    if (overdueFilter === "overdue" && !n.isOverdue) return false;
    if (overdueFilter === "ontrack" && n.isOverdue) return false;
    return true;
  });

  const uniqueSuppliers = [...new Set(ncrList.map((n) => n.supplierName))];
  const uniqueProjects = [...new Set(ncrList.map((n) => n.projectName))];

  const supplierMetricLabel: Record<SupplierNCRMetric, string> = {
    open: "Open",
    critical: "Critical",
    total: "Total",
    avgResolutionDays: "Avg Resolution (Days)",
  };

  const datasets = useMemo<Record<NcrDatasetKey, Record<string, string | number | boolean | null>[]>>(() => ({
    kpis: kpis ? [{
      totalNCRs: kpis.totalNCRs,
      openNCRs: kpis.openNCRs,
      criticalOpen: kpis.criticalOpen,
      overdueNCRs: kpis.overdueNCRs,
      avgResolutionTime: kpis.avgResolutionTime,
      escalationRate: kpis.escalationRate,
      costOfQuality: kpis.costOfQuality,
      closureRate: kpis.closureRate,
    }] : [],
    trend: trend.map((row) => ({ month: row.month, opened: row.opened, closed: row.closed, critical: row.critical })),
    issueTypes: issueTypes.map((row) => ({ issueType: row.issueType, count: row.count, percentage: row.percentage })),
    suppliers: supplierNCRs.map((row) => ({
      supplierName: row.supplierName,
      total: row.total,
      open: row.open,
      critical: row.critical,
      avgResolutionDays: row.avgResolutionDays,
    })),
    register: filteredNCRs.map((row) => ({
      ncrNumber: row.ncrNumber,
      title: row.title,
      severity: row.severity,
      status: row.status,
      issueType: row.issueType,
      supplierName: row.supplierName,
      projectName: row.projectName,
      poNumber: row.poNumber,
      createdAt: row.createdAt,
      slaDueAt: row.slaDueAt ?? "—",
      isOverdue: row.isOverdue,
      resolutionDays: row.resolutionDays ?? "—",
    })),
  }), [kpis, trend, issueTypes, supplierNCRs, filteredNCRs]);

  const datasetLabels: Record<NcrDatasetKey, string> = {
    kpis: "KPIs",
    trend: "NCR Trend",
    issueTypes: "Issue Types",
    suppliers: "Supplier NCRs",
    register: "NCR Register",
  };

  const datasetRows = datasets[activeDataset] || [];

  const allColumns = useMemo(() => {
    const keys = new Set<string>();
    datasetRows.forEach((row) => Object.keys(row).forEach((key) => keys.add(key)));
    return Array.from(keys);
  }, [datasetRows]);

  const visibleColumns = useMemo(() => {
    if (workspacePreset === "custom") {
      return manualColumns[activeDataset] || savedCustomViews[activeDataset] || allColumns;
    }
    return getNcrPresetColumns(allColumns, workspacePreset);
  }, [workspacePreset, manualColumns, savedCustomViews, activeDataset, allColumns]);

  const workspaceFilteredRows = useMemo(() => {
    if (!workspaceSearch.trim()) return datasetRows;
    const query = workspaceSearch.toLowerCase();
    return datasetRows.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query))
    );
  }, [datasetRows, workspaceSearch]);

  const totalPages = Math.max(1, Math.ceil(workspaceFilteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => workspaceFilteredRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [workspaceFilteredRows, safePage, pageSize]
  );

  const viewExplanation = useMemo(() => {
    const presetText = workspacePreset === "custom" ? "custom" : `${workspacePreset} preset`;
    const queryText = workspaceSearch.trim() ? ` with search "${workspaceSearch.trim()}"` : " with no search";
    return `You are viewing ${datasetLabels[activeDataset]} in table mode using ${presetText}${queryText}. ${workspaceFilteredRows.length.toLocaleString()} row(s) match across ${visibleColumns.length} visible column(s).`;
  }, [workspacePreset, workspaceSearch, activeDataset, workspaceFilteredRows.length, visibleColumns.length]);

  const applyPreset = (preset: NcrPreset) => {
    setWorkspacePreset(preset);
    if (preset !== "custom") {
      setManualColumns((prev) => ({ ...prev, [activeDataset]: undefined }));
    }
    setPage(1);
  };

  const toggleColumn = (column: string, checked: boolean) => {
    const base = workspacePreset === "custom"
      ? (manualColumns[activeDataset] || savedCustomViews[activeDataset] || allColumns)
      : getNcrPresetColumns(allColumns, workspacePreset);
    const next = checked ? Array.from(new Set([...base, column])) : base.filter((col) => col !== column);
    setWorkspacePreset("custom");
    setManualColumns((prev) => ({ ...prev, [activeDataset]: next }));
  };

  const saveCustomView = () => {
    const currentCols = visibleColumns.length > 0 ? visibleColumns : allColumns;
    const next = { ...savedCustomViews, [activeDataset]: currentCols };
    setSavedCustomViews(next);
    setWorkspacePreset("custom");
    setManualColumns((prev) => ({ ...prev, [activeDataset]: currentCols }));
    try {
      window.localStorage.setItem("quality-ncr-custom-views-v1", JSON.stringify(next));
    } catch {
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    await exportTabularData({
      fileName: `quality-ncr-${activeDataset}-view`,
      title: `${datasetLabels[activeDataset]} Export`,
      format,
      columns: visibleColumns.map((column) => ({ key: column, label: prettyLabel(column) })),
      rows: workspaceFilteredRows,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/analytics"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quality & NCR Analytics</h1>
          <p className="text-muted-foreground text-sm">Non-conformance trends, root cause analysis, and resolution metrics</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
        <Card className="md:col-span-1 lg:col-span-2">
          <CardHeader className="pb-2"><CardDescription>Total NCRs</CardDescription></CardHeader>
          <CardContent><span className="text-2xl font-bold">{kpis?.totalNCRs}</span></CardContent>
        </Card>
        <Card className="md:col-span-1 lg:col-span-2">
          <CardHeader className="pb-2"><CardDescription>Open</CardDescription></CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-amber-600">{kpis?.openNCRs}</span>
            {kpis?.criticalOpen ? <Badge className="ml-2 bg-red-100 text-red-700">{kpis?.criticalOpen} critical</Badge> : null}
          </CardContent>
        </Card>
        <Card className="md:col-span-1 lg:col-span-2">
          <CardHeader className="pb-2"><CardDescription>Overdue</CardDescription></CardHeader>
          <CardContent><span className="text-2xl font-bold text-red-600">{kpis?.overdueNCRs}</span></CardContent>
        </Card>
        <Card className="md:col-span-1 lg:col-span-2">
          <CardHeader className="pb-2"><CardDescription>Avg Resolution</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{kpis?.avgResolutionTime}</span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">NCR Data Workspace</CardTitle>
              <CardDescription>Switch between analytics and fully manipulatable table mode</CardDescription>
            </div>
            <div className="inline-flex items-center rounded-lg border border-border/60 bg-muted/30 p-1">
              <button
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                  workspaceMode === "analytics" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setWorkspaceMode("analytics")}
              >
                Analytics
              </button>
              <button
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                  workspaceMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setWorkspaceMode("table")}
              >
                Table
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {workspaceMode === "analytics" ? (
        <>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* NCR Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />NCR Trends (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="opened" stroke="#EF4444" strokeWidth={2} name="Opened" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="closed" stroke="#22C55E" strokeWidth={2} name="Closed" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="critical" stroke="#F59E0B" strokeWidth={2} name="Critical" strokeDasharray="5 5" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Root Cause - Pareto (Issue Types) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Root Cause Analysis</CardTitle>
            <CardDescription>Pareto breakdown by issue type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={issueTypes} dataKey="count" nameKey="issueType" cx="50%" cy="50%" outerRadius={90} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                      {issueTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex flex-col justify-center">
                {issueTypes.map((it, i) => (
                  <div key={it.issueType} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="flex-1 truncate">{it.issueType}</span>
                    <span className="font-mono font-semibold">{it.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NCR by Supplier */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>NCR by Supplier</CardTitle>
              <CardDescription>
                {supplierNcrView === "overview"
                  ? "Clean ranking by total NCR load"
                  : `${supplierMetricLabel[supplierNcrMetric]} by supplier`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={supplierNcrView === "overview" ? "default" : "outline"}
                onClick={() => setSupplierNcrView("overview")}
              >
                Overview
              </Button>
              <Button
                type="button"
                size="sm"
                variant={supplierNcrView === "metric" ? "default" : "outline"}
                onClick={() => setSupplierNcrView("metric")}
              >
                Metric View
              </Button>
              {supplierNcrView === "metric" && (
                <Select value={supplierNcrMetric} onValueChange={(value) => setSupplierNcrMetric(value as SupplierNCRMetric)}>
                  <SelectTrigger className="w-52 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open NCRs</SelectItem>
                    <SelectItem value="critical">Critical NCRs</SelectItem>
                    <SelectItem value="total">Total NCRs</SelectItem>
                    <SelectItem value="avgResolutionDays">Avg Resolution Days</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierNCRs} layout="vertical" margin={{ left: 140, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="supplierName" tick={{ fontSize: 11 }} width={140} />
                <Tooltip
                  formatter={(value: number) => [
                    supplierNcrView === "metric" && supplierNcrMetric === "avgResolutionDays" ? `${value} days` : value,
                    supplierNcrView === "overview" ? "Total NCRs" : supplierMetricLabel[supplierNcrMetric],
                  ]}
                />
                {supplierNcrView === "overview" ? (
                  <Bar dataKey="total" fill="#6B7280" name="Total" radius={[0, 3, 3, 0]} opacity={0.6} />
                ) : (
                  <Bar
                    dataKey={supplierNcrMetric}
                    fill={supplierNcrMetric === "critical" ? "#EF4444" : supplierNcrMetric === "open" ? "#F59E0B" : supplierNcrMetric === "avgResolutionDays" ? "#6366F1" : "#6B7280"}
                    name={supplierMetricLabel[supplierNcrMetric]}
                    radius={[0, 3, 3, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Resolution Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Closure Rate</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={cn("text-3xl font-bold", kpis!.closureRate >= 70 ? "text-emerald-600" : "text-amber-600")}>
                {kpis?.closureRate}%
              </span>
              {kpis!.closureRate >= 70 ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : <TrendingDown className="h-5 w-5 text-amber-600" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Closed vs total NCRs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Escalation Rate</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <span className="text-3xl font-bold">{kpis?.escalationRate}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">NCRs requiring escalation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Cost of Quality</CardDescription></CardHeader>
          <CardContent>
            <span className="text-3xl font-bold font-mono">${kpis?.costOfQuality.toLocaleString()}</span>
            <p className="text-xs text-muted-foreground mt-1">Estimated rework & replacement cost</p>
          </CardContent>
        </Card>
      </div>

      {/* NCR List with Filters */}
      <Card>
        <CardHeader>
          <CardTitle>NCR Register</CardTitle>
          <CardDescription>All non-conformance reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search NCRs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="MAJOR">Major</SelectItem>
                <SelectItem value="MINOR">Minor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="REOPENED">Reopened</SelectItem>
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {uniqueSuppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {uniqueProjects.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={overdueFilter} onValueChange={setOverdueFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="SLA" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="overdue">Overdue Only</SelectItem>
                <SelectItem value="ontrack">On Track</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>NCR #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNCRs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No NCRs match your filters</TableCell></TableRow>
                ) : (
                  filteredNCRs.map((n) => (
                    <TableRow key={n.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono font-semibold">
                        <Link href={`/dashboard/procurement/ncr/${n.id}`} className="text-primary hover:underline">{n.ncrNumber}</Link>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{n.title}</TableCell>
                      <TableCell><Badge className={cn("border", SEVERITY_COLORS[n.severity])}>{n.severity}</Badge></TableCell>
                      <TableCell><Badge className={STATUS_COLORS[n.status]}>{n.status.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-sm">{n.supplierName}</TableCell>
                      <TableCell className="text-sm">{n.projectName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.createdAt}</TableCell>
                      <TableCell>
                        {n.isOverdue
                          ? <Badge className="bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>
                          : n.status !== "CLOSED"
                            ? <span className="text-xs text-muted-foreground">{n.slaDueAt || "—"}</span>
                            : <span className="text-xs text-emerald-600">{n.resolutionDays}d</span>
                        }
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

        </>
      ) : (
        <Card>
          <CardHeader className="pb-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(datasetLabels) as NcrDatasetKey[]).map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant={activeDataset === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveDataset(key);
                    setWorkspaceSearch("");
                    setPage(1);
                  }}
                >
                  {datasetLabels[key]}
                  <Badge variant="secondary" className="ml-2 text-[10px]">{datasets[key].length}</Badge>
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["default", "risk", "timeline", "operational", "custom"] as NcrPreset[]).map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant={workspacePreset === preset ? "default" : "outline"}
                  onClick={() => applyPreset(preset)}
                >
                  {prettyLabel(preset)}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={workspaceSearch}
                  onChange={(e) => {
                    setWorkspaceSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                  placeholder="Search active dataset rows..."
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">Columns ({visibleColumns.length})</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                  <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allColumns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column}
                      checked={visibleColumns.includes(column)}
                      onCheckedChange={(checked) => toggleColumn(column, checked === true)}
                    >
                      {prettyLabel(column)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button type="button" variant="outline" size="sm" onClick={() => setShowViewExplanation((v) => !v)}>
                Explain View
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={saveCustomView}>
                Save Custom View
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => handleExport("csv")}>Export CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("excel")}>Export Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")}>Export PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {showViewExplanation && (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                {viewExplanation}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {visibleColumns.map((column) => (
                      <TableHead key={column} className="whitespace-nowrap">{prettyLabel(column)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={Math.max(visibleColumns.length, 1)} className="text-center py-8 text-muted-foreground">
                        No rows in this dataset match your current view.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedRows.map((row, index) => (
                      <TableRow key={`${activeDataset}-${index}`} className="hover:bg-muted/40">
                        {visibleColumns.map((column) => (
                          <TableCell key={column} className="whitespace-nowrap">{formatCell(row[column], column)}</TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Showing {workspaceFilteredRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
                -{Math.min(safePage * pageSize, workspaceFilteredRows.length)} of {workspaceFilteredRows.length} rows
              </p>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                  <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                <span className="text-xs text-muted-foreground">Page {safePage} / {totalPages}</span>
                <Button type="button" variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
