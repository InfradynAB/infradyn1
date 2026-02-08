"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChartPie,
  ListChecks,
  Truck,
  CurrencyDollar,
  WarningOctagon,
  MagnifyingGlass,
  FunnelSimple,
  Export,
  ChartBar,
  Table as TableIcon,
  CalendarCheck,
  GitFork,
} from "@phosphor-icons/react";
import {
  POProgressCircle,
  BOQBreakdownTable,
  DeliveryStatusTimeline,
  FinancialFlowChart,
  NCRStatusBars,
} from "./charts";
import type { POProgressData } from "./charts";
import type { BOQTableRow } from "./charts";
import type { DeliveryTimelineRow, DeliveryEvent } from "./charts";
import type { FinancialFlowData } from "./charts";
import type { NCRSeverityData } from "./charts";

/* ── Types ─────────────────────────────────────────── */

interface POKPIs {
  poProgress: number;
  deliveredValue: number;
  pendingValue: number;
  totalValue: number;
  paidValue: number;
  invoicedValue: number;
  approvedValue: number;
  pendingMilestones: number;
  totalMilestones: number;
  upcomingDeliveries: number;
  linkedNCRs: number;
  linkedCOs: number;
  inspectionSuccessRate: number;
  retentionHeld: number;
}

interface ShipmentItem {
  id: string;
  trackingNumber: string;
  boqDescription: string;
  status: string;
  dispatchDate: string | null;
  eta: string | null;
  deliveredDate: string | null;
  inspectedDate: string | null;
  provider: string;
  quantity: number;
  unit: string;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  milestoneTitle: string | null;
}

interface MilestoneItem {
  id: string;
  title: string;
  status: string;
  expectedDate: string | null;
  paymentPercentage: number;
  amount: number;
}

interface NCRItem {
  id: string;
  ncrNumber: string;
  title: string;
  severity: string;
  status: string;
  issueType: string;
  reportedAt: string | null;
  closedAt: string | null;
}

interface ChangeOrderItem {
  id: string;
  changeNumber: string;
  reason: string;
  amountDelta: number;
  status: string;
  type: string;
  category: string;
  requestedAt: string | null;
  approvedAt: string | null;
}

/* ── Sections ──────────────────────────────────────── */

const SECTIONS = [
  { id: "overview", label: "Overview", icon: ChartPie },
  { id: "boq", label: "BOQ Breakdown", icon: ListChecks },
  { id: "deliveries", label: "Deliveries", icon: Truck },
  { id: "financials", label: "Financial Flow", icon: CurrencyDollar },
  { id: "milestones", label: "Milestones", icon: CalendarCheck },
  { id: "ncrs", label: "NCRs", icon: WarningOctagon },
  { id: "change-orders", label: "Change Orders", icon: GitFork },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/* ── Mock Data ─────────────────────────────────────── */

function mockKPIs(): POKPIs {
  return {
    poProgress: 62,
    deliveredValue: 186000,
    pendingValue: 114000,
    totalValue: 300000,
    paidValue: 142000,
    invoicedValue: 168000,
    approvedValue: 155000,
    pendingMilestones: 3,
    totalMilestones: 6,
    upcomingDeliveries: 4,
    linkedNCRs: 2,
    linkedCOs: 1,
    inspectionSuccessRate: 88,
    retentionHeld: 15000,
  };
}

function mockBOQItems(): BOQTableRow[] {
  return [
    { id: "1", itemNumber: "1.01", description: "Reinforced Steel Bars Grade 60", unit: "TON", orderedQty: 50, deliveredQty: 35, installedQty: 28, certifiedQty: 25, unitPrice: 2400, totalValue: 120000, isCritical: true, status: "partial" },
    { id: "2", itemNumber: "1.02", description: "Concrete Mix C40", unit: "M3", orderedQty: 200, deliveredQty: 200, installedQty: 180, certifiedQty: 180, unitPrice: 350, totalValue: 70000, isCritical: false, status: "complete" },
    { id: "3", itemNumber: "2.01", description: "HDPE Pipes 400mm", unit: "LM", orderedQty: 1000, deliveredQty: 600, installedQty: 450, certifiedQty: 400, unitPrice: 45, totalValue: 45000, isCritical: false, status: "partial" },
    { id: "4", itemNumber: "2.02", description: "Gate Valves DN300", unit: "PC", orderedQty: 12, deliveredQty: 0, installedQty: 0, certifiedQty: 0, unitPrice: 2800, totalValue: 33600, isCritical: true, status: "overdue" },
    { id: "5", itemNumber: "3.01", description: "Electrical Cables XLPE 3x185", unit: "LM", orderedQty: 500, deliveredQty: 500, installedQty: 500, certifiedQty: 500, unitPrice: 63, totalValue: 31500, isCritical: false, status: "complete" },
  ];
}

function mockShipments(): ShipmentItem[] {
  return [
    { id: "s1", trackingNumber: "DHL-89123", boqDescription: "Reinforced Steel Bars", status: "DELIVERED", dispatchDate: "2026-01-05", eta: "2026-01-15", deliveredDate: "2026-01-14", inspectedDate: "2026-01-16", provider: "DHL_EXPRESS", quantity: 20, unit: "TON" },
    { id: "s2", trackingNumber: "MSK-44521", boqDescription: "Reinforced Steel Bars (Batch 2)", status: "IN_TRANSIT", dispatchDate: "2026-01-28", eta: "2026-02-12", deliveredDate: null, inspectedDate: null, provider: "MAERSK", quantity: 15, unit: "TON" },
    { id: "s3", trackingNumber: "DHL-91002", boqDescription: "HDPE Pipes 400mm", status: "DELIVERED", dispatchDate: "2025-12-10", eta: "2025-12-20", deliveredDate: "2025-12-22", inspectedDate: "2025-12-24", provider: "DHL_FREIGHT", quantity: 600, unit: "LM" },
    { id: "s4", trackingNumber: "—", boqDescription: "Gate Valves DN300", status: "PENDING", dispatchDate: null, eta: null, deliveredDate: null, inspectedDate: null, provider: "OTHER", quantity: 12, unit: "PC" },
  ];
}

function mockInvoices(): InvoiceItem[] {
  return [
    { id: "i1", invoiceNumber: "INV-2026-001", amount: 72000, status: "PAID", submittedAt: "2026-01-20", approvedAt: "2026-01-25", paidAt: "2026-02-01", milestoneTitle: "Material Delivery 50%" },
    { id: "i2", invoiceNumber: "INV-2026-002", amount: 70000, status: "PAID", submittedAt: "2026-01-22", approvedAt: "2026-01-28", paidAt: "2026-02-03", milestoneTitle: "Concrete Delivery" },
    { id: "i3", invoiceNumber: "INV-2026-003", amount: 26000, status: "PENDING_APPROVAL", submittedAt: "2026-02-05", approvedAt: null, paidAt: null, milestoneTitle: "Pipe Delivery Phase 1" },
  ];
}

function mockMilestones(): MilestoneItem[] {
  return [
    { id: "m1", title: "Advance Payment", status: "COMPLETED", expectedDate: "2025-12-01", paymentPercentage: 10, amount: 30000 },
    { id: "m2", title: "Material Delivery 50%", status: "COMPLETED", expectedDate: "2026-01-15", paymentPercentage: 25, amount: 75000 },
    { id: "m3", title: "Concrete Delivery", status: "COMPLETED", expectedDate: "2026-01-25", paymentPercentage: 20, amount: 60000 },
    { id: "m4", title: "Pipe Delivery Phase 1", status: "SUBMITTED", expectedDate: "2026-02-10", paymentPercentage: 15, amount: 45000 },
    { id: "m5", title: "Full Installation", status: "PENDING", expectedDate: "2026-03-15", paymentPercentage: 20, amount: 60000 },
    { id: "m6", title: "Final Certification", status: "PENDING", expectedDate: "2026-04-01", paymentPercentage: 10, amount: 30000 },
  ];
}

function mockNCRs(): NCRItem[] {
  return [
    { id: "n1", ncrNumber: "NCR-0012", title: "Surface corrosion on steel batch", severity: "MAJOR", status: "OPEN", issueType: "QUALITY_DEFECT", reportedAt: "2026-01-18", closedAt: null },
    { id: "n2", ncrNumber: "NCR-0015", title: "Missing test certificates for concrete", severity: "MINOR", status: "CLOSED", issueType: "DOC_MISSING", reportedAt: "2026-01-24", closedAt: "2026-01-30" },
  ];
}

function mockChangeOrders(): ChangeOrderItem[] {
  return [
    { id: "co1", changeNumber: "CO-001", reason: "Client instruction: additional 200m HDPE", amountDelta: 9000, status: "APPROVED", type: "ADDITION", category: "QUANTITY", requestedAt: "2026-01-10", approvedAt: "2026-01-15" },
  ];
}

/* ── Helpers ────────────────────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

function shipmentToTimelineRow(s: ShipmentItem): DeliveryTimelineRow {
  const events: DeliveryEvent[] = [
    {
      id: `${s.id}-dispatch`,
      label: "Dispatched",
      date: s.dispatchDate,
      status: s.dispatchDate ? "completed" : s.status === "PENDING" ? "pending" : "pending",
    },
    {
      id: `${s.id}-transit`,
      label: "In Transit",
      date: s.eta,
      status:
        s.status === "IN_TRANSIT"
          ? "in-progress"
          : s.deliveredDate
          ? "completed"
          : s.dispatchDate
          ? "pending"
          : "pending",
    },
    {
      id: `${s.id}-delivered`,
      label: "Delivered",
      date: s.deliveredDate,
      status:
        s.deliveredDate
          ? "completed"
          : s.status === "FAILED" || s.status === "EXCEPTION"
          ? "delayed"
          : "pending",
    },
    {
      id: `${s.id}-inspected`,
      label: "Inspected",
      date: s.inspectedDate,
      status: s.inspectedDate ? "completed" : "pending",
    },
  ];
  return {
    shipmentId: s.id,
    trackingNumber: s.trackingNumber,
    boqDescription: s.boqDescription,
    events,
  };
}

/* ── Component ─────────────────────────────────────── */

export function PODashboardClient({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  poId,
  poNumber,
  poStatus,
  supplierName,
  projectName,
}: {
  poId: string;
  poNumber?: string;
  poStatus?: string;
  supplierName?: string;
  projectName?: string;
}) {
  /* State */

  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("all");
  const [boqStatusFilter, setBoqStatusFilter] = useState("all");
  const [ncrSeverityFilter, setNcrSeverityFilter] = useState("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [milestoneStatusFilter, setMilestoneStatusFilter] = useState("all");
  const [coStatusFilter, setCOStatusFilter] = useState("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewModes, setViewModes] = useState<Record<SectionId, "chart" | "table">>({
    overview: "chart",
    boq: "table",
    deliveries: "chart",
    financials: "chart",
    milestones: "table",
    ncrs: "chart",
    "change-orders": "table",
  });
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  /* Data — replace with API later */
  const kpis = mockKPIs();
  const boqItems = mockBOQItems();
  const shipments = mockShipments();
  const invoices = mockInvoices();
  const milestones = mockMilestones();
  const ncrs = mockNCRs();
  const changeOrders = mockChangeOrders();

  /* Filtered data */
  const filteredBOQ = useMemo(() => {
    let result = boqItems;
    if (boqStatusFilter !== "all") result = result.filter((i) => i.status === boqStatusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.description.toLowerCase().includes(q) ||
          i.itemNumber.toLowerCase().includes(q)
      );
    }
    return result;
  }, [boqItems, boqStatusFilter, searchQuery]);

  const filteredShipments = useMemo(() => {
    let result = shipments;
    if (deliveryStatusFilter !== "all")
      result = result.filter((s) => s.status === deliveryStatusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.boqDescription.toLowerCase().includes(q) ||
          s.trackingNumber.toLowerCase().includes(q)
      );
    }
    return result;
  }, [shipments, deliveryStatusFilter, searchQuery]);

  const filteredInvoices = useMemo(() => {
    let result = invoices;
    if (invoiceStatusFilter !== "all")
      result = result.filter((i) => i.status === invoiceStatusFilter);
    return result;
  }, [invoices, invoiceStatusFilter]);

  const filteredMilestones = useMemo(() => {
    let result = milestones;
    if (milestoneStatusFilter !== "all")
      result = result.filter((m) => m.status === milestoneStatusFilter);
    return result;
  }, [milestones, milestoneStatusFilter]);

  const filteredNCRs = useMemo(() => {
    let result = ncrs;
    if (ncrSeverityFilter !== "all")
      result = result.filter((n) => n.severity === ncrSeverityFilter);
    return result;
  }, [ncrs, ncrSeverityFilter]);

  const filteredCOs = useMemo(() => {
    let result = changeOrders;
    if (coStatusFilter !== "all")
      result = result.filter((c) => c.status === coStatusFilter);
    return result;
  }, [changeOrders, coStatusFilter]);

  /* Derived chart data */
  const progressData: POProgressData = useMemo(
    () => ({
      deliveredValue: kpis.deliveredValue,
      pendingValue: kpis.pendingValue,
      invoicedValue: kpis.invoicedValue,
      paidValue: kpis.paidValue,
      totalValue: kpis.totalValue,
      progressPercent: kpis.poProgress,
    }),
    [kpis]
  );

  const financialFlowData: FinancialFlowData = useMemo(
    () => ({
      poValue: kpis.totalValue,
      deliveredValue: kpis.deliveredValue,
      invoicedValue: kpis.invoicedValue,
      approvedValue: kpis.approvedValue,
      paidValue: kpis.paidValue,
      retentionHeld: kpis.retentionHeld,
    }),
    [kpis]
  );

  const ncrSeverityData: NCRSeverityData[] = useMemo(() => {
    const map: Record<string, NCRSeverityData> = {
      Minor: { severity: "Minor", open: 0, inProgress: 0, closed: 0 },
      Major: { severity: "Major", open: 0, inProgress: 0, closed: 0 },
      Critical: { severity: "Critical", open: 0, inProgress: 0, closed: 0 },
    };
    ncrs.forEach((n) => {
      const sev = n.severity === "MINOR" ? "Minor" : n.severity === "MAJOR" ? "Major" : "Critical";
      if (n.status === "CLOSED") map[sev].closed++;
      else if (n.status === "OPEN") map[sev].open++;
      else map[sev].inProgress++;
    });
    return Object.values(map).filter((d) => d.open + d.inProgress + d.closed > 0);
  }, [ncrs]);

  const deliveryRows: DeliveryTimelineRow[] = useMemo(
    () => filteredShipments.map(shipmentToTimelineRow),
    [filteredShipments]
  );

  /* View toggle helper */
  const toggleView = useCallback(
    (section: SectionId) => {
      setViewModes((prev) => ({
        ...prev,
        [section]: prev[section] === "chart" ? "table" : "chart",
      }));
    },
    []
  );

  /* Scroll-spy */
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
          }
        });
      },
      { threshold: 0.3, rootMargin: "-80px 0px -40% 0px" }
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* Export */
  const handleExport = useCallback((format: "csv" | "xlsx") => {
    console.log(`Exporting PO dashboard as ${format}…`);
  }, []);

  /* Status badge colors */
  const statusVariant = (s: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      COMPLETED: "default",
      PAID: "default",
      APPROVED: "default",
      CLOSED: "default",
      SUBMITTED: "secondary",
      PENDING: "outline",
      PENDING_APPROVAL: "outline",
      OPEN: "destructive",
      REJECTED: "destructive",
      OVERDUE: "destructive",
      IN_TRANSIT: "secondary",
      DELIVERED: "default",
      DISPATCHED: "secondary",
    };
    return map[s] ?? "outline";
  };

  /* ── Render ─────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              PO Analytics
            </h1>
            {poNumber && (
              <Badge variant="outline" className="text-xs font-mono">
                {poNumber}
              </Badge>
            )}
            {poStatus && (
              <Badge variant={statusVariant(poStatus)} className="text-xs">
                {poStatus}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {[projectName, supplierName].filter(Boolean).join(" • ") ||
              "Detailed analytics for this purchase order"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Export className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                Export as XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search BOQ, shipments…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={deliveryStatusFilter} onValueChange={setDeliveryStatusFilter}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Delivery Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deliveries</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={boqStatusFilter} onValueChange={setBoqStatusFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="BOQ Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <FunnelSimple className="h-3.5 w-3.5" />
              {showAdvanced ? "Less filters" : "More filters"}
            </Button>
          </div>

          {showAdvanced && (
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
              <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="Invoice Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Invoices</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={milestoneStatusFilter} onValueChange={setMilestoneStatusFilter}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="Milestone Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Milestones</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ncrSeverityFilter} onValueChange={setNcrSeverityFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="NCR Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="MINOR">Minor</SelectItem>
                  <SelectItem value="MAJOR">Major</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={coStatusFilter} onValueChange={setCOStatusFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="CO Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All COs</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setSearchQuery("");
                  setDeliveryStatusFilter("all");
                  setBoqStatusFilter("all");
                  setInvoiceStatusFilter("all");
                  setMilestoneStatusFilter("all");
                  setNcrSeverityFilter("all");
                  setCOStatusFilter("all");
                }}
              >
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section nav pills ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => {
                setActiveSection(sec.id);
                sectionRefs.current[sec.id]?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* ── KPI Cards ── */}
      <div
        id="overview"
        ref={(el) => { sectionRefs.current["overview"] = el; }}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "PO Progress", value: `${kpis.poProgress}%`, sub: `${fmt(kpis.deliveredValue)} delivered` },
            { label: "Paid", value: fmt(kpis.paidValue), sub: `of ${fmt(kpis.totalValue)}` },
            { label: "Pending Milestones", value: `${kpis.pendingMilestones}/${kpis.totalMilestones}`, sub: "milestones remaining" },
            { label: "Upcoming Deliveries", value: String(kpis.upcomingDeliveries), sub: "next 30 days" },
            { label: "Inspection Rate", value: `${kpis.inspectionSuccessRate}%`, sub: `${kpis.linkedNCRs} NCRs • ${kpis.linkedCOs} COs` },
          ].map((card) => (
            <Card key={card.label} className="bg-card/50">
              <CardContent className="py-4 px-4">
                <div className="text-[11px] text-muted-foreground">{card.label}</div>
                <div className="text-xl font-bold mt-1">{card.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress donut */}
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">PO Progress</CardTitle>
            <ViewToggle section="overview" view={viewModes.overview} onToggle={toggleView} />
          </CardHeader>
          <CardContent>
            {viewModes.overview === "chart" ? (
              <POProgressCircle data={progressData} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {[
                  { label: "Total Value", value: fmtFull(kpis.totalValue) },
                  { label: "Delivered", value: fmtFull(kpis.deliveredValue) },
                  { label: "Pending", value: fmtFull(kpis.pendingValue) },
                  { label: "Invoiced", value: fmtFull(kpis.invoicedValue) },
                  { label: "Approved", value: fmtFull(kpis.approvedValue) },
                  { label: "Paid", value: fmtFull(kpis.paidValue) },
                  { label: "Retention Held", value: fmtFull(kpis.retentionHeld) },
                  { label: "Progress", value: `${kpis.poProgress}%` },
                ].map((r) => (
                  <div key={r.label} className="rounded-lg bg-muted/40 p-3">
                    <div className="text-xs text-muted-foreground">{r.label}</div>
                    <div className="font-semibold">{r.value}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── BOQ Breakdown ── */}
      <div
        id="boq"
        ref={(el) => { sectionRefs.current["boq"] = el; }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              BOQ Breakdown
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {filteredBOQ.length} items
              </span>
            </CardTitle>
            <ViewToggle section="boq" view={viewModes.boq} onToggle={toggleView} />
          </CardHeader>
          <CardContent>
            {viewModes.boq === "table" ? (
              <BOQBreakdownTable items={filteredBOQ} searchQuery={searchQuery} />
            ) : (
              /* Summary cards mode */
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["complete", "partial", "pending", "overdue"].map((status) => {
                  const count = boqItems.filter((i) => i.status === status).length;
                  const val = boqItems
                    .filter((i) => i.status === status)
                    .reduce((s, i) => s + i.totalValue, 0);
                  const color =
                    status === "complete"
                      ? "text-emerald-600"
                      : status === "partial"
                      ? "text-blue-600"
                      : status === "overdue"
                      ? "text-red-600"
                      : "text-muted-foreground";
                  return (
                    <div key={status} className="rounded-xl border p-4 text-center">
                      <div className={`text-2xl font-bold ${color}`}>{count}</div>
                      <div className="text-xs capitalize text-muted-foreground">{status}</div>
                      <div className="text-xs font-medium mt-1">{fmt(val)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Deliveries ── */}
      <div
        id="deliveries"
        ref={(el) => { sectionRefs.current["deliveries"] = el; }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              Delivery Status
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {filteredShipments.length} shipments
              </span>
            </CardTitle>
            <ViewToggle section="deliveries" view={viewModes.deliveries} onToggle={toggleView} />
          </CardHeader>
          <CardContent>
            {viewModes.deliveries === "chart" ? (
              <DeliveryStatusTimeline rows={deliveryRows} />
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px]">
                      <TableHead>Tracking</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dispatched</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Delivered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShipments.map((s) => (
                      <TableRow key={s.id} className="text-xs">
                        <TableCell className="font-mono">{s.trackingNumber}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{s.boqDescription}</TableCell>
                        <TableCell>{s.provider.replace(/_/g, " ")}</TableCell>
                        <TableCell className="tabular-nums">
                          {s.quantity} {s.unit}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(s.status)} className="text-[10px]">
                            {s.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{s.dispatchDate ?? "—"}</TableCell>
                        <TableCell>{s.eta ?? "—"}</TableCell>
                        <TableCell>{s.deliveredDate ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Financial Flow ── */}
      <div
        id="financials"
        ref={(el) => { sectionRefs.current["financials"] = el; }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Financial Flow</CardTitle>
            <ViewToggle section="financials" view={viewModes.financials} onToggle={toggleView} />
          </CardHeader>
          <CardContent>
            {viewModes.financials === "chart" ? (
              <FinancialFlowChart data={financialFlowData} />
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px]">
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Milestone</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv) => (
                      <TableRow key={inv.id} className="text-xs">
                        <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.milestoneTitle ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {fmtFull(inv.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(inv.status)} className="text-[10px]">
                            {inv.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{inv.submittedAt ?? "—"}</TableCell>
                        <TableCell>{inv.approvedAt ?? "—"}</TableCell>
                        <TableCell>{inv.paidAt ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Milestones ── */}
      <div
        id="milestones"
        ref={(el) => { sectionRefs.current["milestones"] = el; }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              Milestones
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {filteredMilestones.length} milestones
              </span>
            </CardTitle>
            <ViewToggle section="milestones" view={viewModes.milestones} onToggle={toggleView} />
          </CardHeader>
          <CardContent>
            {viewModes.milestones === "table" ? (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px]">
                      <TableHead>Title</TableHead>
                      <TableHead>Expected Date</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMilestones.map((m) => (
                      <TableRow key={m.id} className="text-xs">
                        <TableCell className="font-medium">{m.title}</TableCell>
                        <TableCell>
                          {m.expectedDate
                            ? new Date(m.expectedDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {m.paymentPercentage}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {fmtFull(m.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(m.status)} className="text-[10px]">
                            {m.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              /* Progress bars view */
              <div className="space-y-3">
                {filteredMilestones.map((m) => {
                  const pct =
                    m.status === "COMPLETED"
                      ? 100
                      : m.status === "SUBMITTED"
                      ? 75
                      : 0;
                  const barColor =
                    m.status === "COMPLETED"
                      ? "bg-emerald-500"
                      : m.status === "SUBMITTED"
                      ? "bg-blue-500"
                      : "bg-gray-300 dark:bg-gray-600";
                  return (
                    <div key={m.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{m.title}</span>
                        <span className="text-muted-foreground">
                          {fmtFull(m.amount)} ({m.paymentPercentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>
                          {m.expectedDate
                            ? new Date(m.expectedDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })
                            : "—"}
                        </span>
                        <Badge variant={statusVariant(m.status)} className="text-[9px] px-1.5">
                          {m.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── NCRs ── */}
      <div
        id="ncrs"
        ref={(el) => { sectionRefs.current["ncrs"] = el; }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              NCRs
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {filteredNCRs.length} linked
              </span>
            </CardTitle>
            <ViewToggle section="ncrs" view={viewModes.ncrs} onToggle={toggleView} />
          </CardHeader>
          <CardContent>
            {viewModes.ncrs === "chart" ? (
              <NCRStatusBars data={ncrSeverityData} />
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px]">
                      <TableHead>NCR #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Issue Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reported</TableHead>
                      <TableHead>Closed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNCRs.map((n) => (
                      <TableRow key={n.id} className="text-xs">
                        <TableCell className="font-mono">{n.ncrNumber}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{n.title}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              n.severity === "CRITICAL"
                                ? "destructive"
                                : n.severity === "MAJOR"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            {n.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {n.issueType.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(n.status)} className="text-[10px]">
                            {n.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{n.reportedAt ?? "—"}</TableCell>
                        <TableCell>{n.closedAt ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Change Orders ── */}
      <div
        id="change-orders"
        ref={(el) => { sectionRefs.current["change-orders"] = el; }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              Change Orders
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {filteredCOs.length} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCOs.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                No change orders for this PO.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px]">
                      <TableHead>CO #</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount Delta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Approved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCOs.map((co) => (
                      <TableRow key={co.id} className="text-xs">
                        <TableCell className="font-mono">{co.changeNumber}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{co.reason}</TableCell>
                        <TableCell>{co.type}</TableCell>
                        <TableCell>{co.category}</TableCell>
                        <TableCell
                          className={`text-right tabular-nums font-medium ${
                            co.amountDelta >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {co.amountDelta >= 0 ? "+" : ""}
                          {fmtFull(co.amountDelta)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(co.status)} className="text-[10px]">
                            {co.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{co.requestedAt ?? "—"}</TableCell>
                        <TableCell>{co.approvedAt ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── View Toggle Button ─────────────────────────── */

function ViewToggle({
  section,
  view,
  onToggle,
}: {
  section: SectionId;
  view: "chart" | "table";
  onToggle: (section: SectionId) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
      <button
        onClick={() => view !== "chart" && onToggle(section)}
        className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
          view === "chart"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <ChartBar className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => view !== "table" && onToggle(section)}
        className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
          view === "table"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <TableIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
