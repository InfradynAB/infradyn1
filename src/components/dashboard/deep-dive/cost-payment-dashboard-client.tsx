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
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Wallet,
  BarChart3,
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
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Committed</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="text-xl font-bold font-mono">{fmt(kpis!.totalCommitted)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Paid</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-xl font-bold font-mono text-emerald-600">{fmt(kpis!.totalPaid)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{kpis!.budgetUtilization}% utilization</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Pending</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-amber-500" />
              <span className="text-xl font-bold font-mono text-amber-600">{fmt(kpis!.totalPending)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{kpis!.invoicesPending} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Overdue</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-xl font-bold font-mono text-red-600">{fmt(kpis!.totalOverdue)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Avg Payment Cycle</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-xl font-bold">{kpis!.avgPaymentCycleDays}</span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Retained: {fmt(kpis!.totalRetained)}</p>
          </CardContent>
        </Card>
      </div>

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
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetVariance.map((r) => (
                  <TableRow key={r.category}>
                    <TableCell className="font-medium">{r.category}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.planned)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.actual)}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn("font-mono font-semibold", r.variance >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {r.variance >= 0 ? "+" : ""}{fmt(r.variance)} ({r.variancePercent > 0 ? "+" : ""}{r.variancePercent}%)
                      </span>
                    </TableCell>
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
                  <TableHead>Invoice #</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No invoices match your filters</TableCell></TableRow>
                ) : (
                  filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono font-semibold text-primary">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{inv.poNumber}</TableCell>
                      <TableCell className="text-sm">{inv.supplierName}</TableCell>
                      <TableCell className="text-sm">{inv.projectName}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{inv.currency} {inv.amount.toLocaleString()}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[inv.status]}>{inv.status.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.submittedDate}</TableCell>
                      <TableCell className="text-sm">{inv.dueDate}</TableCell>
                      <TableCell>
                        {inv.paidDate ? (
                          <span className="text-emerald-600 text-sm">Paid {inv.paidDate}</span>
                        ) : (
                          <span className={cn("font-mono text-sm", inv.daysPending > 30 ? "text-red-600 font-semibold" : "")}>{inv.daysPending}d</span>
                        )}
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
