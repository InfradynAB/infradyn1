"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Users,
  AlertTriangle,
  CheckCircle2,
  Search,
  ArrowUpDown,
  BarChart3,
  Eye,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { exportTabularData } from "@/lib/export-engine";

// ============================================================================
// Types
// ============================================================================

interface SupplierScore {
  id: string;
  name: string;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  overallScore: number;
  deliveryPerformance: number;
  qualityScore: number;
  complianceScore: number;
  communicationScore: number;
  totalPOs: number;
  activePOs: number;
  totalNCRs: number;
  openNCRs: number;
  onTimeRate: number;
  avgResponseTime: number; // hours
  trend: "up" | "down" | "stable";
}

// ============================================================================
// Mock Data (ready for API replacement)
// ============================================================================

function mockSupplierScores(): SupplierScore[] {
  return [
    {
      id: "s1", name: "Al-Futtaim Steel", status: "ACTIVE",
      overallScore: 87, deliveryPerformance: 92, qualityScore: 85, complianceScore: 90, communicationScore: 78,
      totalPOs: 12, activePOs: 4, totalNCRs: 3, openNCRs: 1, onTimeRate: 92, avgResponseTime: 4.2, trend: "up",
    },
    {
      id: "s2", name: "Emirates Building Systems", status: "ACTIVE",
      overallScore: 74, deliveryPerformance: 70, qualityScore: 80, complianceScore: 75, communicationScore: 68,
      totalPOs: 8, activePOs: 3, totalNCRs: 5, openNCRs: 2, onTimeRate: 70, avgResponseTime: 12.5, trend: "down",
    },
    {
      id: "s3", name: "Danube Building Materials", status: "ACTIVE",
      overallScore: 91, deliveryPerformance: 95, qualityScore: 88, complianceScore: 92, communicationScore: 90,
      totalPOs: 15, activePOs: 6, totalNCRs: 1, openNCRs: 0, onTimeRate: 95, avgResponseTime: 2.1, trend: "up",
    },
    {
      id: "s4", name: "RAK Ceramics", status: "ACTIVE",
      overallScore: 65, deliveryPerformance: 60, qualityScore: 72, complianceScore: 58, communicationScore: 70,
      totalPOs: 6, activePOs: 2, totalNCRs: 7, openNCRs: 3, onTimeRate: 60, avgResponseTime: 18.0, trend: "down",
    },
    {
      id: "s5", name: "Gulf Extrusions", status: "ACTIVE",
      overallScore: 82, deliveryPerformance: 85, qualityScore: 78, complianceScore: 88, communicationScore: 75,
      totalPOs: 10, activePOs: 3, totalNCRs: 2, openNCRs: 0, onTimeRate: 85, avgResponseTime: 6.0, trend: "stable",
    },
    {
      id: "s6", name: "National Paints", status: "PENDING",
      overallScore: 55, deliveryPerformance: 50, qualityScore: 65, complianceScore: 45, communicationScore: 60,
      totalPOs: 3, activePOs: 1, totalNCRs: 4, openNCRs: 2, onTimeRate: 50, avgResponseTime: 24.0, trend: "down",
    },
  ];
}

// ============================================================================
// Helpers
// ============================================================================

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function getScoreBadge(score: number) {
  if (score >= 80) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Excellent</Badge>;
  if (score >= 60) return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Needs Attention</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200">At Risk</Badge>;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

type SortKey = "overallScore" | "deliveryPerformance" | "qualityScore" | "complianceScore" | "onTimeRate" | "name";
type DistributionMetric = "deliveryPerformance" | "qualityScore" | "complianceScore" | "communicationScore" | "onTimeRate";
type WorkspacePreset = "default" | "performance" | "risk" | "operations" | "custom";

const SUPPLIER_COLUMNS = [
  "supplier",
  "status",
  "overallScore",
  "deliveryPerformance",
  "qualityScore",
  "complianceScore",
  "communicationScore",
  "onTimeRate",
  "avgResponseTime",
  "activePOs",
  "totalPOs",
  "openNCRs",
  "totalNCRs",
  "trend",
] as const;

type SupplierColumn = typeof SUPPLIER_COLUMNS[number];

// ============================================================================
// Component
// ============================================================================

export function SupplierScorecardsClient() {
  const [suppliers, setSuppliers] = useState<SupplierScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [performanceFilter, setPerformanceFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("overallScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierScore | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [distributionView, setDistributionView] = useState<"overall" | "metric">("overall");
  const [distributionMetric, setDistributionMetric] = useState<DistributionMetric>("deliveryPerformance");
  const [workspaceMode, setWorkspaceMode] = useState<"analytics" | "table">("analytics");
  const [workspacePreset, setWorkspacePreset] = useState<WorkspacePreset>("default");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [showViewExplanation, setShowViewExplanation] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [savedCustomColumns, setSavedCustomColumns] = useState<SupplierColumn[]>(() => {
    if (typeof window === "undefined") return [...SUPPLIER_COLUMNS];
    try {
      const raw = window.localStorage.getItem("supplier-scorecards-custom-view-v1");
      if (!raw) return [...SUPPLIER_COLUMNS];
      const parsed = JSON.parse(raw) as SupplierColumn[];
      return parsed.length > 0 ? parsed : [...SUPPLIER_COLUMNS];
    } catch {
      return [...SUPPLIER_COLUMNS];
    }
  });
  const [manualColumns, setManualColumns] = useState<SupplierColumn[] | null>(null);

  useEffect(() => {
    // TODO: Replace with real API call
    const timer = setTimeout(() => {
      setSuppliers(mockSupplierScores());
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }, [sortKey]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }, []);

  // Filtered + sorted list
  const filtered = suppliers
    .filter((s) => {
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (performanceFilter === "excellent" && s.overallScore < 80) return false;
      if (performanceFilter === "attention" && (s.overallScore < 60 || s.overallScore >= 80)) return false;
      if (performanceFilter === "risk" && s.overallScore >= 60) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = sortKey === "name" ? a.name : a[sortKey];
      const bVal = sortKey === "name" ? b.name : b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const comparedSuppliers = suppliers.filter((s) => compareIds.includes(s.id));

  const metricLabels: Record<DistributionMetric, string> = {
    deliveryPerformance: "Delivery",
    qualityScore: "Quality",
    complianceScore: "Compliance",
    communicationScore: "Communication",
    onTimeRate: "On-Time",
  };

  const distributionData = filtered.map((s) => ({
    id: s.id,
    name: s.name.length > 18 ? s.name.slice(0, 18) + "..." : s.name,
    overall: s.overallScore,
    metric: s[distributionMetric],
  }));

  const supplierTableRows = useMemo(
    () => filtered.map((s) => ({
      supplier: s.name,
      status: s.status,
      overallScore: s.overallScore,
      deliveryPerformance: s.deliveryPerformance,
      qualityScore: s.qualityScore,
      complianceScore: s.complianceScore,
      communicationScore: s.communicationScore,
      onTimeRate: s.onTimeRate,
      avgResponseTime: s.avgResponseTime,
      activePOs: s.activePOs,
      totalPOs: s.totalPOs,
      openNCRs: s.openNCRs,
      totalNCRs: s.totalNCRs,
      trend: s.trend,
    })),
    [filtered]
  );

  const visibleColumns = useMemo(() => {
    if (workspacePreset === "custom") {
      return manualColumns ?? savedCustomColumns;
    }
    return getWorkspacePresetColumns(workspacePreset);
  }, [workspacePreset, manualColumns, savedCustomColumns]);

  const workspaceFilteredRows = useMemo(() => {
    if (!workspaceSearch.trim()) return supplierTableRows;
    const query = workspaceSearch.toLowerCase();
    return supplierTableRows.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query))
    );
  }, [supplierTableRows, workspaceSearch]);

  const totalPages = Math.max(1, Math.ceil(workspaceFilteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => workspaceFilteredRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [workspaceFilteredRows, safePage, pageSize]
  );

  const viewExplanation = useMemo(() => {
    const presetText = workspacePreset === "custom" ? "custom" : `${workspacePreset} preset`;
    const queryText = workspaceSearch.trim() ? ` with search "${workspaceSearch.trim()}"` : " with no search";
    return `You are viewing Supplier Scorecards in table mode using ${presetText}${queryText}. ${workspaceFilteredRows.length.toLocaleString()} row(s) and ${visibleColumns.length} visible column(s).`;
  }, [workspacePreset, workspaceSearch, workspaceFilteredRows.length, visibleColumns.length]);

  // KPI summary
  const avgScore = suppliers.length > 0 ? Math.round(suppliers.reduce((s, x) => s + x.overallScore, 0) / suppliers.length) : 0;
  const excellentCount = suppliers.filter((s) => s.overallScore >= 80).length;
  const atRiskCount = suppliers.filter((s) => s.overallScore < 60).length;

  const applyWorkspacePreset = (preset: WorkspacePreset) => {
    setWorkspacePreset(preset);
    if (preset !== "custom") {
      setManualColumns(null);
    } else if (!manualColumns || manualColumns.length === 0) {
      setManualColumns(savedCustomColumns);
    }
    setPage(1);
  };

  const toggleWorkspaceColumn = (column: SupplierColumn, checked: boolean) => {
    const base = workspacePreset === "custom" ? (manualColumns ?? savedCustomColumns) : getWorkspacePresetColumns(workspacePreset);
    const next = checked
      ? Array.from(new Set([...base, column])) as SupplierColumn[]
      : base.filter((col) => col !== column);
    setWorkspacePreset("custom");
    setManualColumns(next);
  };

  const saveCustomView = () => {
    const current = visibleColumns.length > 0 ? visibleColumns : [...SUPPLIER_COLUMNS];
    setSavedCustomColumns(current);
    setWorkspacePreset("custom");
    setManualColumns(current);
    try {
      window.localStorage.setItem("supplier-scorecards-custom-view-v1", JSON.stringify(current));
    } catch {
    }
  };

  const handleWorkspaceExport = async (format: "csv" | "excel" | "pdf") => {
    await exportTabularData({
      fileName: "supplier-scorecards-view",
      title: "Supplier Scorecards Export",
      format,
      columns: visibleColumns.map((col) => ({ key: col, label: prettySupplierLabel(col) })),
      rows: workspaceFilteredRows,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
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
          <h1 className="text-2xl font-bold tracking-tight">Supplier Scorecards</h1>
          <p className="text-muted-foreground text-sm">Performance rankings and comparative analysis</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Suppliers</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{suppliers.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Avg Reliability Score</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <span className={cn("text-2xl font-bold", getScoreColor(avgScore))}>{avgScore}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Excellent Performers</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-2xl font-bold text-emerald-600">{excellentCount}</span>
              <span className="text-sm text-muted-foreground">score &ge; 80</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>At Risk</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{atRiskCount}</span>
              <span className="text-sm text-muted-foreground">score &lt; 60</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Performance" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Performance</SelectItem>
                <SelectItem value="excellent">Excellent (&ge; 80)</SelectItem>
                <SelectItem value="attention">Needs Attention (60-79)</SelectItem>
                <SelectItem value="risk">At Risk (&lt; 60)</SelectItem>
              </SelectContent>
            </Select>
            {compareIds.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setCompareIds([])}>
                Clear Comparison ({compareIds.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Supplier Data Workspace</CardTitle>
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

      {/* Comparison View */}
      {comparedSuppliers.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Supplier Comparison
            </CardTitle>
            <CardDescription>Side-by-side performance across dimensions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={[
                  { category: "Delivery", ...Object.fromEntries(comparedSuppliers.map((s) => [s.name, s.deliveryPerformance])) },
                  { category: "Quality", ...Object.fromEntries(comparedSuppliers.map((s) => [s.name, s.qualityScore])) },
                  { category: "Compliance", ...Object.fromEntries(comparedSuppliers.map((s) => [s.name, s.complianceScore])) },
                  { category: "Communication", ...Object.fromEntries(comparedSuppliers.map((s) => [s.name, s.communicationScore])) },
                  { category: "On-Time %", ...Object.fromEntries(comparedSuppliers.map((s) => [s.name, s.onTimeRate])) },
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {comparedSuppliers.map((s, i) => (
                    <Radar
                      key={s.id}
                      name={s.name}
                      dataKey={s.name}
                      stroke={["#6366F1", "#EC4899", "#14B8A6"][i]}
                      fill={["#6366F1", "#EC4899", "#14B8A6"][i]}
                      fillOpacity={0.15}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Rankings</CardTitle>
          <CardDescription>{filtered.length} supplier{filtered.length !== 1 ? "s" : ""} found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort("name")}>
                      Supplier <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort("overallScore")}>
                      Score <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort("deliveryPerformance")}>
                      Delivery <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort("qualityScore")}>
                      Quality <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort("complianceScore")}>
                      Compliance <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort("onTimeRate")}>
                      On-Time <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>NCRs</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s, idx) => (
                  <TableRow key={s.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.activePOs} active PO{s.activePOs !== 1 ? "s" : ""}</div>
                    </TableCell>
                    <TableCell>
                      <div className={cn("text-lg font-bold", getScoreColor(s.overallScore))}>{s.overallScore}</div>
                      {getScoreBadge(s.overallScore)}
                    </TableCell>
                    <TableCell>
                      <ScoreMiniBar value={s.deliveryPerformance} />
                    </TableCell>
                    <TableCell>
                      <ScoreMiniBar value={s.qualityScore} />
                    </TableCell>
                    <TableCell>
                      <ScoreMiniBar value={s.complianceScore} />
                    </TableCell>
                    <TableCell>
                      <span className={cn("font-mono font-semibold", getScoreColor(s.onTimeRate))}>{s.onTimeRate}%</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono">{s.openNCRs}</span>
                        <span className="text-muted-foreground text-xs">/ {s.totalNCRs}</span>
                      </div>
                    </TableCell>
                    <TableCell><TrendIcon trend={s.trend} /></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 px-3">Action</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => setSelectedSupplier(s)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> Detailed View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleCompare(s.id)}>
                            <BarChart3 className="h-3.5 w-3.5 mr-2" />
                            {compareIds.includes(s.id) ? "Remove from Compare" : "Add to Compare"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Individual Scorecard Detail */}
      <Dialog open={!!selectedSupplier} onOpenChange={(open) => { if (!open) setSelectedSupplier(null); }}>
        <DialogContent className="max-w-6xl">
          {selectedSupplier && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSupplier.name}</DialogTitle>
                <DialogDescription>Detailed performance scorecard</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Category Scores</h3>
                  <ScoreRow label="Delivery Performance" value={selectedSupplier.deliveryPerformance} weight={35} />
                  <ScoreRow label="Quality (NCR Rate)" value={selectedSupplier.qualityScore} weight={30} />
                  <ScoreRow label="Compliance" value={selectedSupplier.complianceScore} weight={20} />
                  <ScoreRow label="Communication" value={selectedSupplier.communicationScore} weight={15} />
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Overall Score</span>
                      <span className={cn("text-2xl font-bold", getScoreColor(selectedSupplier.overallScore))}>
                        {selectedSupplier.overallScore}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={[
                        { category: "Delivery", value: selectedSupplier.deliveryPerformance },
                        { category: "Quality", value: selectedSupplier.qualityScore },
                        { category: "Compliance", value: selectedSupplier.complianceScore },
                        { category: "Communication", value: selectedSupplier.communicationScore },
                        { category: "On-Time", value: selectedSupplier.onTimeRate },
                      ]}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">Total POs</p>
                      <p className="text-lg font-bold">{selectedSupplier.totalPOs}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">Avg Response</p>
                      <p className="text-lg font-bold">{selectedSupplier.avgResponseTime}h</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">Open NCRs</p>
                      <p className="text-lg font-bold">{selectedSupplier.openNCRs}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">On-Time Rate</p>
                      <p className="text-lg font-bold">{selectedSupplier.onTimeRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Performance Distribution Bar Chart */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Performance Distribution</CardTitle>
              <CardDescription>
                {distributionView === "overall"
                  ? "Clean overall ranking by supplier"
                  : `${metricLabels[distributionMetric]} scores by supplier`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={distributionView === "overall" ? "default" : "outline"}
                onClick={() => setDistributionView("overall")}
              >
                Overall
              </Button>
              <Button
                type="button"
                size="sm"
                variant={distributionView === "metric" ? "default" : "outline"}
                onClick={() => setDistributionView("metric")}
              >
                Single Metric
              </Button>
              {distributionView === "metric" && (
                <Select value={distributionMetric} onValueChange={(value) => setDistributionMetric(value as DistributionMetric)}>
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deliveryPerformance">Delivery</SelectItem>
                    <SelectItem value="qualityScore">Quality</SelectItem>
                    <SelectItem value="complianceScore">Compliance</SelectItem>
                    <SelectItem value="communicationScore">Communication</SelectItem>
                    <SelectItem value="onTimeRate">On-Time</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} layout="vertical" margin={{ left: 120, right: 20 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, distributionView === "overall" ? "Overall Score" : metricLabels[distributionMetric]]}
                />
                {distributionView === "overall" ? (
                  <Bar dataKey="overall" radius={[0, 3, 3, 0]}>
                    {distributionData.map((entry) => (
                      <Cell
                        key={entry.id}
                        fill={entry.overall >= 80 ? "#10B981" : entry.overall >= 60 ? "#F59E0B" : "#EF4444"}
                      />
                    ))}
                  </Bar>
                ) : (
                  <Bar dataKey="metric" fill="#3B82F6" radius={[0, 3, 3, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
        </>
      ) : (
        <Card>
          <CardHeader className="pb-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {(["default", "performance", "risk", "operations", "custom"] as WorkspacePreset[]).map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant={workspacePreset === preset ? "default" : "outline"}
                  onClick={() => applyWorkspacePreset(preset)}
                >
                  {prettySupplierLabel(preset)}
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
                  placeholder="Search visible supplier rows..."
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">Columns ({visibleColumns.length})</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                  <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {SUPPLIER_COLUMNS.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column}
                      checked={visibleColumns.includes(column)}
                      onCheckedChange={(checked) => toggleWorkspaceColumn(column, checked === true)}
                    >
                      {prettySupplierLabel(column)}
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
                  <DropdownMenuItem onClick={() => handleWorkspaceExport("csv")}>Export CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleWorkspaceExport("excel")}>Export Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleWorkspaceExport("pdf")}>Export PDF</DropdownMenuItem>
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
                  <TableRow className="bg-muted/40">
                    {visibleColumns.map((column) => (
                      <TableHead key={column} className="whitespace-nowrap">{prettySupplierLabel(column)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={Math.max(visibleColumns.length, 1)} className="py-8 text-center text-sm text-muted-foreground">
                        No rows match your current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedRows.map((row, idx) => (
                      <TableRow key={`${row.supplier}-${idx}`} className="hover:bg-muted/20">
                        {visibleColumns.map((column) => (
                          <TableCell key={column} className="whitespace-nowrap">
                            {formatSupplierCell(column, row[column])}
                          </TableCell>
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
                -{Math.min(safePage * pageSize, workspaceFilteredRows.length)} of {workspaceFilteredRows.length} suppliers
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

function prettySupplierLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getWorkspacePresetColumns(preset: WorkspacePreset): SupplierColumn[] {
  if (preset === "performance") {
    return ["supplier", "overallScore", "deliveryPerformance", "qualityScore", "complianceScore", "communicationScore", "onTimeRate", "trend"];
  }
  if (preset === "risk") {
    return ["supplier", "status", "overallScore", "qualityScore", "complianceScore", "onTimeRate", "openNCRs", "totalNCRs", "trend"];
  }
  if (preset === "operations") {
    return ["supplier", "status", "activePOs", "totalPOs", "deliveryPerformance", "avgResponseTime", "onTimeRate", "openNCRs"];
  }
  return [...SUPPLIER_COLUMNS];
}

function formatSupplierCell(column: SupplierColumn, value: unknown) {
  if (value === null || value === undefined) return "-";
  if (column === "onTimeRate") return `${value}%`;
  if (column === "avgResponseTime") return `${value}h`;
  return String(value);
}

// ============================================================================
// Sub-components
// ============================================================================

function ScoreMiniBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono">{value}</span>
    </div>
  );
}

function ScoreRow({ label, value, weight }: { label: string; value: number; weight: number }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{weight}% weight</span>
          <span className={cn("font-bold", getScoreColor(value))}>{value}</span>
        </div>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
