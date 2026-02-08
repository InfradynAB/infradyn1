"use client";

import { useEffect, useState } from "react";
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
        <CardHeader>
          <CardTitle>NCR by Supplier</CardTitle>
          <CardDescription>Supplier quality performance ranking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierNCRs} layout="vertical" margin={{ left: 140 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="supplierName" tick={{ fontSize: 11 }} width={140} />
                <Tooltip />
                <Legend />
                <Bar dataKey="open" fill="#EF4444" name="Open" stackId="stack" radius={[0, 0, 0, 0]} />
                <Bar dataKey="critical" fill="#F59E0B" name="Critical" stackId="stack2" />
                <Bar dataKey="total" fill="#6B7280" name="Total" opacity={0.3} />
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
    </div>
  );
}
