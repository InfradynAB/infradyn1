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
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  Ship,

} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { exportTabularData } from "@/lib/export-engine";

// ============================================================================
// Types
// ============================================================================

interface LogisticsKPIs {
  activeShipments: number;
  inTransit: number;
  delivered: number;
  delayed: number;
  avgTransitDays: number;
  onTimeRate: number;
  totalCarriers: number;
  pendingInspection: number;
}

interface ShipmentRow {
  id: string;
  trackingNumber: string;
  poNumber: string;
  supplierName: string;
  projectName: string;
  carrier: string;
  status: "PENDING" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED" | "DELAYED" | "CUSTOMS_HOLD";
  origin: string;
  destination: string;
  expectedDate: string;
  actualDate: string | null;
  etaConfidence: "HIGH" | "MEDIUM" | "LOW";
  lastLocation: string | null;
  daysInTransit: number;
  isDelayed: boolean;
}

interface CarrierPerformance {
  carrier: string;
  totalShipments: number;
  onTime: number;
  delayed: number;
  avgTransitDays: number;
  onTimeRate: number;
}

type LogisticsDatasetKey = "kpis" | "carriers" | "pipeline" | "shipments";
type LogisticsPreset = "default" | "delivery" | "risk" | "ops" | "custom";

// ============================================================================
// Mock Data
// ============================================================================

function mockKPIs(): LogisticsKPIs {
  return {
    activeShipments: 24, inTransit: 12, delivered: 8, delayed: 4,
    avgTransitDays: 14.3, onTimeRate: 75, totalCarriers: 5, pendingInspection: 3,
  };
}

function mockShipments(): ShipmentRow[] {
  return [
    { id: "sh1", trackingNumber: "DHL-2026-001", poNumber: "PO-2025-001", supplierName: "Al-Futtaim Steel", projectName: "Al Maryah Tower", carrier: "DHL Express", status: "IN_TRANSIT", origin: "Mumbai, India", destination: "Abu Dhabi, UAE", expectedDate: "2026-02-12", actualDate: null, etaConfidence: "HIGH", lastLocation: "Jebel Ali Port", daysInTransit: 8, isDelayed: false },
    { id: "sh2", trackingNumber: "MSK-2026-042", poNumber: "PO-2025-012", supplierName: "RAK Ceramics", projectName: "Dubai Mall Extension", carrier: "Maersk", status: "DELAYED", origin: "Ras Al Khaimah, UAE", destination: "Dubai, UAE", expectedDate: "2026-02-05", actualDate: null, etaConfidence: "LOW", lastLocation: "RAK Warehouse", daysInTransit: 12, isDelayed: true },
    { id: "sh3", trackingNumber: "DHL-2026-015", poNumber: "PO-2025-008", supplierName: "National Paints", projectName: "DIFC Gates", carrier: "DHL Freight", status: "DELIVERED", origin: "Sharjah, UAE", destination: "Dubai, UAE", expectedDate: "2026-02-01", actualDate: "2026-01-30", etaConfidence: "HIGH", lastLocation: "DIFC Site", daysInTransit: 3, isDelayed: false },
    { id: "sh4", trackingNumber: "FDX-2026-007", poNumber: "PO-2025-003", supplierName: "Gulf Extrusions", projectName: "Al Maryah Tower", carrier: "FedEx", status: "DISPATCHED", origin: "Dubai, UAE", destination: "Abu Dhabi, UAE", expectedDate: "2026-02-15", actualDate: null, etaConfidence: "MEDIUM", lastLocation: "Dubai Warehouse", daysInTransit: 1, isDelayed: false },
    { id: "sh5", trackingNumber: "OTH-2026-003", poNumber: "PO-2025-005", supplierName: "Emirates Building Systems", projectName: "DIFC Gates", carrier: "Local Truck", status: "CUSTOMS_HOLD", origin: "China", destination: "Dubai, UAE", expectedDate: "2026-02-08", actualDate: null, etaConfidence: "LOW", lastLocation: "Jebel Ali Customs", daysInTransit: 20, isDelayed: true },
    { id: "sh6", trackingNumber: "DHL-2026-022", poNumber: "PO-2025-014", supplierName: "Danube Building Materials", projectName: "Al Maryah Tower", carrier: "DHL Express", status: "PENDING", origin: "Abu Dhabi, UAE", destination: "Al Maryah Island", expectedDate: "2026-02-18", actualDate: null, etaConfidence: "HIGH", lastLocation: null, daysInTransit: 0, isDelayed: false },
  ];
}

function mockCarriers(): CarrierPerformance[] {
  return [
    { carrier: "DHL Express", totalShipments: 10, onTime: 9, delayed: 1, avgTransitDays: 8, onTimeRate: 90 },
    { carrier: "DHL Freight", totalShipments: 5, onTime: 4, delayed: 1, avgTransitDays: 12, onTimeRate: 80 },
    { carrier: "Maersk", totalShipments: 4, onTime: 2, delayed: 2, avgTransitDays: 18, onTimeRate: 50 },
    { carrier: "FedEx", totalShipments: 3, onTime: 3, delayed: 0, avgTransitDays: 6, onTimeRate: 100 },
    { carrier: "Local Truck", totalShipments: 2, onTime: 1, delayed: 1, avgTransitDays: 4, onTimeRate: 50 },
  ];
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  PENDING: { color: "bg-slate-100 text-slate-700", icon: <Clock className="h-3 w-3" /> },
  DISPATCHED: { color: "bg-blue-100 text-blue-700", icon: <PackageCheck className="h-3 w-3" /> },
  IN_TRANSIT: { color: "bg-indigo-100 text-indigo-700", icon: <Truck className="h-3 w-3" /> },
  DELIVERED: { color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  DELAYED: { color: "bg-red-100 text-red-700", icon: <AlertTriangle className="h-3 w-3" /> },
  CUSTOMS_HOLD: { color: "bg-amber-100 text-amber-700", icon: <Ship className="h-3 w-3" /> },
};

const ETA_COLORS: Record<string, string> = {
  HIGH: "text-emerald-600",
  MEDIUM: "text-amber-600",
  LOW: "text-red-600",
};

function prettyLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getLogisticsPresetColumns(columns: string[], preset: LogisticsPreset) {
  if (preset === "delivery") {
    return columns.filter((col) =>
      ["trackingNumber", "status", "carrier", "expectedDate", "actualDate", "etaConfidence", "isDelayed", "daysInTransit", "onTimeRate"].includes(col)
    );
  }
  if (preset === "risk") {
    return columns.filter((col) =>
      ["trackingNumber", "status", "isDelayed", "etaConfidence", "daysInTransit", "lastLocation", "expectedDate", "supplierName", "projectName"].includes(col)
    );
  }
  if (preset === "ops") {
    return columns.filter((col) =>
      ["trackingNumber", "poNumber", "supplierName", "carrier", "origin", "destination", "status", "daysInTransit", "expectedDate"].includes(col)
    );
  }
  return columns;
}

function formatCell(value: string | number | boolean | null | undefined, column: string) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (column.toLowerCase().includes("rate") && typeof value === "number") return `${value}%`;
  if (column.toLowerCase().includes("days") && typeof value === "number") return `${value}d`;
  return String(value);
}

// ============================================================================
// Component
// ============================================================================

export function LogisticsTimelinesClient() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<LogisticsKPIs | null>(null);
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [carriers, setCarriers] = useState<CarrierPerformance[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [etaFilter, setEtaFilter] = useState("all");
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<"analytics" | "table">("analytics");
  const [activeDataset, setActiveDataset] = useState<LogisticsDatasetKey>("shipments");
  const [workspacePreset, setWorkspacePreset] = useState<LogisticsPreset>("default");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [showViewExplanation, setShowViewExplanation] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [savedCustomViews, setSavedCustomViews] = useState<Partial<Record<LogisticsDatasetKey, string[]>>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem("logistics-custom-views-v1");
      if (!raw) return {};
      return JSON.parse(raw) as Partial<Record<LogisticsDatasetKey, string[]>>;
    } catch {
      return {};
    }
  });
  const [manualColumns, setManualColumns] = useState<Partial<Record<LogisticsDatasetKey, string[]>>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setKpis(mockKPIs());
      setShipments(mockShipments());
      setCarriers(mockCarriers());
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filtered = shipments.filter((s) => {
    if (searchQuery && !s.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) && !s.poNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (carrierFilter !== "all" && s.carrier !== carrierFilter) return false;
    if (projectFilter !== "all" && s.projectName !== projectFilter) return false;
    if (etaFilter !== "all" && s.etaConfidence !== etaFilter) return false;
    if (delayedOnly && !s.isDelayed) return false;
    return true;
  });

  const uniqueCarriers = [...new Set(shipments.map((s) => s.carrier))];
  const uniqueProjects = [...new Set(shipments.map((s) => s.projectName))];

  const datasets = useMemo<Record<LogisticsDatasetKey, Record<string, string | number | boolean | null>[]>>(() => ({
    kpis: kpis ? [{
      activeShipments: kpis.activeShipments,
      inTransit: kpis.inTransit,
      delivered: kpis.delivered,
      delayed: kpis.delayed,
      avgTransitDays: kpis.avgTransitDays,
      onTimeRate: kpis.onTimeRate,
      totalCarriers: kpis.totalCarriers,
      pendingInspection: kpis.pendingInspection,
    }] : [],
    carriers: carriers.map((row) => ({
      carrier: row.carrier,
      totalShipments: row.totalShipments,
      onTime: row.onTime,
      delayed: row.delayed,
      avgTransitDays: row.avgTransitDays,
      onTimeRate: row.onTimeRate,
    })),
    pipeline: (["PENDING", "DISPATCHED", "IN_TRANSIT", "CUSTOMS_HOLD", "DELIVERED", "DELAYED"] as const).map((status) => ({
      status,
      count: shipments.filter((s) => s.status === status).length,
    })),
    shipments: filtered.map((row) => ({
      trackingNumber: row.trackingNumber,
      poNumber: row.poNumber,
      supplierName: row.supplierName,
      projectName: row.projectName,
      carrier: row.carrier,
      status: row.status,
      origin: row.origin,
      destination: row.destination,
      expectedDate: row.expectedDate,
      actualDate: row.actualDate ?? "—",
      etaConfidence: row.etaConfidence,
      lastLocation: row.lastLocation ?? "—",
      daysInTransit: row.daysInTransit,
      isDelayed: row.isDelayed,
    })),
  }), [kpis, carriers, shipments, filtered]);

  const datasetLabels: Record<LogisticsDatasetKey, string> = {
    kpis: "KPIs",
    carriers: "Carriers",
    pipeline: "Pipeline",
    shipments: "Shipments",
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
    return getLogisticsPresetColumns(allColumns, workspacePreset);
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

  const applyPreset = (preset: LogisticsPreset) => {
    setWorkspacePreset(preset);
    if (preset !== "custom") {
      setManualColumns((prev) => ({ ...prev, [activeDataset]: undefined }));
    }
    setPage(1);
  };

  const toggleColumn = (column: string, checked: boolean) => {
    const base = workspacePreset === "custom"
      ? (manualColumns[activeDataset] || savedCustomViews[activeDataset] || allColumns)
      : getLogisticsPresetColumns(allColumns, workspacePreset);
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
      window.localStorage.setItem("logistics-custom-views-v1", JSON.stringify(next));
    } catch {
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    await exportTabularData({
      fileName: `logistics-${activeDataset}-view`,
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
          <h1 className="text-2xl font-bold tracking-tight">Logistics Timelines</h1>
          <p className="text-muted-foreground text-sm">Shipment tracking, carrier performance, and transit analysis</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Active Shipments</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{kpis?.activeShipments}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{kpis?.inTransit} in transit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>On-Time Rate</CardDescription></CardHeader>
          <CardContent>
            <span className={cn("text-2xl font-bold", kpis!.onTimeRate >= 80 ? "text-emerald-600" : "text-amber-600")}>{kpis?.onTimeRate}%</span>
            <p className="text-xs text-muted-foreground mt-1">{kpis?.delivered} delivered this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Delayed</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{kpis?.delayed}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">shipments past ETA</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Avg Transit Time</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold">{kpis?.avgTransitDays}</span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{kpis?.pendingInspection} pending inspection</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Logistics Data Workspace</CardTitle>
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

      {/* Carrier Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Carrier Performance</CardTitle>
          <CardDescription>On-time delivery rate and transit time by carrier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={carriers} margin={{ left: 20 }}>
                <XAxis dataKey="carrier" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={[0, 100]} label={{ value: "On-Time %", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: "Avg Days", angle: 90, position: "insideRight", style: { fontSize: 11 } }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="onTimeRate" fill="#22C55E" name="On-Time %" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="avgTransitDays" fill="#6366F1" name="Avg Transit Days" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Shipment Status Summary - Visual Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Pipeline</CardTitle>
          <CardDescription>Current status across all active shipments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {(["PENDING", "DISPATCHED", "IN_TRANSIT", "CUSTOMS_HOLD", "DELIVERED", "DELAYED"] as const).map((status) => {
              const count = shipments.filter((s) => s.status === status).length;
              const config = STATUS_CONFIG[status];
              return (
                <div key={status} className={cn("flex items-center gap-2 px-4 py-3 rounded-lg border min-w-[140px]", config.color)}>
                  {config.icon}
                  <div>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs">{status.replace("_", " ")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tracking # or PO..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="DELAYED">Delayed</SelectItem>
                <SelectItem value="CUSTOMS_HOLD">Customs Hold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={carrierFilter} onValueChange={setCarrierFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Carrier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Carriers</SelectItem>
                {uniqueCarriers.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {uniqueProjects.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={etaFilter} onValueChange={setEtaFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="ETA Confidence" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Confidence</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={delayedOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setDelayedOnly(!delayedOnly)}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Delayed Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Shipments</CardTitle>
          <CardDescription>{filtered.length} shipment{filtered.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Tracking #</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Transit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No shipments match your filters</TableCell></TableRow>
                ) : (
                  filtered.map((s) => {
                    const sc = STATUS_CONFIG[s.status];
                    return (
                      <TableRow key={s.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono font-semibold text-primary">{s.trackingNumber}</TableCell>
                        <TableCell className="text-sm">{s.poNumber}</TableCell>
                        <TableCell className="text-sm">{s.supplierName}</TableCell>
                        <TableCell className="text-sm">{s.carrier}</TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1", sc.color)}>
                            {sc.icon}{s.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{s.origin}</div>
                            <div className="flex items-center gap-1 text-muted-foreground">→ {s.destination}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.actualDate ? (
                            <span className="text-emerald-600">{s.actualDate}</span>
                          ) : (
                            <span className={s.isDelayed ? "text-red-600 font-semibold" : ""}>{s.expectedDate}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-xs font-semibold", ETA_COLORS[s.etaConfidence])}>
                            {s.etaConfidence}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{s.daysInTransit}d</span>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
              {(Object.keys(datasetLabels) as LogisticsDatasetKey[]).map((key) => (
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
              {(["default", "delivery", "risk", "ops", "custom"] as LogisticsPreset[]).map((preset) => (
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
