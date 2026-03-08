"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { format as formatDateValue } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { GripVertical, Columns3, ChevronDown, FileSpreadsheet, FileText, Download, ArrowUpRight } from "lucide-react";
import type { BoqTrackerStatus } from "@/lib/actions/boq-tracker";
import { BoqStatusBadge } from "./boq-status-badge";
import { BoqBatchModal, type BatchModalMode, type BatchStatus } from "./boq-batch-modal";
import { exportTabularData } from "@/lib/export-engine";

interface Props {
  projectId: string;
}

interface DisciplineSummary {
  discipline: string;
  deliveredQty: number;
  requiredQty: number;
  status: BoqTrackerStatus;
  scheduleImpactDays: number;
  itemCount: number;
}

interface MaterialSummary {
  discipline: string;
  materialClass: string;
  deliveredQty: number;
  requiredQty: number;
  status: BoqTrackerStatus;
  scheduleImpactDays: number;
  itemCount: number;
  blockingActivities: string[];
}

interface ItemRow {
  id: string;
  purchaseOrderId: string;
  poNumber: string;
  itemNumber: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  quantityDelivered: number;
  quantityInstalled?: number;
  quantityCertified?: number;
  discipline: string | null;
  materialClass: string | null;
  requiredByDate: string | null;
  rosDate: string | null;
  rosStatus?: string | null;
  criticality: string | null;
  isCritical?: boolean;
  scheduleActivityRef: string | null;
  scheduleDaysAtRisk: number;
  isVariation?: boolean;
  variationOrderNumber?: string | null;
  originalQuantity?: number | null;
  originalUnitPrice?: number | null;
  revisedQuantity?: number | null;
  lockedForDeScope?: boolean;
  status: BoqTrackerStatus;
  lateDays: number;
}

interface NcrRow {
  id: string;
  ncrNumber: string;
  title: string;
  status: "OPEN" | "SUPPLIER_RESPONDED" | "REINSPECTION" | "REVIEW" | "REMEDIATION" | "CLOSED";
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  issueType: string;
  createdAt: string;
  affectedBoqItem?: {
    id: string;
    itemNumber: string;
    description: string;
  } | null;
  purchaseOrder?: {
    poNumber: string;
  } | null;
}

// All available columns — key maps to ItemRow fields
const ALL_COLUMN_DEFS: Record<string, { label: string; width?: string; cell: (item: ItemRow) => ReactNode; exportValue: (item: ItemRow) => string }> = {
  poItem: {
    label: "PO / Item #",
    width: "w-40",
    cell: (item) => (
      <div>
        <p className="font-mono text-[11px] text-muted-foreground leading-none">{item.poNumber}</p>
        <p className="font-semibold text-sm mt-0.5">#{item.itemNumber}</p>
      </div>
    ),
    exportValue: (item) => `${item.poNumber} #${item.itemNumber}`,
  },
  description: {
    label: "Description",
    cell: (item) => {
      const isAmended = (item.originalQuantity != null && item.originalQuantity !== item.quantity) ||
                        (item.originalUnitPrice != null && item.originalUnitPrice !== item.unitPrice);
      return (
        <div className="space-y-0.5">
          <div className="flex items-start gap-1.5 flex-wrap">
            <p className="font-medium text-sm leading-snug">{item.description}</p>
            {item.isVariation && (
              <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0 mt-0.5">
                {item.variationOrderNumber ?? "VO"}
              </span>
            )}
            {isAmended && !item.isVariation && (
              <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
                Amended
              </span>
            )}
          </div>
          {item.materialClass && (
            <p className="text-[11px] text-muted-foreground">{item.materialClass}</p>
          )}
        </div>
      );
    },
    exportValue: (item) => item.description,
  },
  discipline: {
    label: "Discipline",
    width: "w-[120px]",
    cell: (item) => <span className="text-sm text-muted-foreground">{item.discipline ?? "—"}</span>,
    exportValue: (item) => item.discipline ?? "",
  },
  materialClass: {
    label: "Material Class",
    width: "w-[140px]",
    cell: (item) => <span className="text-sm text-muted-foreground">{item.materialClass ?? "—"}</span>,
    exportValue: (item) => item.materialClass ?? "",
  },
  quantity: {
    label: "Qty / Unit",
    width: "w-[130px]",
    cell: (item) => {
      const hasBaseline = item.originalQuantity != null && item.originalQuantity !== item.quantity;
      const delta = hasBaseline ? item.quantity - (item.originalQuantity ?? 0) : 0;
      return (
        <div className="text-right space-y-0.5">
          {hasBaseline && (
            <div className="flex items-center justify-end gap-1">
              <span className="tabular-nums text-[11px] text-muted-foreground line-through leading-none">
                {(item.originalQuantity ?? 0).toLocaleString()}
              </span>
              <span className="text-muted-foreground text-[10px]">{item.unit}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-1">
            <span className="tabular-nums text-sm font-medium leading-none">{item.quantity.toLocaleString()}</span>
            <span className="text-muted-foreground text-xs">{item.unit}</span>
          </div>
          {hasBaseline && (
            <div className={`text-[10px] font-semibold tabular-nums leading-none ${delta > 0 ? "text-amber-400" : "text-blue-400"}`}>
              {delta > 0 ? "+" : ""}{delta.toLocaleString()} {item.unit}
            </div>
          )}
        </div>
      );
    },
    exportValue: (item) => `${item.quantity} ${item.unit}`,
  },
  unitPrice: {
    label: "Unit Cost",
    width: "w-[120px]",
    cell: (item) => {
      const hasBaseline = item.originalUnitPrice != null && item.originalUnitPrice !== item.unitPrice;
      const delta = hasBaseline ? item.unitPrice - (item.originalUnitPrice ?? 0) : 0;
      return (
        <div className="text-right space-y-0.5">
          {hasBaseline && (
            <span className="tabular-nums text-[11px] text-muted-foreground line-through block leading-none">
              {fmt(item.originalUnitPrice ?? 0)}
            </span>
          )}
          <span className="tabular-nums text-sm block leading-none">{fmt(item.unitPrice)}</span>
          {hasBaseline && (
            <span className={`text-[10px] font-semibold tabular-nums block leading-none ${delta > 0 ? "text-amber-400" : "text-blue-400"}`}>
              {delta > 0 ? "+" : ""}{fmt(delta)}
            </span>
          )}
        </div>
      );
    },
    exportValue: (item) => String(item.unitPrice),
  },
  totalPrice: {
    label: "Total Value",
    width: "w-[130px]",
    cell: (item) => {
      const origQty = item.originalQuantity ?? item.quantity;
      const origRate = item.originalUnitPrice ?? item.unitPrice;
      const origTotal = origQty * origRate;
      const hasBaseline = (item.originalQuantity != null && item.originalQuantity !== item.quantity) ||
                          (item.originalUnitPrice != null && item.originalUnitPrice !== item.unitPrice);
      const delta = item.totalPrice - origTotal;
      return (
        <div className="text-right space-y-0.5">
          {hasBaseline && (
            <span className="tabular-nums text-[11px] text-muted-foreground line-through block leading-none">
              {fmt(origTotal)}
            </span>
          )}
          <span className="tabular-nums text-sm font-semibold block leading-none">{fmt(item.totalPrice)}</span>
          {hasBaseline && (
            <span className={`text-[10px] font-semibold tabular-nums block leading-none ${delta > 0 ? "text-amber-400" : "text-blue-400"}`}>
              {delta > 0 ? "+" : ""}{fmt(delta)}
            </span>
          )}
        </div>
      );
    },
    exportValue: (item) => String(item.totalPrice),
  },
  delivery: {
    label: "Delivery",
    width: "w-20",
    cell: (item) => {
      const pct = item.quantity > 0 ? (item.quantityDelivered / item.quantity) * 100 : 0;
      return (
        <span className={`tabular-nums text-sm font-bold text-right block ${pct >= 100 ? "text-emerald-400" : pct > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
          {pct.toFixed(0)}%
        </span>
      );
    },
    exportValue: (item) => item.quantity > 0 ? `${((item.quantityDelivered / item.quantity) * 100).toFixed(1)}%` : "0%",
  },
  quantityDelivered: {
    label: "Qty Delivered",
    width: "w-[110px]",
    cell: (item) => <span className="tabular-nums text-sm text-right block">{item.quantityDelivered.toLocaleString()}</span>,
    exportValue: (item) => String(item.quantityDelivered),
  },
  quantityInstalled: {
    label: "Qty Installed",
    width: "w-[110px]",
    cell: (item) => <span className="tabular-nums text-sm text-right block">{(item.quantityInstalled ?? 0).toLocaleString()}</span>,
    exportValue: (item) => String(item.quantityInstalled ?? 0),
  },
  quantityCertified: {
    label: "Qty Certified",
    width: "w-[110px]",
    cell: (item) => <span className="tabular-nums text-sm text-right block">{(item.quantityCertified ?? 0).toLocaleString()}</span>,
    exportValue: (item) => String(item.quantityCertified ?? 0),
  },
  requiredByDate: {
    label: "Required By",
    width: "w-[110px]",
    cell: (item) => <span className="text-sm text-muted-foreground">{formatDate(item.requiredByDate)}</span>,
    exportValue: (item) => formatDate(item.requiredByDate),
  },
  rosDate: {
    label: "ROS Date",
    width: "w-[110px]",
    cell: (item) => <span className="text-sm text-muted-foreground">{formatDate(item.rosDate)}</span>,
    exportValue: (item) => formatDate(item.rosDate ?? null),
  },
  rosStatus: {
    label: "ROS Status",
    width: "w-[100px]",
    cell: (item) => <span className="text-sm text-muted-foreground">{item.rosStatus ?? "—"}</span>,
    exportValue: (item) => item.rosStatus ?? "",
  },
  criticality: {
    label: "Criticality",
    width: "w-[110px]",
    cell: (item) => (
      <Badge variant={item.criticality === "JUST_IN_TIME" ? "destructive" : "outline"} className="text-[10px]">
        {item.criticality === "JUST_IN_TIME" ? "JIT" : item.criticality ?? "—"}
      </Badge>
    ),
    exportValue: (item) => item.criticality ?? "",
  },
  isCritical: {
    label: "Critical",
    width: "w-[80px]",
    cell: (item) => (
      <span className={`text-sm font-medium ${item.isCritical ? "text-red-400" : "text-muted-foreground"}`}>
        {item.isCritical ? "Yes" : "No"}
      </span>
    ),
    exportValue: (item) => item.isCritical ? "Yes" : "No",
  },
  scheduleDaysAtRisk: {
    label: "Days at Risk",
    width: "w-[100px]",
    cell: (item) => (
      <span className={`tabular-nums text-sm ${item.scheduleDaysAtRisk > 0 ? "text-amber-400 font-semibold" : "text-muted-foreground"}`}>
        {item.scheduleDaysAtRisk > 0 ? `+${item.scheduleDaysAtRisk}d` : "—"}
      </span>
    ),
    exportValue: (item) => String(item.scheduleDaysAtRisk),
  },
  scheduleActivityRef: {
    label: "Activity Ref",
    width: "w-[120px]",
    cell: (item) => <span className="text-xs text-muted-foreground font-mono">{item.scheduleActivityRef ?? "—"}</span>,
    exportValue: (item) => item.scheduleActivityRef ?? "",
  },
  isVariation: {
    label: "Variation",
    width: "w-[90px]",
    cell: (item) => (
      <span className={`text-sm ${item.isVariation ? "text-violet-400 font-medium" : "text-muted-foreground"}`}>
        {item.isVariation ? "VO" : "—"}
      </span>
    ),
    exportValue: (item) => item.isVariation ? "Yes" : "No",
  },
  variationOrderNumber: {
    label: "VO Number",
    width: "w-[110px]",
    cell: (item) => <span className="text-xs font-mono text-muted-foreground">{item.variationOrderNumber ?? "—"}</span>,
    exportValue: (item) => item.variationOrderNumber ?? "",
  },
  originalQuantity: {
    label: "Original Qty",
    width: "w-[110px]",
    cell: (item) => <span className="tabular-nums text-sm text-muted-foreground text-right block">{item.originalQuantity != null ? item.originalQuantity.toLocaleString() : "—"}</span>,
    exportValue: (item) => item.originalQuantity != null ? String(item.originalQuantity) : "",
  },
  originalUnitPrice: {
    label: "Original Unit Cost",
    width: "w-[130px]",
    cell: (item) => <span className="tabular-nums text-sm text-muted-foreground text-right block">{item.originalUnitPrice != null ? fmt(item.originalUnitPrice) : "—"}</span>,
    exportValue: (item) => item.originalUnitPrice != null ? String(item.originalUnitPrice) : "",
  },
  revisedQuantity: {
    label: "Revised Qty",
    width: "w-[110px]",
    cell: (item) => <span className="tabular-nums text-sm text-muted-foreground text-right block">{item.revisedQuantity != null ? item.revisedQuantity.toLocaleString() : "—"}</span>,
    exportValue: (item) => item.revisedQuantity != null ? String(item.revisedQuantity) : "",
  },
  lockedForDeScope: {
    label: "De-Scoped",
    width: "w-[90px]",
    cell: (item) => (
      <span className={`text-sm ${item.lockedForDeScope ? "text-red-400 font-medium" : "text-muted-foreground"}`}>
        {item.lockedForDeScope ? "Locked" : "—"}
      </span>
    ),
    exportValue: (item) => item.lockedForDeScope ? "Locked" : "",
  },
  lateDays: {
    label: "Late Days",
    width: "w-[90px]",
    cell: (item) => (
      <span className={`tabular-nums text-sm ${item.lateDays > 0 ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>
        {item.lateDays > 0 ? `+${item.lateDays}d` : "—"}
      </span>
    ),
    exportValue: (item) => String(item.lateDays),
  },
  status: {
    label: "Status",
    width: "w-[90px]",
    cell: (item) => <BoqStatusBadge status={item.status} />,
    exportValue: (item) => item.status,
  },
};

// Default visible columns (matches existing UI)
const DEFAULT_COLUMNS = ["poItem", "description", "quantity", "unitPrice", "totalPrice", "delivery", "requiredByDate", "status"];

function reorderCols(arr: string[], from: string, to: string, setter: (val: string[]) => void) {
  const next = [...arr];
  const fi = next.indexOf(from);
  const ti = next.indexOf(to);
  if (fi < 0 || ti < 0) return;
  next.splice(fi, 1);
  next.splice(ti, 0, from);
  setter(next);
}

interface BatchRow {
  id: string;
  boqItemId: string;
  linkedPoId: string | null;
  batchLabel: string;
  expectedDate: string | null;
  actualDate: string | null;
  quantityExpected: number;
  quantityDelivered: number;
  status: "PENDING" | "IN_TRANSIT" | "PARTIALLY_DELIVERED" | "DELIVERED" | "LATE" | "CANCELLED";
  notes: string | null;
  poNumber: string | null;
}

interface BatchModalState {
  open: boolean;
  mode: BatchModalMode;
  itemId: string;
  batchId?: string;
  initialValues?: {
    batchLabel?: string;
    expectedDate?: string;
    actualDate?: string;
    quantityExpected?: number;
    quantityDelivered?: number;
    status?: BatchStatus;
  };
}

interface EditDraft {
  itemNumber: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  deliveryPercent: number;
  requiredByDate: string;
  criticality: string;
  scheduleDaysAtRisk: number;
  scheduleActivityRef: string;
}

const BATCH_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_TRANSIT: "In transit",
  PARTIALLY_DELIVERED: "Partial",
  DELIVERED: "Delivered",
  LATE: "Late",
  CANCELLED: "Cancelled",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toISOString().slice(0, 10);
}

function parseIsoDate(value: string) {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00`);
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function statusColor(status: BoqTrackerStatus) {
  if (status === "LATE") return "bg-red-500/10 border-red-500/30 text-red-400";
  if (status === "AT_RISK") return "bg-amber-500/10 border-amber-500/30 text-amber-400";
  if (status === "ON_TRACK") return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
  return "bg-muted border-muted-foreground/20 text-muted-foreground";
}

function ncrStatusLabel(status: NcrRow["status"]) {
  if (status === "SUPPLIER_RESPONDED") return "Supplier responded";
  if (status === "REINSPECTION") return "Re-inspection";
  if (status === "REMEDIATION") return "Remediation";
  if (status === "REVIEW") return "Review";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function ncrSeverityClass(severity: NcrRow["severity"]) {
  if (severity === "CRITICAL") return "bg-red-500/10 text-red-400 border-red-500/20";
  if (severity === "MAJOR") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
}

export function BoqTrackerShell({ projectId }: Props) {
  const [loading, setLoading] = useState(false);
  const [discipline, setDiscipline] = useState<string>("ALL");
  const [materialClass, setMaterialClass] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [disciplineSummary, setDisciplineSummary] = useState<DisciplineSummary[]>([]);
  const [materialSummary, setMaterialSummary] = useState<MaterialSummary[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [projectNcrs, setProjectNcrs] = useState<NcrRow[]>([]);
  const [loadingProjectNcrs, setLoadingProjectNcrs] = useState(false);
  const [showProjectNcrs, setShowProjectNcrs] = useState(false);

  // Column management state
  const [savedCustomCols, setSavedCustomCols] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_COLUMNS;
    try {
      const raw = window.localStorage.getItem("boq-tracker-custom-view-v1");
      if (!raw) return DEFAULT_COLUMNS;
      return JSON.parse(raw) as string[];
    } catch {
      return DEFAULT_COLUMNS;
    }
  });
  const [visibleCols, setVisibleCols] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_COLUMNS;
    try {
      const raw = window.localStorage.getItem("boq-tracker-custom-view-v1");
      if (!raw) return DEFAULT_COLUMNS;
      return JSON.parse(raw) as string[];
    } catch {
      return DEFAULT_COLUMNS;
    }
  });
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [showViewExplanation, setShowViewExplanation] = useState(false);
  const [sectionExpanded, setSectionExpanded] = useState({
    changed: true,
    original: false,
  });

  // Sheet state
  const [selectedItem, setSelectedItem] = useState<ItemRow | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const [batchModal, setBatchModal] = useState<BatchModalState>({
    open: false,
    mode: "create",
    itemId: "",
  });
  const [batchModalSeed, setBatchModalSeed] = useState(0);
  const [batchSaving, setBatchSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadingProjectNcrs(true);
    try {
      const level1Res = await fetch(`/api/boq/tracker?projectId=${projectId}`);
      const level1Json = await level1Res.json();
      setDisciplineSummary(level1Json.success ? level1Json.data : []);

      const params = new URLSearchParams();
      params.set("projectId", projectId);
      params.set("includeItems", "1");
      if (discipline !== "ALL") params.set("discipline", discipline);
      if (materialClass !== "ALL") params.set("materialClass", materialClass);
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/boq/tracker?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load BOQ data");

      if (json.level === 1) {
        setMaterialSummary([]);
        setItems(json.data.items ?? []);
        setBatches(json.data.batches ?? []);
      } else if (json.level === 2) {
        setMaterialSummary(Array.isArray(json.data) ? json.data : json.data.summary ?? []);
        setItems(Array.isArray(json.data) ? [] : json.data.items ?? []);
        setBatches(Array.isArray(json.data) ? [] : json.data.batches ?? []);
      } else {
        setItems(json.data.items ?? []);
        setBatches(json.data.batches ?? []);
      }

      const ncrRes = await fetch(`/api/ncr?projectId=${projectId}`);
      const ncrJson = await ncrRes.json();
      if (ncrJson.success) {
        setProjectNcrs(Array.isArray(ncrJson.data) ? ncrJson.data : ncrJson.data?.ncrs ?? []);
      } else {
        setProjectNcrs([]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load data");
    } finally {
      setLoading(false);
      setLoadingProjectNcrs(false);
    }
  }, [projectId, discipline, materialClass, search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const batchMap = useMemo(() => {
    const map = new Map<string, BatchRow[]>();
    for (const batch of batches) {
      const list = map.get(batch.boqItemId) ?? [];
      list.push(batch);
      map.set(batch.boqItemId, list);
    }
    return map;
  }, [batches]);

  const livePoValue = useMemo(() => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [items]);

  const liveDelivery = useMemo(() => {
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const totalDel = items.reduce((s, i) => s + i.quantityDelivered, 0);
    return totalQty > 0 ? (totalDel / totalQty) * 100 : 0;
  }, [items]);

  const lateCount = useMemo(() => items.filter((i) => i.status === "LATE").length, [items]);
  const isChangedItem = useCallback((item: ItemRow) => {
    const isAmended =
      (item.originalQuantity != null && item.originalQuantity !== item.quantity) ||
      (item.originalUnitPrice != null && item.originalUnitPrice !== item.unitPrice);
    return item.isVariation || isAmended;
  }, []);
  const changedItems = useMemo(() => items.filter(isChangedItem), [items, isChangedItem]);
  const originalItems = useMemo(() => items.filter((item) => !isChangedItem(item)), [items, isChangedItem]);
  const totals = useMemo(() => {
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const unitPrice = items.reduce((sum, item) => sum + item.unitPrice, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const quantityDelivered = items.reduce((sum, item) => sum + item.quantityDelivered, 0);
    const quantityInstalled = items.reduce((sum, item) => sum + (item.quantityInstalled ?? 0), 0);
    const quantityCertified = items.reduce((sum, item) => sum + (item.quantityCertified ?? 0), 0);
    const originalQuantity = items.reduce((sum, item) => sum + (item.originalQuantity ?? 0), 0);
    const originalUnitPrice = items.reduce((sum, item) => sum + (item.originalUnitPrice ?? 0), 0);
    const revisedQuantity = items.reduce((sum, item) => sum + (item.revisedQuantity ?? 0), 0);
    const lateDays = items.reduce((sum, item) => sum + item.lateDays, 0);
    const deliveryPct = quantity > 0 ? (quantityDelivered / quantity) * 100 : 0;

    return {
      quantity,
      unitPrice,
      totalPrice,
      quantityDelivered,
      quantityInstalled,
      quantityCertified,
      originalQuantity,
      originalUnitPrice,
      revisedQuantity,
      lateDays,
      deliveryPct,
    };
  }, [items]);

  function openItem(item: ItemRow) {
    setSelectedItem(item);
    setDraft({
      itemNumber: item.itemNumber,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      deliveryPercent: item.quantity > 0 ? (item.quantityDelivered / item.quantity) * 100 : 0,
      requiredByDate: formatDate(item.requiredByDate) === "—" ? "" : formatDate(item.requiredByDate),
      criticality: item.criticality ?? "BUFFERED",
      scheduleDaysAtRisk: item.scheduleDaysAtRisk,
      scheduleActivityRef: item.scheduleActivityRef ?? "",
    });
  }

  function closeSheet() {
    setSelectedItem(null);
    setDraft(null);
  }

  function setDraftField<K extends keyof EditDraft>(key: K, value: EditDraft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function saveItem() {
    if (!selectedItem || !draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/boq/tracker/${selectedItem.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemNumber: draft.itemNumber,
          unit: draft.unit,
          quantity: draft.quantity,
          unitPrice: draft.unitPrice,
          deliveryPercent: draft.deliveryPercent,
          requiredByDate: draft.requiredByDate || null,
          criticality: draft.criticality,
          scheduleDaysAtRisk: draft.scheduleDaysAtRisk,
          scheduleActivityRef: draft.scheduleActivityRef,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Failed to update item");
        return;
      }
      toast.success("Item updated");
      closeSheet();
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function markDelivered(item: ItemRow) {
    const res = await fetch(`/api/boq/tracker/${item.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantityDelivered: item.quantity }),
    });
    const json = await res.json();
    if (!json.success) { toast.error(json.error || "Failed"); return; }
    toast.success("Marked as fully delivered");
    await loadData();
  }

  function openCreateBatchModal(item: ItemRow) {
    setBatchModalSeed((v) => v + 1);
    setBatchModal({
      open: true,
      mode: "create",
      itemId: item.id,
      initialValues: {
        batchLabel: "New delivery batch",
        expectedDate: formatDate(item.requiredByDate) === "—" ? "" : formatDate(item.requiredByDate),
        quantityExpected: item.quantity,
        quantityDelivered: 0,
        status: "PENDING",
      },
    });
  }

  function openDuplicateBatchModal(itemId: string, batch: BatchRow) {
    setBatchModalSeed((v) => v + 1);
    setBatchModal({
      open: true,
      mode: "duplicate",
      itemId,
      initialValues: {
        batchLabel: `${batch.batchLabel} (copy)`,
        expectedDate: formatDate(batch.expectedDate) === "—" ? "" : formatDate(batch.expectedDate),
        quantityExpected: batch.quantityExpected,
        quantityDelivered: 0,
        status: "PENDING",
      },
    });
  }

  function openUpdateBatchStatusModal(itemId: string, batch: BatchRow) {
    setBatchModalSeed((v) => v + 1);
    setBatchModal({
      open: true,
      mode: "status",
      itemId,
      batchId: batch.id,
      initialValues: {
        status: batch.status,
        actualDate: formatDate(batch.actualDate) === "—" ? "" : formatDate(batch.actualDate),
        quantityDelivered: batch.quantityDelivered,
      },
    });
  }

  async function submitBatchModal(values: {
    batchLabel: string;
    expectedDate: string;
    actualDate: string;
    quantityExpected: number;
    quantityDelivered: number;
    status: BatchStatus;
  }) {
    if (!batchModal.itemId) return;
    setBatchSaving(true);
    try {
      if (batchModal.mode === "create" || batchModal.mode === "duplicate") {
        const res = await fetch(`/api/boq/tracker/${batchModal.itemId}/batch`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchLabel: values.batchLabel,
            expectedDate: values.expectedDate || null,
            quantityExpected: values.quantityExpected,
            quantityDelivered: values.quantityDelivered || 0,
            status: values.status,
          }),
        });
        const json = await res.json();
        if (!json.success) { toast.error(json.error || "Failed"); return; }
        toast.success(batchModal.mode === "create" ? "Batch created" : "Batch duplicated");
      } else {
        if (!batchModal.batchId) return;
        const res = await fetch(`/api/boq/tracker/${batchModal.itemId}/batch/${batchModal.batchId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: values.status,
            ...(values.actualDate ? { actualDate: values.actualDate } : {}),
            ...(values.status === "DELIVERED" ? { quantityDelivered: values.quantityDelivered || 0 } : {}),
          }),
        });
        const json = await res.json();
        if (!json.success) { toast.error(json.error || "Failed"); return; }
        toast.success("Batch updated");
      }
      setBatchModal((prev) => ({ ...prev, open: false }));
      await loadData();
    } finally {
      setBatchSaving(false);
    }
  }

  const selectedItemBatches = selectedItem ? (batchMap.get(selectedItem.id) ?? []) : [];
  const liveDraftTotal = draft ? draft.quantity * draft.unitPrice : 0;

  const viewExplanation = useMemo(() => {
    const disciplineText = discipline !== "ALL" ? ` filtered by ${discipline}` : "";
    const statusText = statusFilter !== "ALL" ? `, status: ${statusFilter}` : "";
    const searchText = search.trim() ? `, search: "${search.trim()}"` : "";
    const isSaved = JSON.stringify(visibleCols) === JSON.stringify(savedCustomCols);
    const viewType = isSaved ? "custom saved view" : "current view";
    return `You are viewing BOQ items in ${viewType}${disciplineText}${statusText}${searchText}. ${items.length.toLocaleString()} item(s) visible across ${visibleCols.length} column(s).`;
  }, [discipline, statusFilter, search, visibleCols, savedCustomCols, items.length]);

  function saveCustomView() {
    setSavedCustomCols(visibleCols);
    try {
      window.localStorage.setItem("boq-tracker-custom-view-v1", JSON.stringify(visibleCols));
      toast.success("Custom view saved");
    } catch {
      toast.error("Failed to save view");
    }
  }

  async function handleExport(format: "csv" | "excel" | "pdf") {
    const exportCols = visibleCols
      .filter((k) => k !== "poItem") // split poItem into two columns for export
      .map((k) => ({ key: k, label: ALL_COLUMN_DEFS[k]?.label ?? k }));

    // Always prepend PO Number and Item Number for export
    const allExportCols = [
      { key: "poNumber", label: "PO Number" },
      { key: "itemNumber", label: "Item Number" },
      ...exportCols.filter((c) => c.key !== "description" || true),
    ];

    const rows = items.map((item) => {
      const row: Record<string, string> = {
        poNumber: item.poNumber,
        itemNumber: item.itemNumber,
      };
      for (const col of exportCols) {
        const def = ALL_COLUMN_DEFS[col.key];
        if (def) row[col.key] = def.exportValue(item);
      }
      return row;
    });

    await exportTabularData({
      format,
      fileName: `boq-tracker-${new Date().toISOString().slice(0, 10)}`,
      title: "BOQ Tracker",
      columns: allExportCols,
      rows,
    });
  }

  return (
    <div className="flex flex-col gap-0">
      {/* KPI bar */}
      <div className="flex flex-wrap gap-3 px-4 pt-4 pb-3 shrink-0">
        <div className="flex-1 min-w-[130px] rounded-lg border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">PO Value</p>
          <p className="text-xl font-bold tabular-nums">{fmt(livePoValue)}</p>
        </div>
        <div className="flex-1 min-w-[130px] rounded-lg border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Delivery</p>
          <p className="text-xl font-bold tabular-nums">{liveDelivery.toFixed(1)}%</p>
        </div>
        <div className="flex-1 min-w-[110px] rounded-lg border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Items</p>
          <p className="text-xl font-bold tabular-nums">{items.length}</p>
        </div>
        <div className={`flex-1 min-w-[110px] rounded-lg border px-4 py-3 ${lateCount > 0 ? "border-red-500/30 bg-red-500/5" : "bg-card"}`}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Late items</p>
          <p className={`text-xl font-bold tabular-nums ${lateCount > 0 ? "text-red-400" : ""}`}>{lateCount}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3 shrink-0">
        <Select value={discipline} onValueChange={(v) => { setDiscipline(v); setMaterialClass("ALL"); }}>
          <SelectTrigger className="h-8 w-[170px] text-sm">
            <SelectValue placeholder="Discipline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All disciplines</SelectItem>
            {disciplineSummary.map((row) => (
              <SelectItem key={row.discipline} value={row.discipline}>{row.discipline}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {discipline !== "ALL" && materialSummary.length > 0 && (
          <Select value={materialClass} onValueChange={setMaterialClass}>
            <SelectTrigger className="h-8 w-[170px] text-sm">
              <SelectValue placeholder="Material class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All material classes</SelectItem>
              {materialSummary.map((row) => (
                <SelectItem key={row.materialClass} value={row.materialClass}>{row.materialClass}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All status</SelectItem>
            <SelectItem value="ON_TRACK">On track</SelectItem>
            <SelectItem value="AT_RISK">At risk</SelectItem>
            <SelectItem value="LATE">Late</SelectItem>
            <SelectItem value="NO_REQUIRED_DATE">No date</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search PO, item, material…"
          className="h-8 w-[210px] text-sm"
        />

        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>

        {/* Column picker */}
        <Popover open={colPickerOpen} onOpenChange={setColPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Columns3 className="h-3.5 w-3.5" />
              Columns ({visibleCols.length})
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="end">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 pb-2">
              Show / hide columns
            </p>
            <ScrollArea className="h-[300px]">
              <div className="space-y-0.5 pr-2">
                {Object.entries(ALL_COLUMN_DEFS).map(([key, def]) => {
                  const isVisible = visibleCols.includes(key);
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 rounded px-2 py-1.5 cursor-pointer hover:bg-muted/60 transition-colors"
                    >
                      <Checkbox
                        checked={isVisible}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVisibleCols((prev) => [...prev, key]);
                          } else {
                            setVisibleCols((prev) => prev.filter((k) => k !== key));
                          }
                        }}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-sm">{def.label}</span>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
            <Separator className="my-2" />
            <div className="flex gap-1.5 px-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs flex-1"
                onClick={() => setVisibleCols(Object.keys(ALL_COLUMN_DEFS))}
              >
                Select all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs flex-1"
                onClick={() => setVisibleCols(DEFAULT_COLUMNS)}
              >
                Reset
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowViewExplanation((v) => !v)}
          className={showViewExplanation ? "bg-muted" : ""}
        >
          Explain View
        </Button>

        <Button variant="outline" size="sm" onClick={saveCustomView}>
          Save Custom View
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowProjectNcrs((prev) => !prev)}
          className={showProjectNcrs ? "bg-muted" : ""}
        >
          NCRs ({projectNcrs.length})
        </Button>

        {/* Export dropdown */}
        <DropdownMenu open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport("csv")}>
              <FileText className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("excel")}>
              <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-emerald-500" />
              Export as Excel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExport("pdf")}>
              <FileText className="h-3.5 w-3.5 mr-2 text-red-400" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Explain View panel */}
      {showViewExplanation && (
        <div className="mx-4 mb-2 rounded-lg border bg-muted/20 px-4 py-2.5 text-sm text-muted-foreground shrink-0">
          {viewExplanation}
        </div>
      )}

      {/* Discipline pills */}
      {disciplineSummary.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-3 shrink-0">
          <button
            onClick={() => { setDiscipline("ALL"); setMaterialClass("ALL"); }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors
              ${discipline === "ALL" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
          >
            All
          </button>
          {disciplineSummary.map((row) => (
            <button
              key={row.discipline}
              onClick={() => { setDiscipline(row.discipline); setMaterialClass("ALL"); }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors
                ${discipline === row.discipline
                  ? "border-primary bg-primary/10 text-primary"
                  : `${statusColor(row.status)} hover:opacity-80`}`}
            >
              {row.discipline}
              <span className="tabular-nums opacity-70">{row.itemCount}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hint + legend */}
      <div className="px-4 pb-2 shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-[11px] text-muted-foreground">
          Click any row to edit it and manage delivery batches.
        </p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-sm border-l-2 border-l-amber-500/60 bg-amber-500/10" />
            Amended
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-sm border-l-2 border-l-violet-500/60 bg-violet-500/10" />
            Variation order
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="tabular-nums line-through text-[10px]">orig</span>
            &nbsp;Original value (struck through)
          </span>
        </div>
      </div>

      {/* Project NCR panel */}
      <div className="mx-4 mb-3 rounded-lg border overflow-hidden shrink-0">
        <button
          type="button"
          onClick={() => setShowProjectNcrs((prev) => !prev)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showProjectNcrs ? "" : "-rotate-90"}`} />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project NCRs
            </span>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {projectNcrs.length.toLocaleString()} total
          </span>
        </button>
        {showProjectNcrs && (
          <div className="border-t bg-background">
            {loadingProjectNcrs ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">Loading NCRs…</p>
            ) : projectNcrs.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">No NCRs raised for this project yet.</p>
            ) : (
              <ScrollArea className="max-h-56">
                <div className="divide-y">
                  {projectNcrs.map((ncrItem) => (
                    <button
                      key={ncrItem.id}
                      type="button"
                      onClick={() => {
                        window.location.href = `/dashboard/procurement/ncr/${ncrItem.id}`;
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {ncrItem.ncrNumber} - {ncrItem.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {ncrItem.affectedBoqItem
                              ? `#${ncrItem.affectedBoqItem.itemNumber} - ${ncrItem.affectedBoqItem.description}`
                              : "No BOQ item linked"}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {ncrItem.purchaseOrder?.poNumber ?? "No PO"} · {new Date(ncrItem.createdAt).toISOString().slice(0, 10)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${ncrSeverityClass(ncrItem.severity)}`}>
                            {ncrItem.severity}
                          </span>
                          <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {ncrStatusLabel(ncrItem.status)}
                          </span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>

      {/* Items table — viewport-height contained */}
      <div className="mx-4 mb-4 rounded-lg border bg-white text-foreground dark:bg-background overflow-hidden flex flex-col h-[calc(100dvh-340px)] min-h-60">
        <div className="overflow-x-auto shrink-0 border-b">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white dark:bg-muted/40 dark:hover:bg-muted/40">
                {visibleCols.map((colKey) => {
                  const def = ALL_COLUMN_DEFS[colKey];
                  if (!def) return null;
                  return (
                    <TableHead
                      key={colKey}
                      draggable
                      onDragStart={() => setDragCol(colKey)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverCol(colKey); }}
                      onDragEnd={() => {
                        reorderCols(visibleCols, dragCol!, dragOverCol!, setVisibleCols);
                        setDragCol(null);
                        setDragOverCol(null);
                      }}
                      className={[
                        def.width ?? "",
                        "cursor-grab active:cursor-grabbing select-none",
                        dragCol === colKey ? "opacity-40 bg-muted/60" : "",
                        dragOverCol === colKey && dragCol !== colKey
                          ? "bg-primary/15 border-l-2 border-l-primary"
                          : "",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-1">
                        <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        {def.label}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
          </Table>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="overflow-x-auto min-h-full">
            <Table>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={visibleCols.length || 1} className="py-16 text-center text-muted-foreground">
                      {loading ? "Loading items…" : "No items match your filters."}
                    </TableCell>
                  </TableRow>
                )}
                {items.length > 0 && (
                  <>
                    <TableRow
                      className="cursor-pointer bg-violet-500/5 hover:bg-violet-500/10"
                      onClick={() =>
                        setSectionExpanded((prev) => ({ ...prev, changed: !prev.changed }))
                      }
                    >
                      <TableCell colSpan={visibleCols.length || 1} className="py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ChevronDown
                              className={`h-4 w-4 text-muted-foreground transition-transform ${
                                sectionExpanded.changed ? "" : "-rotate-90"
                              }`}
                            />
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Changed / Updated
                            </span>
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {changedItems.length.toLocaleString()} item(s)
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {sectionExpanded.changed && changedItems.map((item) => {
                      const isSelected = selectedItem?.id === item.id;
                      const isAmended = (item.originalQuantity != null && item.originalQuantity !== item.quantity) ||
                                        (item.originalUnitPrice != null && item.originalUnitPrice !== item.unitPrice);
                      const isVariationRow = item.isVariation;
                      return (
                        <TableRow
                          key={item.id}
                          onClick={() => openItem(item)}
                          className={[
                            "cursor-pointer transition-colors",
                            isSelected
                              ? "bg-primary/10 hover:bg-primary/10"
                              : isVariationRow
                                ? "bg-violet-500/5 hover:bg-violet-500/10 border-l-2 border-l-violet-500/40"
                                : isAmended
                                  ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500/40"
                                  : "hover:bg-slate-50 dark:hover:bg-muted/30",
                          ].join(" ")}
                        >
                          {visibleCols.map((colKey) => {
                            const def = ALL_COLUMN_DEFS[colKey];
                            if (!def) return null;
                            return (
                              <TableCell key={colKey} className={def.width ?? ""}>
                                {def.cell(item)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                    {sectionExpanded.changed && changedItems.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={visibleCols.length || 1}
                          className="py-4 text-center text-sm text-muted-foreground"
                        >
                          No changed or updated items in this view.
                        </TableCell>
                      </TableRow>
                    )}

                    <TableRow
                      className="cursor-pointer bg-muted/20 hover:bg-muted/30"
                      onClick={() =>
                        setSectionExpanded((prev) => ({ ...prev, original: !prev.original }))
                      }
                    >
                      <TableCell colSpan={visibleCols.length || 1} className="py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ChevronDown
                              className={`h-4 w-4 text-muted-foreground transition-transform ${
                                sectionExpanded.original ? "" : "-rotate-90"
                              }`}
                            />
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Original
                            </span>
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {originalItems.length.toLocaleString()} item(s)
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {sectionExpanded.original && originalItems.map((item) => {
                      const isSelected = selectedItem?.id === item.id;
                      const isAmended = (item.originalQuantity != null && item.originalQuantity !== item.quantity) ||
                                        (item.originalUnitPrice != null && item.originalUnitPrice !== item.unitPrice);
                      const isVariationRow = item.isVariation;
                      return (
                        <TableRow
                          key={item.id}
                          onClick={() => openItem(item)}
                          className={[
                            "cursor-pointer transition-colors",
                            isSelected
                              ? "bg-primary/10 hover:bg-primary/10"
                              : isVariationRow
                                ? "bg-violet-500/5 hover:bg-violet-500/10 border-l-2 border-l-violet-500/40"
                                : isAmended
                                  ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500/40"
                                  : "hover:bg-slate-50 dark:hover:bg-muted/30",
                          ].join(" ")}
                        >
                          {visibleCols.map((colKey) => {
                            const def = ALL_COLUMN_DEFS[colKey];
                            if (!def) return null;
                            return (
                              <TableCell key={colKey} className={def.width ?? ""}>
                                {def.cell(item)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                    {sectionExpanded.original && originalItems.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={visibleCols.length || 1}
                          className="py-4 text-center text-sm text-muted-foreground"
                        >
                          No original-only items in this view.
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Sticky totals row */}
        <div className="shrink-0 border-t bg-white dark:bg-background/95 backdrop-blur supports-backdrop-filter:bg-white/80 dark:supports-backdrop-filter:bg-background/80">
          <div className="overflow-x-auto">
            <Table>
              <TableBody>
                <TableRow className="bg-white hover:bg-white dark:bg-muted/30 dark:hover:bg-muted/30">
                  {visibleCols.map((colKey, idx) => {
                    const def = ALL_COLUMN_DEFS[colKey];
                    if (!def) return null;

                    let content: ReactNode = <span className="text-muted-foreground">—</span>;

                    if (idx === 0) {
                      content = (
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Totals ({items.length})
                        </span>
                      );
                    } else if (colKey === "quantity") {
                      content = (
                        <span className="tabular-nums text-sm font-semibold">
                          {totals.quantity.toLocaleString()}
                        </span>
                      );
                    } else if (colKey === "unitPrice") {
                      content = (
                        <span className="tabular-nums text-sm font-semibold">
                          {fmt(totals.unitPrice)}
                        </span>
                      );
                    } else if (colKey === "totalPrice") {
                      content = (
                        <span className="tabular-nums text-sm font-semibold">
                          {fmt(totals.totalPrice)}
                        </span>
                      );
                    } else if (colKey === "quantityDelivered") {
                      content = (
                        <span className="tabular-nums text-sm font-semibold">
                          {totals.quantityDelivered.toLocaleString()}
                        </span>
                      );
                    } else if (colKey === "quantityInstalled") {
                      content = (
                        <span className="tabular-nums text-sm font-semibold">
                          {totals.quantityInstalled.toLocaleString()}
                        </span>
                      );
                    } else if (colKey === "quantityCertified") {
                      content = (
                        <span className="tabular-nums text-sm font-semibold">
                          {totals.quantityCertified.toLocaleString()}
                        </span>
                      );
                    } else if (colKey === "delivery") {
                      content = (
                        <span className="tabular-nums text-sm font-semibold">
                          {totals.deliveryPct.toFixed(1)}%
                        </span>
                      );
                    } else if (colKey === "originalQuantity") {
                      content = (
                        <span className="tabular-nums text-sm font-semibold">
                          {totals.originalQuantity.toLocaleString()}
                        </span>
                      );
                    } else if (colKey === "originalUnitPrice") {
                      content = (
                        <span className="tabular-nums text-sm font-semibold">
                          {fmt(totals.originalUnitPrice)}
                        </span>
                      );
                    } else if (colKey === "revisedQuantity") {
                      content = (
                        <span className="tabular-nums text-sm font-semibold">
                          {totals.revisedQuantity.toLocaleString()}
                        </span>
                      );
                    } else if (colKey === "lateDays") {
                      content = (
                        <span className="tabular-nums text-sm font-semibold">
                          {totals.lateDays.toLocaleString()}
                        </span>
                      );
                    }

                    return (
                      <TableCell key={`totals-${colKey}`} className={def.width ?? ""}>
                        <div className="text-right">{content}</div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Edit side panel */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent
          className="h-dvh max-h-dvh w-screen sm:w-[92vw] sm:max-w-[560px] lg:max-w-[640px] flex flex-col gap-0 p-0"
          side="right"
        >
          <SheetHeader className="px-4 sm:px-6 pt-5 pb-4 shrink-0 border-b">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-sm font-semibold leading-tight line-clamp-2">
                  {selectedItem?.description ?? "Edit item"}
                </SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedItem?.poNumber} &middot; #{selectedItem?.itemNumber}
                </p>
              </div>
              {selectedItem?.isVariation && (
                <Badge variant="secondary" className="shrink-0 text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/20">
                  {selectedItem.variationOrderNumber ?? "Variation"}
                </Badge>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-4 sm:px-6 py-4 space-y-5">

              {/* ── ORIGINAL CONTRACT BASELINE (frozen / read-only) ── */}
              {selectedItem && (selectedItem.originalQuantity != null || selectedItem.originalUnitPrice != null) && (
                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Original Contract (Baseline)
                    </p>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">
                      Locked
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Qty</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {(selectedItem.originalQuantity ?? selectedItem.quantity).toLocaleString()}
                        <span className="text-muted-foreground font-normal ml-1 text-xs">{selectedItem.unit}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Unit Cost</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {fmt(selectedItem.originalUnitPrice ?? selectedItem.unitPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Total</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {fmt(
                          (selectedItem.originalQuantity ?? selectedItem.quantity) *
                          (selectedItem.originalUnitPrice ?? selectedItem.unitPrice)
                        )}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* ── AMENDMENT DELTA (when baseline exists and current differs) ── */}
              {draft && selectedItem && (selectedItem.originalQuantity != null || selectedItem.originalUnitPrice != null) && (() => {
                const origQty = selectedItem.originalQuantity ?? selectedItem.quantity;
                const origPrice = selectedItem.originalUnitPrice ?? selectedItem.unitPrice;
                const origTotal = origQty * origPrice;
                const currTotal = draft.quantity * draft.unitPrice;
                const qtyDelta = draft.quantity - origQty;
                const totalDelta = currTotal - origTotal;
                const hasChange = Math.abs(qtyDelta) > 0.001 || Math.abs(draft.unitPrice - origPrice) > 0.001;
                if (!hasChange) return null;
                const isIncrease = totalDelta > 0;
                return (
                  <div className={`rounded-lg border px-4 py-3 flex items-center gap-4 ${isIncrease ? "border-amber-500/30 bg-amber-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Amendment</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                        {Math.abs(qtyDelta) > 0.001 && (
                          <span className={qtyDelta > 0 ? "text-amber-400" : "text-blue-400"}>
                            Qty {qtyDelta > 0 ? "+" : ""}{qtyDelta.toLocaleString()} {selectedItem.unit}
                          </span>
                        )}
                        {Math.abs(draft.unitPrice - origPrice) > 0.001 && (
                          <span className={draft.unitPrice > origPrice ? "text-amber-400" : "text-blue-400"}>
                            Rate {draft.unitPrice > origPrice ? "+" : ""}{fmt(draft.unitPrice - origPrice)}/unit
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">Net change</p>
                      <p className={`text-sm font-bold tabular-nums ${isIncrease ? "text-amber-400" : "text-blue-400"}`}>
                        {isIncrease ? "+" : ""}{fmt(totalDelta)}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* ── LIVE SUMMARY CARD ── */}
              {draft && (
                <div className="rounded-lg border bg-muted/30 px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current Total</p>
                    <p className="text-base font-bold tabular-nums">{fmt(liveDraftTotal)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Delivered</p>
                    <p className={`text-base font-bold tabular-nums ${(draft.deliveryPercent ?? 0) >= 100 ? "text-emerald-400" : ""}`}>
                      {(draft.deliveryPercent ?? 0).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Certified</p>
                    <p className="text-base font-bold tabular-nums text-emerald-400">
                      {selectedItem && draft.quantity > 0
                        ? (((selectedItem.quantityCertified ?? 0) / draft.quantity) * 100).toFixed(0)
                        : "0"}%
                    </p>
                  </div>
                </div>
              )}

              {/* ── CURRENT / EDITABLE VALUES ── */}
              <section className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {selectedItem?.originalQuantity != null || selectedItem?.originalUnitPrice != null
                    ? "Current (Amended) Values"
                    : "Financials & Quantities"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs">Item number</Label>
                    <Input value={draft?.itemNumber ?? ""} onChange={(e) => setDraftField("itemNumber", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <Input value={draft?.unit ?? ""} onChange={(e) => setDraftField("unit", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Quantity
                      {selectedItem?.originalQuantity != null && (
                        <span className="ml-1.5 text-muted-foreground font-normal">
                          (orig: {selectedItem.originalQuantity.toLocaleString()})
                        </span>
                      )}
                    </Label>
                    <Input
                      type="number" min={0}
                      value={draft?.quantity ?? 0}
                      onChange={(e) => setDraftField("quantity", Number(e.target.value) || 0)}
                      className={`h-8 text-sm tabular-nums ${selectedItem?.originalQuantity != null && draft && draft.quantity !== selectedItem.originalQuantity ? "border-amber-500/60 focus-visible:ring-amber-500/30" : ""}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Unit cost (USD)
                      {selectedItem?.originalUnitPrice != null && (
                        <span className="ml-1.5 text-muted-foreground font-normal">
                          (orig: {fmt(selectedItem.originalUnitPrice)})
                        </span>
                      )}
                    </Label>
                    <Input
                      type="number" min={0}
                      value={draft?.unitPrice ?? 0}
                      onChange={(e) => setDraftField("unitPrice", Number(e.target.value) || 0)}
                      className={`h-8 text-sm tabular-nums ${selectedItem?.originalUnitPrice != null && draft && draft.unitPrice !== selectedItem.originalUnitPrice ? "border-amber-500/60 focus-visible:ring-amber-500/30" : ""}`}
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Delivery %</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} max={100} value={draft?.deliveryPercent ?? 0} onChange={(e) => setDraftField("deliveryPercent", Number(e.target.value) || 0)} className="h-8 text-sm tabular-nums flex-1" />
                      <span className="text-xs text-muted-foreground w-4">%</span>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── SCHEDULE ── */}
              <section className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Schedule</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Required by date</Label>
                    <DatePicker
                      value={parseIsoDate(draft?.requiredByDate ?? "")}
                      onChange={(date) => setDraftField("requiredByDate", date ? formatDateValue(date, "yyyy-MM-dd") : "")}
                      placeholder="yyyy/mm/dd"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Criticality</Label>
                    <Select value={draft?.criticality ?? "BUFFERED"} onValueChange={(v) => setDraftField("criticality", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUFFERED">Buffered</SelectItem>
                        <SelectItem value="JUST_IN_TIME">Just-in-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Days at risk</Label>
                    <Input type="number" min={0} value={draft?.scheduleDaysAtRisk ?? 0} onChange={(e) => setDraftField("scheduleDaysAtRisk", Number(e.target.value) || 0)} className="h-8 text-sm tabular-nums" />
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Activity ref</Label>
                    <Input value={draft?.scheduleActivityRef ?? ""} onChange={(e) => setDraftField("scheduleActivityRef", e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── DELIVERY BATCHES ── */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Delivery batches ({selectedItemBatches.length})
                  </p>
                  {selectedItem && (
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2.5" onClick={() => openCreateBatchModal(selectedItem)}>
                      + Add
                    </Button>
                  )}
                </div>
                {selectedItemBatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No delivery batches yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedItemBatches.map((batch) => (
                      <div key={batch.id} className="rounded-lg border p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium leading-snug">{batch.batchLabel}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                            {BATCH_STATUS_LABELS[batch.status] ?? batch.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>Expected: {formatDate(batch.expectedDate)}</span>
                          {batch.actualDate && <span>Actual: {formatDate(batch.actualDate)}</span>}
                          <span>{batch.quantityDelivered} / {batch.quantityExpected} units</span>
                        </div>
                        <div className="flex gap-1.5 pt-0.5">
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => selectedItem && openUpdateBatchStatusModal(selectedItem.id, batch)}>
                            Update
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => selectedItem && openDuplicateBatchModal(selectedItem.id, batch)}>
                            Duplicate
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="h-4" />
            </div>
          </ScrollArea>

          {/* Save bar */}
          <div className="shrink-0 border-t bg-background px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button onClick={saveItem} disabled={saving} className="w-full sm:flex-1">
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {selectedItem && (
              <Button variant="outline" onClick={() => markDelivered(selectedItem)} disabled={saving} className="w-full sm:w-auto text-xs">
                Mark delivered
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <BoqBatchModal
        key={batchModalSeed}
        open={batchModal.open}
        mode={batchModal.mode}
        initialValues={batchModal.initialValues}
        saving={batchSaving}
        onOpenChange={(open) => setBatchModal((prev) => ({ ...prev, open }))}
        onSubmit={submitBatchModal}
      />
    </div>
  );
}
