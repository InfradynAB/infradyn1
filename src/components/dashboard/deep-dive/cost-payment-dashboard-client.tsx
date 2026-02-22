"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Wallet,
  BarChart3,
  GripVertical,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { cn } from "@/lib/utils";
import { exportTabularData } from "@/lib/export-engine";

function reorderCols(arr: string[], from: string, to: string, setter: (val: string[]) => void) {
  const a = [...arr];
  const fi = a.indexOf(from), ti = a.indexOf(to);
  if (fi < 0 || ti < 0 || fi === ti) return;
  [a[fi], a[ti]] = [a[ti], a[fi]];
  setter(a);
}

// ============================================================================
// Types
// ============================================================================

interface FinanceKPIs {
  totalCommitted: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalRetained: number;
  avgPaymentCycleDays: number;
  invoicesPending: number;
  budgetUtilization: number;
  currency: string;
}

interface CashFlowPoint {
  month: string;
  incoming: number;
  outgoing: number;
  cumulative: number;
}

interface InvoiceAgingBucket {
  bucket: string;
  count: number;
  value: number;
}

interface BudgetVarianceRow {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

interface PaymentCycleBySupplier {
  supplierName: string;
  avgDays: number;
  totalInvoices: number;
  onTimePayments: number;
}

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  poNumber: string;
  supplierName: string;
  projectName: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "OVERDUE" | "PARTIALLY_PAID" | "REJECTED";
  submittedDate: string;
  dueDate: string;
  paidDate: string | null;
  daysPending: number;
  currency: string;
}

type CostDatasetKey = "kpis" | "cashFlow" | "aging" | "budget" | "supplierCycle" | "invoices";
type CostPreset = "default" | "finance" | "risk" | "supplier" | "custom";

// ============================================================================
// Mock Data
// ============================================================================

function mockKPIs(): FinanceKPIs {
  return {
    totalCommitted: 4500000, totalPaid: 2800000, totalPending: 950000, totalOverdue: 320000,
    totalRetained: 450000, avgPaymentCycleDays: 28, invoicesPending: 12, budgetUtilization: 62,
    currency: "AED",
  };
}

function mockCashFlow(): CashFlowPoint[] {
  return [
    { month: "Sep", incoming: 800000, outgoing: 650000, cumulative: 150000 },
    { month: "Oct", incoming: 720000, outgoing: 890000, cumulative: -20000 },
    { month: "Nov", incoming: 950000, outgoing: 780000, cumulative: 150000 },
    { month: "Dec", incoming: 600000, outgoing: 720000, cumulative: 30000 },
    { month: "Jan", incoming: 1100000, outgoing: 880000, cumulative: 250000 },
    { month: "Feb", incoming: 500000, outgoing: 410000, cumulative: 340000 },
  ];
}

function mockAgingBuckets(): InvoiceAgingBucket[] {
  return [
    { bucket: "Current (0-30d)", count: 8, value: 620000 },
    { bucket: "31-60 days", count: 3, value: 210000 },
    { bucket: "61-90 days", count: 2, value: 180000 },
    { bucket: "90+ days", count: 1, value: 140000 },
  ];
}

function mockBudgetVariance(): BudgetVarianceRow[] {
  return [
    { category: "Structural Steel", planned: 1200000, actual: 1350000, variance: -150000, variancePercent: -12.5 },
    { category: "MEP Systems", planned: 800000, actual: 720000, variance: 80000, variancePercent: 10.0 },
    { category: "Finishing Materials", planned: 600000, actual: 580000, variance: 20000, variancePercent: 3.3 },
    { category: "Glazing & Facades", planned: 950000, actual: 1100000, variance: -150000, variancePercent: -15.8 },
    { category: "Landscaping", planned: 350000, actual: 300000, variance: 50000, variancePercent: 14.3 },
  ];
}

function mockPaymentCycle(): PaymentCycleBySupplier[] {
  return [
    { supplierName: "Al-Futtaim Steel", avgDays: 22, totalInvoices: 8, onTimePayments: 7 },
    { supplierName: "RAK Ceramics", avgDays: 35, totalInvoices: 5, onTimePayments: 3 },
    { supplierName: "Danube Building Materials", avgDays: 18, totalInvoices: 10, onTimePayments: 9 },
    { supplierName: "Gulf Extrusions", avgDays: 28, totalInvoices: 6, onTimePayments: 5 },
    { supplierName: "National Paints", avgDays: 42, totalInvoices: 4, onTimePayments: 2 },
  ];
}

function mockInvoices(): InvoiceRow[] {
  return [
    { id: "inv1", invoiceNumber: "INV-2026-001", poNumber: "PO-2025-001", supplierName: "Al-Futtaim Steel", projectName: "Al Maryah Tower", amount: 245000, status: "APPROVED", submittedDate: "2026-01-20", dueDate: "2026-02-20", paidDate: null, daysPending: 19, currency: "AED" },
    { id: "inv2", invoiceNumber: "INV-2026-005", poNumber: "PO-2025-012", supplierName: "RAK Ceramics", projectName: "Dubai Mall Extension", amount: 180000, status: "OVERDUE", submittedDate: "2026-01-05", dueDate: "2026-02-01", paidDate: null, daysPending: 34, currency: "AED" },
    { id: "inv3", invoiceNumber: "INV-2026-008", poNumber: "PO-2025-003", supplierName: "Gulf Extrusions", projectName: "Al Maryah Tower", amount: 92000, status: "PAID", submittedDate: "2026-01-15", dueDate: "2026-02-15", paidDate: "2026-02-06", daysPending: 0, currency: "AED" },
    { id: "inv4", invoiceNumber: "INV-2026-012", poNumber: "PO-2025-008", supplierName: "National Paints", projectName: "DIFC Gates", amount: 56000, status: "PENDING", submittedDate: "2026-02-03", dueDate: "2026-03-03", paidDate: null, daysPending: 5, currency: "AED" },
    { id: "inv5", invoiceNumber: "INV-2026-015", poNumber: "PO-2025-005", supplierName: "Emirates Building Systems", projectName: "DIFC Gates", amount: 320000, status: "PARTIALLY_PAID", submittedDate: "2026-01-10", dueDate: "2026-02-10", paidDate: null, daysPending: 29, currency: "AED" },
  ];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-blue-100 text-blue-700",
  APPROVED: "bg-indigo-100 text-indigo-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-red-100 text-red-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  REJECTED: "bg-red-200 text-red-800",
};

function prettyLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCostPresetColumns(columns: string[], preset: CostPreset) {
  if (preset === "finance") {
    return columns.filter((col) =>
      ["invoiceNumber", "poNumber", "amount", "status", "supplierName", "projectName", "dueDate", "currency", "totalCommitted", "totalPaid", "totalPending", "totalOverdue"].includes(col)
    );
  }
  if (preset === "risk") {
    return columns.filter((col) =>
      ["invoiceNumber", "status", "daysPending", "dueDate", "submittedDate", "overdue", "bucket", "criticalOpen", "supplierName", "variancePercent"].includes(col)
    );
  }
  if (preset === "supplier") {
    return columns.filter((col) =>
      ["supplierName", "avgDays", "totalInvoices", "onTimePayments", "projectName", "amount", "status"].includes(col)
    );
  }
  return columns;
}

function formatCell(value: string | number | boolean | null | undefined, column: string, currency?: string) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (column.toLowerCase().includes("amount") || column.startsWith("total") || column === "costOfQuality" || column === "planned" || column === "actual" || column === "variance" || column === "value") {
    if (typeof value === "number") return `${currency ?? "AED"} ${value.toLocaleString()}`;
  }
  if (column.toLowerCase().includes("rate") || column.toLowerCase().includes("percent") || column === "budgetUtilization" || column === "closureRate" || column === "escalationRate") {
    return `${value}%`;
  }
  if (column.toLowerCase().includes("days") && typeof value === "number") return `${value}d`;
  return String(value);
}

// ============================================================================
// Component
// ============================================================================

export function CostPaymentDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<FinanceKPIs | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowPoint[]>([]);
  const [agingBuckets, setAgingBuckets] = useState<InvoiceAgingBucket[]>([]);
  const [budgetVariance, setBudgetVariance] = useState<BudgetVarianceRow[]>([]);
  const [paymentCycle, setPaymentCycle] = useState<PaymentCycleBySupplier[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<"analytics" | "table">("analytics");
  const [activeDataset, setActiveDataset] = useState<CostDatasetKey>("invoices");
  const [workspacePreset, setWorkspacePreset] = useState<CostPreset>("default");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [showViewExplanation, setShowViewExplanation] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [savedCustomViews, setSavedCustomViews] = useState<Partial<Record<CostDatasetKey, string[]>>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem("cost-payment-custom-views-v1");
      if (!raw) return {};
      return JSON.parse(raw) as Partial<Record<CostDatasetKey, string[]>>;
    } catch {
      return {};
    }
  });
  const [manualColumns, setManualColumns] = useState<Partial<Record<CostDatasetKey, string[]>>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setKpis(mockKPIs());
      setCashFlow(mockCashFlow());
      setAgingBuckets(mockAgingBuckets());
      setBudgetVariance(mockBudgetVariance());
      setPaymentCycle(mockPaymentCycle());
      setInvoices(mockInvoices());
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    if (searchQuery && !inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) && !inv.poNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (supplierFilter !== "all" && inv.supplierName !== supplierFilter) return false;
    if (projectFilter !== "all" && inv.projectName !== projectFilter) return false;
    if (overdueOnly && inv.status !== "OVERDUE") return false;
    return true;
  });

  const uniqueSuppliers = [...new Set(invoices.map((i) => i.supplierName))];
  const uniqueProjects = [...new Set(invoices.map((i) => i.projectName))];

  const datasets = useMemo<Record<CostDatasetKey, Record<string, string | number | boolean | null>[]>>(() => ({
    kpis: kpis ? [{
      totalCommitted: kpis.totalCommitted,
      totalPaid: kpis.totalPaid,
      totalPending: kpis.totalPending,
      totalOverdue: kpis.totalOverdue,
      totalRetained: kpis.totalRetained,
      avgPaymentCycleDays: kpis.avgPaymentCycleDays,
      invoicesPending: kpis.invoicesPending,
      budgetUtilization: kpis.budgetUtilization,
      currency: kpis.currency,
    }] : [],
    cashFlow: cashFlow.map((row) => ({ month: row.month, incoming: row.incoming, outgoing: row.outgoing, cumulative: row.cumulative })),
    aging: agingBuckets.map((row) => ({ bucket: row.bucket, count: row.count, value: row.value })),
    budget: budgetVariance.map((row) => ({
      category: row.category,
      planned: row.planned,
      actual: row.actual,
      variance: row.variance,
      variancePercent: row.variancePercent,
    })),
    supplierCycle: paymentCycle.map((row) => ({
      supplierName: row.supplierName,
      avgDays: row.avgDays,
      totalInvoices: row.totalInvoices,
      onTimePayments: row.onTimePayments,
    })),
    invoices: filteredInvoices.map((row) => ({
      invoiceNumber: row.invoiceNumber,
      poNumber: row.poNumber,
      supplierName: row.supplierName,
      projectName: row.projectName,
      amount: row.amount,
      status: row.status,
      submittedDate: row.submittedDate,
      dueDate: row.dueDate,
      paidDate: row.paidDate ?? "—",
      daysPending: row.daysPending,
      currency: row.currency,
    })),
  }), [kpis, cashFlow, agingBuckets, budgetVariance, paymentCycle, filteredInvoices]);

  const datasetLabels: Record<CostDatasetKey, string> = {
    kpis: "KPIs",
    cashFlow: "Cash Flow",
    aging: "Invoice Aging",
    budget: "Budget Variance",
    supplierCycle: "Supplier Cycle",
    invoices: "Invoices",
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
    return getCostPresetColumns(allColumns, workspacePreset);
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

  const applyPreset = (preset: CostPreset) => {
    setWorkspacePreset(preset);
    if (preset !== "custom") {
      setManualColumns((prev) => ({ ...prev, [activeDataset]: undefined }));
    }
    setPage(1);
  };

  const toggleColumn = (column: string, checked: boolean) => {
    const base = workspacePreset === "custom"
      ? (manualColumns[activeDataset] || savedCustomViews[activeDataset] || allColumns)
      : getCostPresetColumns(allColumns, workspacePreset);
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
      window.localStorage.setItem("cost-payment-custom-views-v1", JSON.stringify(next));
    } catch {
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    await exportTabularData({
      fileName: `cost-payment-${activeDataset}-view`,
      title: `${datasetLabels[activeDataset]} Export`,
      format,
      columns: visibleColumns.map((column) => ({ key: column, label: prettyLabel(column) })),
      rows: workspaceFilteredRows,
    });
  };

  // ── Drag-reorder state (hooks must be before early return) ─────────────────────────
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [budCols, setBudCols] = useState<string[]>(["category", "planned", "actual", "variance"]);
  const [invCols, setInvCols] = useState<string[]>(["invoiceNum", "po", "supplier", "project", "amount", "status", "submitted", "due", "days"]);
  const [wsDragCol, setWsDragCol] = useState<string | null>(null);
  const [wsDragOverCol, setWsDragOverCol] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const fmt = (v: number) => `${kpis!.currency} ${v.toLocaleString()}`;
  const fmtAmount = (v: number) => v.toLocaleString();

  // ── Drag DEF maps (after fmt is defined) ──────────────────────────────────────────────
  const reorderWsCol = (from: string, to: string) => {
    const cols = [...visibleColumns];
    const fi = cols.indexOf(from), ti = cols.indexOf(to);
    if (fi < 0 || ti < 0 || fi === ti) return;
    [cols[fi], cols[ti]] = [cols[ti], cols[fi]];
    setWorkspacePreset("custom");
    setManualColumns((prev) => ({ ...prev, [activeDataset]: cols }));
  };

  const BUD_DEF: Record<string, { label: string; hCls?: string; cCls?: string; cell: (r: BudgetVarianceRow) => ReactNode }> = {
    category: { label: "Category", cell: (r) => <span className="font-medium">{r.category}</span> },
    planned: { label: "Planned", hCls: "text-right", cCls: "text-right font-mono", cell: (r) => fmt(r.planned) },
    actual: { label: "Actual", hCls: "text-right", cCls: "text-right font-mono", cell: (r) => fmt(r.actual) },
    variance: { label: "Variance", hCls: "text-right", cCls: "text-right", cell: (r) => (<span className={cn("font-mono font-semibold", r.variance >= 0 ? "text-emerald-600" : "text-red-600")}>{r.variance >= 0 ? "+" : ""}{fmt(r.variance)} ({r.variancePercent > 0 ? "+" : ""}{r.variancePercent}%)</span>) },
  };

  const INV_DEF: Record<string, { label: string; hCls?: string; cCls?: string; cell: (inv: InvoiceRow) => ReactNode }> = {
    invoiceNum: { label: "Invoice #", cell: (inv) => <span className="font-mono font-semibold text-primary">{inv.invoiceNumber}</span> },
    po: { label: "PO", cell: (inv) => <span className="text-sm">{inv.poNumber}</span> },
    supplier: { label: "Supplier", cell: (inv) => <span className="text-sm">{inv.supplierName}</span> },
    project: { label: "Project", cell: (inv) => <span className="text-sm">{inv.projectName}</span> },
    amount: { label: "Amount", hCls: "text-right", cCls: "text-right font-mono font-semibold", cell: (inv) => `${inv.currency} ${inv.amount.toLocaleString()}` },
    status: { label: "Status", cell: (inv) => <Badge className={STATUS_COLORS[inv.status]}>{inv.status.replace("_", " ")}</Badge> },
    submitted: { label: "Submitted", cell: (inv) => <span className="text-sm text-muted-foreground">{inv.submittedDate}</span> },
    due: { label: "Due Date", cell: (inv) => <span className="text-sm">{inv.dueDate}</span> },
    days: { label: "Days", cell: (inv) => inv.paidDate ? <span className="text-emerald-600 text-sm">Paid {inv.paidDate}</span> : <span className={cn("font-mono text-sm", inv.daysPending > 30 ? "text-red-600 font-semibold" : "")}>{inv.daysPending}d</span> },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/analytics"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cost & Payment Dashboard</h1>
          <p className="text-muted-foreground text-sm">Cash flow projections, budget variance, and payment analytics</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-5">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 min-h-[124px] flex flex-col justify-between">
            <CardDescription className="text-sm font-medium">Total Committed</CardDescription>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{kpis!.currency}</p>
              <p className="text-[1.75rem] leading-none font-semibold font-mono tracking-tight">{fmtAmount(kpis!.totalCommitted)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 min-h-[124px] flex flex-col justify-between">
            <CardDescription className="text-sm font-medium">Total Paid</CardDescription>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{kpis!.currency}</p>
              <p className="text-[1.75rem] leading-none font-semibold font-mono tracking-tight text-emerald-600">{fmtAmount(kpis!.totalPaid)}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpis!.budgetUtilization}% utilization</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 min-h-[124px] flex flex-col justify-between">
            <CardDescription className="text-sm font-medium">Pending</CardDescription>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{kpis!.currency}</p>
              <p className="text-[1.75rem] leading-none font-semibold font-mono tracking-tight text-amber-600">{fmtAmount(kpis!.totalPending)}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpis!.invoicesPending} invoices</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 min-h-[124px] flex flex-col justify-between">
            <CardDescription className="text-sm font-medium">Overdue</CardDescription>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{kpis!.currency}</p>
              <p className="text-[1.75rem] leading-none font-semibold font-mono tracking-tight text-red-600">{fmtAmount(kpis!.totalOverdue)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 min-h-[124px] flex flex-col justify-between">
            <CardDescription className="text-sm font-medium">Avg Payment Cycle</CardDescription>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[1.72rem] leading-none font-semibold">{kpis!.avgPaymentCycleDays}</span>
                <span className="text-xs text-muted-foreground">days</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Retained: {kpis!.currency} {fmtAmount(kpis!.totalRetained)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Cost & Payment Data Workspace</CardTitle>
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

      {/* Cash Flow + Invoice Aging */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Cash Flow Projection</CardTitle>
            <CardDescription>Monthly incoming vs outgoing (6 months)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="incoming" stroke="#22C55E" fill="#22C55E" fillOpacity={0.1} name="Incoming" />
                  <Area type="monotone" dataKey="outgoing" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} name="Outgoing" />
                  <Line type="monotone" dataKey="cumulative" stroke="#6366F1" strokeWidth={2} name="Net Position" dot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Invoice Aging</CardTitle>
            <CardDescription>Outstanding invoices by age bucket</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingBuckets}>
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" fill="#6366F1" name="Value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {agingBuckets.map((b) => (
                <div key={b.bucket} className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">{b.bucket.split(" ")[0]}</p>
                  <p className="font-bold">{b.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Variance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Budget Variance Analysis</CardTitle>
          <CardDescription>Planned vs actual spend by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetVariance} margin={{ left: 20 }}>
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="planned" fill="#6366F1" name="Planned" radius={[4, 4, 0, 0]} opacity={0.6} />
                <Bar dataKey="actual" fill="#EC4899" name="Actual" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {budCols.map((col) => (
                    <TableHead
                      key={col}
                      draggable
                      onDragStart={() => setDragCol(col)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                      onDragEnd={() => { if (dragCol && dragOverCol && dragCol !== dragOverCol) reorderCols(budCols, dragCol, dragOverCol, setBudCols); setDragCol(null); setDragOverCol(null); }}
                      className={cn(BUD_DEF[col].hCls, "cursor-grab active:cursor-grabbing select-none", dragCol === col && "opacity-40 bg-muted/60", dragOverCol === col && dragCol !== col && "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]")}
                    >
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                        {BUD_DEF[col].label}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetVariance.map((r) => (
                  <TableRow key={r.category}>
                    {budCols.map((col) => (
                      <TableCell key={col} className={BUD_DEF[col].cCls}>{BUD_DEF[col].cell(r)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Cycle by Supplier */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Cycle by Supplier</CardTitle>
          <CardDescription>Average days to payment and on-time rate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentCycle} layout="vertical" margin={{ left: 160 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: "Avg Days", position: "insideBottom", offset: -5, style: { fontSize: 11 } }} />
                <YAxis type="category" dataKey="supplierName" tick={{ fontSize: 11 }} width={160} />
                <Tooltip />
                <Bar dataKey="avgDays" name="Avg Pay Days" radius={[0, 4, 4, 0]}>
                  {paymentCycle.map((entry, index) => (
                    <rect key={`cell-${index}`} fill={entry.avgDays <= 30 ? "#22C55E" : entry.avgDays <= 45 ? "#F59E0B" : "#EF4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List with Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Register</CardTitle>
          <CardDescription>All invoices across projects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search invoice # or PO..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
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
            <Button variant={overdueOnly ? "default" : "outline"} size="sm" onClick={() => setOverdueOnly(!overdueOnly)}>
              <AlertTriangle className="h-3 w-3 mr-1" />Overdue Only
            </Button>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {invCols.map((col) => (
                    <TableHead
                      key={col}
                      draggable
                      onDragStart={() => setDragCol(col)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                      onDragEnd={() => { if (dragCol && dragOverCol && dragCol !== dragOverCol) reorderCols(invCols, dragCol, dragOverCol, setInvCols); setDragCol(null); setDragOverCol(null); }}
                      className={cn(INV_DEF[col].hCls, "cursor-grab active:cursor-grabbing select-none", dragCol === col && "opacity-40 bg-muted/60", dragOverCol === col && dragCol !== col && "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]")}
                    >
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                        {INV_DEF[col].label}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={invCols.length} className="text-center py-8 text-muted-foreground">No invoices match your filters</TableCell></TableRow>
                ) : (
                  filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-muted/50">
                      {invCols.map((col) => (
                        <TableCell key={col} className={INV_DEF[col].cCls}>{INV_DEF[col].cell(inv)}</TableCell>
                      ))}
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
              {(Object.keys(datasetLabels) as CostDatasetKey[]).map((key) => (
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
              {(["default", "finance", "risk", "supplier", "custom"] as CostPreset[]).map((preset) => (
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
                      <TableHead
                        key={column}
                        draggable
                        onDragStart={() => setWsDragCol(column)}
                        onDragOver={(e) => { e.preventDefault(); setWsDragOverCol(column); }}
                        onDragEnd={() => { if (wsDragCol && wsDragOverCol && wsDragCol !== wsDragOverCol) reorderWsCol(wsDragCol, wsDragOverCol); setWsDragCol(null); setWsDragOverCol(null); }}
                        className={cn("whitespace-nowrap cursor-grab active:cursor-grabbing select-none", wsDragCol === column && "opacity-40 bg-muted/60", wsDragOverCol === column && wsDragCol !== column && "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]")}
                      >
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                          {prettyLabel(column)}
                        </div>
                      </TableHead>
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
                          <TableCell key={column} className="whitespace-nowrap">{formatCell(row[column], column, kpis?.currency)}</TableCell>
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
