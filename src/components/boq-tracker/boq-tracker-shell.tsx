"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  GripVertical,
  Columns3,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Download,
  ArrowUpRight,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import type { BoqTrackerStatus } from "@/lib/actions/boq-tracker";
import { BoqStatusBadge } from "./boq-status-badge";
import { BoqBatchModal, type BatchModalMode, type BatchStatus } from "./boq-batch-modal";
import { exportTabularData } from "@/lib/export-engine";

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

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

// Fields that can be edited inline (matching PATCH payload)
interface RowDraft {
  quantity?: number;
  unitPrice?: number;
  deliveryPercent?: number;
  requiredByDate?: string;
  criticality?: string;
  scheduleDaysAtRisk?: number;
  scheduleActivityRef?: string;
}

interface NcrRow {
  id: string;
  ncrNumber: string;
  title: string;
  status: "OPEN" | "SUPPLIER_RESPONDED" | "REINSPECTION" | "REVIEW" | "REMEDIATION" | "CLOSED";
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  issueType: string;
  createdAt: string;
  affectedBoqItem?: { id: string; itemNumber: string; description: string } | null;
  purchaseOrder?: { poNumber: string } | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const ALL_COLUMN_DEFS: Record<string, { label: string; width?: string; cell: (item: ItemRow) => ReactNode; exportValue: (item: ItemRow) => string }> = {
  itemNumber: {
    label: "Item #",
    width: "w-[80px] max-w-[80px]",
    cell: (item) => (
      <TruncatedCell value={`#${item.itemNumber}`} className="font-semibold text-xs tabular-nums" />
    ),
    exportValue: (item) => `#${item.itemNumber}`,
  },
  poNumber: {
    label: "PO",
    width: "w-[110px] max-w-[110px]",
    cell: (item) => (
      <TruncatedCell value={item.poNumber} className="font-mono text-[10px] text-muted-foreground" />
    ),
    exportValue: (item) => item.poNumber,
  },
  // Legacy combined column — kept for backwards compat with saved views
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
    width: "w-[180px] max-w-[180px]",
    cell: (item) => {
      const isAmended = (item.originalQuantity != null && item.originalQuantity !== item.quantity) ||
                        (item.originalUnitPrice != null && item.originalUnitPrice !== item.unitPrice);
      return (
        <div className="space-y-0.5 w-[180px] max-w-[180px]">
          <div className="flex items-center gap-1 min-w-0">
            <TruncatedCell value={item.description} className="font-medium text-xs flex-1 min-w-0" />
            {item.isVariation && (
              <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">
                {item.variationOrderNumber ?? "VO"}
              </span>
            )}
            {isAmended && !item.isVariation && (
              <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                Amended
              </span>
            )}
          </div>
          {item.materialClass && (
            <p className="text-[11px] text-muted-foreground truncate">{item.materialClass}</p>
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
      const displayQty = hasBaseline ? (item.originalQuantity ?? item.quantity) : item.quantity;
      return (
        <div className="flex items-center justify-end gap-1">
          <span className="tabular-nums text-sm font-medium leading-none">{displayQty.toLocaleString()}</span>
          <span className="text-muted-foreground text-xs">{item.unit}</span>
        </div>
      );
    },
    exportValue: (item) => {
      const hasBaseline = item.originalQuantity != null && item.originalQuantity !== item.quantity;
      return `${hasBaseline ? (item.originalQuantity ?? item.quantity) : item.quantity} ${item.unit}`;
    },
  },
  newQuantity: {
    label: "New Qty / Unit",
    width: "w-[130px]",
    cell: (item) => {
      const hasBaseline = item.originalQuantity != null && item.originalQuantity !== item.quantity;
      const delta = hasBaseline ? item.quantity - (item.originalQuantity ?? 0) : 0;
      return (
        <div className="text-right space-y-0.5">
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
      const displayPrice = hasBaseline ? (item.originalUnitPrice ?? item.unitPrice) : item.unitPrice;
      return (
        <span className="tabular-nums text-sm block leading-none text-right">{fmt(displayPrice)}</span>
      );
    },
    exportValue: (item) => {
      const hasBaseline = item.originalUnitPrice != null && item.originalUnitPrice !== item.unitPrice;
      return String(hasBaseline ? (item.originalUnitPrice ?? item.unitPrice) : item.unitPrice);
    },
  },
  newUnitPrice: {
    label: "New Unit Cost",
    width: "w-[120px]",
    cell: (item) => {
      const hasBaseline = item.originalUnitPrice != null && item.originalUnitPrice !== item.unitPrice;
      const delta = hasBaseline ? item.unitPrice - (item.originalUnitPrice ?? 0) : 0;
      return (
        <div className="text-right space-y-0.5">
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
      const displayTotal = hasBaseline ? origTotal : item.totalPrice;
      return (
        <span className="tabular-nums text-sm font-semibold block leading-none text-right">{fmt(displayTotal)}</span>
      );
    },
    exportValue: (item) => {
      const origQty = item.originalQuantity ?? item.quantity;
      const origRate = item.originalUnitPrice ?? item.unitPrice;
      const hasBaseline = (item.originalQuantity != null && item.originalQuantity !== item.quantity) ||
                          (item.originalUnitPrice != null && item.originalUnitPrice !== item.unitPrice);
      return String(hasBaseline ? origQty * origRate : item.totalPrice);
    },
  },
  newTotalValue: {
    label: "New Total Value",
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
    width: "w-[100px] min-w-[100px]",
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
    width: "w-[140px] min-w-[140px]",
    cell: (item) => <span className="text-sm text-muted-foreground whitespace-nowrap tabular-nums">{formatDate(item.requiredByDate)}</span>,
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
    width: "w-[120px] min-w-[120px]",
    cell: (item) => <BoqStatusBadge status={item.status} />,
    exportValue: (item) => item.status,
  },
};

// Default visible columns
const DEFAULT_COLUMNS = ["itemNumber", "poNumber", "description", "quantity", "unitPrice", "totalPrice", "delivery", "requiredByDate", "status"];

// Editable columns in the Changed section (maps col key → draft field)
const EDITABLE_COLS: Record<string, keyof RowDraft> = {
  newQuantity: "quantity",
  newUnitPrice: "unitPrice",
  delivery: "deliveryPercent",
  requiredByDate: "requiredByDate",
  criticality: "criticality",
  scheduleDaysAtRisk: "scheduleDaysAtRisk",
  scheduleActivityRef: "scheduleActivityRef",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function reorderCols(arr: string[], from: string, to: string, setter: (val: string[]) => void) {
  const next = [...arr];
  const fi = next.indexOf(from);
  const ti = next.indexOf(to);
  if (fi < 0 || ti < 0) return;
  next.splice(fi, 1);
  next.splice(ti, 0, from);
  setter(next);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toISOString().slice(0, 10);
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

// Merge draft edits into an ItemRow and recompute totalPrice live
function liveRow(item: ItemRow, draft: RowDraft | undefined): ItemRow {
  if (!draft) return item;
  const qty = draft.quantity ?? item.quantity;
  const price = draft.unitPrice ?? item.unitPrice;
  const deliveryPct = draft.deliveryPercent ?? (item.quantity > 0 ? (item.quantityDelivered / item.quantity) * 100 : 0);
  const quantityDelivered = item.quantity > 0 ? Math.round((deliveryPct / 100) * qty) : item.quantityDelivered;
  return {
    ...item,
    quantity: qty,
    unitPrice: price,
    totalPrice: qty * price,
    quantityDelivered,
    requiredByDate: draft.requiredByDate !== undefined ? (draft.requiredByDate || null) : item.requiredByDate,
    criticality: draft.criticality ?? item.criticality,
    scheduleDaysAtRisk: draft.scheduleDaysAtRisk ?? item.scheduleDaysAtRisk,
    scheduleActivityRef: draft.scheduleActivityRef !== undefined ? (draft.scheduleActivityRef || null) : item.scheduleActivityRef,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUNCATED CELL — truncates text, double-click opens full-value popover
// ─────────────────────────────────────────────────────────────────────────────

function TruncatedCell({ value, className = "" }: { value: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          className={`block truncate overflow-hidden cursor-default select-text w-full max-w-full ${className}`}
          onDoubleClick={(e) => { e.stopPropagation(); setOpen(true); }}
          title="Double-click to expand"
        >
          {value}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="max-w-xs text-sm wrap-break-word p-3"
        side="bottom"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {value}
      </PopoverContent>
    </Popover>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDITABLE CELL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface EditableCellProps {
  item: ItemRow;
  colKey: string;
  draft: RowDraft | undefined;
  isActive: boolean;
  isSaving: boolean;
  onActivate: () => void;
  onChange: (field: keyof RowDraft, value: string | number) => void;
  onCommit: () => void;
  onDiscard: () => void;
  onKeyNav: (e: React.KeyboardEvent) => void;
}

function EditableCell({
  item,
  colKey,
  draft,
  isActive,
  isSaving,
  onActivate,
  onChange,
  onCommit,
  onDiscard,
  onKeyNav,
}: EditableCellProps) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const draftField = EDITABLE_COLS[colKey];

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isActive]);

  if (!draftField) {
    // Not an editable column — render read-only
    const def = ALL_COLUMN_DEFS[colKey];
    return <>{def?.cell(item)}</>;
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); onCommit(); }
    else if (e.key === "Escape") { e.preventDefault(); onDiscard(); }
    else { onKeyNav(e); }
  };

  const handleBlur = () => {
    // Small delay so Tab can move to next cell before commit fires
    setTimeout(() => onCommit(), 80);
  };

  if (isSaving) {
    return (
      <div className="flex items-center justify-center h-7">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── DISPLAY MODE ──
  if (!isActive) {
    const def = ALL_COLUMN_DEFS[colKey];
    return (
      <div
        className="min-h-[28px] flex items-center cursor-cell group relative"
        onClick={(e) => { e.stopPropagation(); onActivate(); }}
      >
        {def?.cell(item)}
        <span className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 ring-1 ring-inset ring-primary/30 pointer-events-none transition-opacity" />
      </div>
    );
  }

  // ── EDIT MODE ──
  const baseInputClass = "h-7 w-full text-sm tabular-nums border-0 rounded px-1.5 bg-primary/5 ring-2 ring-primary focus:outline-none focus:ring-2 focus:ring-primary";

  if (draftField === "criticality") {
    const val = draft?.criticality ?? item.criticality ?? "BUFFERED";
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={val}
        onChange={(e) => onChange("criticality", e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${baseInputClass} cursor-pointer`}
      >
        <option value="BUFFERED">Buffered</option>
        <option value="JUST_IN_TIME">JIT</option>
      </select>
    );
  }

  if (draftField === "requiredByDate") {
    const val = draft?.requiredByDate ?? (item.requiredByDate ? formatDate(item.requiredByDate) : "");
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="date"
        value={val === "—" ? "" : val}
        onChange={(e) => onChange("requiredByDate", e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={baseInputClass}
      />
    );
  }

  if (draftField === "scheduleActivityRef") {
    const val = draft?.scheduleActivityRef ?? item.scheduleActivityRef ?? "";
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={val}
        onChange={(e) => onChange("scheduleActivityRef", e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={baseInputClass}
      />
    );
  }

  // Number fields: quantity, unitPrice, deliveryPercent, scheduleDaysAtRisk
  let numVal: number;
  if (draftField === "quantity") numVal = draft?.quantity ?? item.quantity;
  else if (draftField === "unitPrice") numVal = draft?.unitPrice ?? item.unitPrice;
  else if (draftField === "deliveryPercent") numVal = draft?.deliveryPercent ?? (item.quantity > 0 ? (item.quantityDelivered / item.quantity) * 100 : 0);
  else numVal = draft?.scheduleDaysAtRisk ?? item.scheduleDaysAtRisk;

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="number"
      min={0}
      max={draftField === "deliveryPercent" ? 100 : undefined}
      step={draftField === "unitPrice" ? "0.01" : "1"}
      value={numVal}
      onChange={(e) => onChange(draftField, parseFloat(e.target.value) || 0)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={baseInputClass}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function BoqTrackerShell({ projectId }: Props) {
  // ── Drag-to-scroll ──
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const dragScroll = useRef({ active: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

  const handleTableMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = tableScrollRef.current;
    if (!el) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, [role='checkbox'], [draggable='true']")) return;
    dragScroll.current = { active: true, startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }, []);

  const handleTableMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragScroll.current.active) return;
    const el = tableScrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragScroll.current.startX;
    const dy = e.clientY - dragScroll.current.startY;
    el.scrollLeft = dragScroll.current.scrollLeft - dx;
    el.scrollTop = dragScroll.current.scrollTop - dy;
  }, []);

  const handleTableMouseUp = useCallback(() => {
    dragScroll.current.active = false;
    const el = tableScrollRef.current;
    if (!el) return;
    el.style.cursor = "";
    el.style.userSelect = "";
  }, []);

  // ── Data ──
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

  // ── Inline editing state ──
  const [edits, setEdits] = useState<Map<string, RowDraft>>(new Map());
  const [activeCell, setActiveCell] = useState<{ id: string; col: string } | null>(null);
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());

  // ── Column management ──
  function migrateSavedCols(cols: string[]): string[] {
    const result: string[] = [];
    for (const c of cols) {
      if (c === "poItem") {
        if (!result.includes("itemNumber")) result.push("itemNumber");
        if (!result.includes("poNumber")) result.push("poNumber");
      } else {
        result.push(c);
      }
    }
    return result;
  }

  const [savedCustomCols, setSavedCustomCols] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_COLUMNS;
    try {
      const raw = window.localStorage.getItem("boq-tracker-custom-view-v1");
      if (!raw) return DEFAULT_COLUMNS;
      return migrateSavedCols(JSON.parse(raw) as string[]);
    } catch { return DEFAULT_COLUMNS; }
  });
  const [visibleCols, setVisibleCols] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_COLUMNS;
    try {
      const raw = window.localStorage.getItem("boq-tracker-custom-view-v1");
      if (!raw) return DEFAULT_COLUMNS;
      return migrateSavedCols(JSON.parse(raw) as string[]);
    } catch { return DEFAULT_COLUMNS; }
  });
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [showViewExplanation, setShowViewExplanation] = useState(false);
  const [sectionExpanded, setSectionExpanded] = useState({ changed: true, original: true });

  // ── Batch modal ──
  const [batchModal, setBatchModal] = useState<BatchModalState>({ open: false, mode: "create", itemId: "" });
  const [batchModalSeed, setBatchModalSeed] = useState(0);
  const [batchSaving, setBatchSaving] = useState(false);

  // ── Load data ──
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

      // Clear edits on reload
      setEdits(new Map());
      setActiveCell(null);

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

  useEffect(() => { loadData(); }, [loadData]);

  const batchMap = useMemo(() => {
    const map = new Map<string, BatchRow[]>();
    for (const batch of batches) {
      const list = map.get(batch.boqItemId) ?? [];
      list.push(batch);
      map.set(batch.boqItemId, list);
    }
    return map;
  }, [batches]);

  // ── Live items (merges edits into display) ──
  const liveItems = useMemo(() => {
    return items.map((item) => liveRow(item, edits.get(item.id)));
  }, [items, edits]);

  const livePoValue = useMemo(() => liveItems.reduce((sum, item) => sum + item.totalPrice, 0), [liveItems]);
  const liveDelivery = useMemo(() => {
    const totalQty = liveItems.reduce((s, i) => s + i.quantity, 0);
    const totalDel = liveItems.reduce((s, i) => s + i.quantityDelivered, 0);
    return totalQty > 0 ? (totalDel / totalQty) * 100 : 0;
  }, [liveItems]);
  const lateCount = useMemo(() => liveItems.filter((i) => i.status === "LATE").length, [liveItems]);

  const isChangedItem = useCallback((item: ItemRow) => {
    const isAmended =
      (item.originalQuantity != null && item.originalQuantity !== item.quantity) ||
      (item.originalUnitPrice != null && item.originalUnitPrice !== item.unitPrice);
    return item.isVariation || isAmended;
  }, []);

  const changedItems = useMemo(() => liveItems.filter(isChangedItem), [liveItems, isChangedItem]);
  const originalItems = useMemo(() => liveItems.filter((item) => !isChangedItem(item)), [liveItems, isChangedItem]);

  // Expand qty/price columns to show original + new side by side (shared by both sections)
  const SECTION_EXPAND_MAP: Record<string, string[]> = {
    quantity: ["quantity", "newQuantity"],
    unitPrice: ["unitPrice", "newUnitPrice"],
    totalPrice: ["totalPrice", "newTotalValue"],
  };

  const changedSectionCols = useMemo(() => {
    const result: string[] = [];
    for (const col of visibleCols) {
      if (SECTION_EXPAND_MAP[col]) result.push(...SECTION_EXPAND_MAP[col]);
      else result.push(col);
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCols]);

  const originalSectionCols = changedSectionCols; // same expansion

  // All editable cols present in the current changed section view (for Tab nav)
  const editableColsInView = useMemo(
    () => changedSectionCols.filter((c) => c in EDITABLE_COLS),
    [changedSectionCols],
  );

  const totals = useMemo(() => {
    const quantity = liveItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = liveItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const quantityDelivered = liveItems.reduce((sum, item) => sum + item.quantityDelivered, 0);
    const lateDays = liveItems.reduce((sum, item) => sum + item.lateDays, 0);
    const deliveryPct = quantity > 0 ? (quantityDelivered / quantity) * 100 : 0;
    return { quantity, totalPrice, quantityDelivered, lateDays, deliveryPct };
  }, [liveItems]);

  // ── Inline edit handlers ──
  const handleCellChange = useCallback((itemId: string, field: keyof RowDraft, value: string | number) => {
    setEdits((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId) ?? {};
      next.set(itemId, { ...existing, [field]: value });
      return next;
    });
  }, []);

  const saveRowField = useCallback(async (itemId: string) => {
    const draft = edits.get(itemId);
    if (!draft || Object.keys(draft).length === 0) {
      setActiveCell(null);
      return;
    }

    setSavingRows((prev) => new Set(prev).add(itemId));
    setActiveCell(null);

    try {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const body: Record<string, unknown> = {};
      if (draft.quantity !== undefined) body.quantity = draft.quantity;
      if (draft.unitPrice !== undefined) body.unitPrice = draft.unitPrice;
      if (draft.deliveryPercent !== undefined) body.deliveryPercent = draft.deliveryPercent;
      if (draft.requiredByDate !== undefined) body.requiredByDate = draft.requiredByDate || null;
      if (draft.criticality !== undefined) body.criticality = draft.criticality;
      if (draft.scheduleDaysAtRisk !== undefined) body.scheduleDaysAtRisk = draft.scheduleDaysAtRisk;
      if (draft.scheduleActivityRef !== undefined) body.scheduleActivityRef = draft.scheduleActivityRef || null;

      const res = await fetch(`/api/boq/tracker/${itemId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Failed to save");
        return;
      }

      // Update items array in place (no full reload)
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== itemId) return i;
          return liveRow(i, draft);
        }),
      );
      // Clear draft for this row
      setEdits((prev) => {
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });
    } catch {
      toast.error("Network error — changes not saved");
    } finally {
      setSavingRows((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, [edits, items]);

  const discardRowEdit = useCallback((itemId: string) => {
    setEdits((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
    setActiveCell(null);
  }, []);

  // Keyboard navigation: Tab/Shift+Tab moves between editable cells in the same row
  const handleCellKeyNav = useCallback((e: React.KeyboardEvent, itemId: string, colKey: string) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const idx = editableColsInView.indexOf(colKey);
    if (idx === -1) return;
    const next = e.shiftKey ? idx - 1 : idx + 1;
    if (next >= 0 && next < editableColsInView.length) {
      setActiveCell({ id: itemId, col: editableColsInView[next] });
    }
  }, [editableColsInView]);

  // ── Batch modal helpers ──
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

  // ── View explanation ──
  const viewExplanation = useMemo(() => {
    const disciplineText = discipline !== "ALL" ? ` filtered by ${discipline}` : "";
    const statusText = statusFilter !== "ALL" ? `, status: ${statusFilter}` : "";
    const searchText = search.trim() ? `, search: "${search.trim()}"` : "";
    const isSaved = JSON.stringify(visibleCols) === JSON.stringify(savedCustomCols);
    const viewType = isSaved ? "custom saved view" : "current view";
    return `You are viewing BOQ items in ${viewType}${disciplineText}${statusText}${searchText}. ${liveItems.length.toLocaleString()} item(s) visible across ${visibleCols.length} column(s).`;
  }, [discipline, statusFilter, search, visibleCols, savedCustomCols, liveItems.length]);

  function saveCustomView() {
    setSavedCustomCols(visibleCols);
    try {
      window.localStorage.setItem("boq-tracker-custom-view-v1", JSON.stringify(visibleCols));
      toast.success("Custom view saved");
    } catch { toast.error("Failed to save view"); }
  }

  async function handleExport(format: "csv" | "excel" | "pdf") {
    const exportCols = visibleCols
      .filter((k) => k !== "poItem")
      .map((k) => ({ key: k, label: ALL_COLUMN_DEFS[k]?.label ?? k }));

    const hasPo = exportCols.some((c) => c.key === "poNumber");
    const hasItem = exportCols.some((c) => c.key === "itemNumber");
    const allExportCols = [
      ...(!hasItem ? [{ key: "itemNumber", label: "Item #" }] : []),
      ...(!hasPo ? [{ key: "poNumber", label: "PO" }] : []),
      ...exportCols,
    ];

    const rows = liveItems.map((item) => {
      const row: Record<string, string> = {};
      for (const col of allExportCols) {
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

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* KPI bar */}
      <div className="grid grid-cols-1 gap-3 px-3 pt-3 sm:grid-cols-2 sm:px-4 lg:grid-cols-4 shrink-0">
        <div className="min-w-0 rounded-lg border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">PO Value</p>
          <p className="text-xl font-bold tabular-nums">{fmt(livePoValue)}</p>
        </div>
        <div className="min-w-0 rounded-lg border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Delivery</p>
          <p className="text-xl font-bold tabular-nums">{liveDelivery.toFixed(1)}%</p>
        </div>
        <div className="min-w-0 rounded-lg border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Items</p>
          <p className="text-xl font-bold tabular-nums">{liveItems.length}</p>
        </div>
        <div className={`min-w-0 rounded-lg border px-4 py-3 ${lateCount > 0 ? "border-red-500/30 bg-red-500/5" : "bg-card"}`}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Late items</p>
          <p className={`text-xl font-bold tabular-nums ${lateCount > 0 ? "text-red-400" : ""}`}>{lateCount}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-stretch gap-2 px-3 sm:px-4 shrink-0">
        <Select value={discipline} onValueChange={(v) => { setDiscipline(v); setMaterialClass("ALL"); }}>
          <SelectTrigger className="h-8 w-full text-sm sm:w-[170px]">
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
            <SelectTrigger className="h-8 w-full text-sm sm:w-[170px]">
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
          <SelectTrigger className="h-8 w-full text-sm sm:w-[140px]">
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
          className="h-8 w-full text-sm sm:min-w-[220px] sm:flex-1 lg:min-w-[280px]"
        />

        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={loadData} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>

        {/* Column picker */}
        <Popover open={colPickerOpen} onOpenChange={setColPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-1.5 sm:w-auto">
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
                {Object.entries(ALL_COLUMN_DEFS).filter(([key]) => key !== "poItem").map(([key, def]) => {
                  const isVisible = visibleCols.includes(key);
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 rounded px-2 py-1.5 cursor-pointer hover:bg-muted/60 transition-colors"
                    >
                      <Checkbox
                        checked={isVisible}
                        onCheckedChange={(checked) => {
                          if (checked) setVisibleCols((prev) => [...prev, key]);
                          else setVisibleCols((prev) => prev.filter((k) => k !== key));
                        }}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-sm">{def.label}</span>
                      {key in EDITABLE_COLS && (
                        <span className="ml-auto text-[9px] text-emerald-500 font-semibold uppercase tracking-wide">editable</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
            <Separator className="my-2" />
            <div className="flex gap-1.5 px-2">
              <Button variant="ghost" size="sm" className="h-6 text-xs flex-1"
                onClick={() => setVisibleCols(Object.keys(ALL_COLUMN_DEFS).filter((k) => k !== "poItem"))}>
                Select all
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs flex-1"
                onClick={() => setVisibleCols(DEFAULT_COLUMNS)}>
                Reset
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          className={`w-full sm:w-auto ${showViewExplanation ? "bg-muted" : ""}`}
          onClick={() => setShowViewExplanation((v) => !v)}
        >
          Explain View
        </Button>

        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={saveCustomView}>
          Save Custom View
        </Button>

        <Button
          variant="outline"
          size="sm"
          className={`w-full sm:w-auto ${showProjectNcrs ? "bg-muted" : ""}`}
          onClick={() => setShowProjectNcrs((prev) => !prev)}
        >
          NCRs ({projectNcrs.length})
        </Button>

        {/* Export dropdown */}
        <DropdownMenu open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="w-full gap-1.5 sm:w-auto">
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
        <div className="mx-3 rounded-lg border bg-muted/20 px-4 py-2.5 text-sm text-muted-foreground sm:mx-4 shrink-0">
          {viewExplanation}
        </div>
      )}

      {/* Discipline pills */}
      {disciplineSummary.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-1 sm:flex-wrap sm:px-4 shrink-0">
          <button
            onClick={() => { setDiscipline("ALL"); setMaterialClass("ALL"); }}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors
              ${discipline === "ALL" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
          >
            All
          </button>
          {disciplineSummary.map((row) => (
            <button
              key={row.discipline}
              onClick={() => { setDiscipline(row.discipline); setMaterialClass("ALL"); }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors
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
      <div className="mx-3 flex shrink-0 flex-col gap-2 rounded-lg border bg-muted/10 px-3 py-2 sm:mx-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-[11px] leading-relaxed text-muted-foreground sm:max-w-xl">
          Click a cell in the <strong>Changed / Updated</strong> section to edit inline. Tab to move between cells. Enter to confirm, Esc to cancel.
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-sm border-l-2 border-l-amber-500/60 bg-amber-500/10" />
            Amended
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-sm border-l-2 border-l-violet-500/60 bg-violet-500/10" />
            Variation order
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-amber-500/80">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500/10 border border-amber-500/30" />
            New value column (Changed section)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-muted/40 border border-border" />
            Click cell to edit · Double-click text to expand
          </span>
        </div>
      </div>

      {/* Project NCR panel */}
      <div className="mx-3 rounded-lg border overflow-hidden sm:mx-4 shrink-0">
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
                      onClick={() => { window.location.href = `/dashboard/procurement/ncr/${ncrItem.id}`; }}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{ncrItem.ncrNumber} - {ncrItem.title}</p>
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

      {/* Items table — single scroll container */}
      <div className="mx-3 mb-4 flex min-h-[420px] flex-col rounded-lg border bg-white text-foreground sm:mx-4 dark:bg-background h-[60dvh] lg:h-[calc(100dvh-370px)] overflow-hidden">
        <div
          ref={tableScrollRef}
          className="flex-1 overflow-auto overscroll-contain cursor-grab active:cursor-grabbing"
          onMouseDown={handleTableMouseDown}
          onMouseMove={handleTableMouseMove}
          onMouseUp={handleTableMouseUp}
          onMouseLeave={handleTableMouseUp}
        >
          <div className="pl-4 pr-24">
          <Table>
            {/* Sticky header */}
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-white hover:bg-white dark:bg-muted/40 dark:hover:bg-muted/40 shadow-[0_1px_0_0_hsl(var(--border))]">
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
                        "cursor-grab active:cursor-grabbing select-none bg-white dark:bg-muted/40",
                        dragCol === colKey ? "opacity-40 bg-muted/60" : "",
                        dragOverCol === colKey && dragCol !== colKey ? "bg-primary/15 border-l-2 border-l-primary" : "",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-1">
                        <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        {def.label}
                      </span>
                    </TableHead>
                  );
                })}
                {/* Actions column header */}
                <TableHead className="w-[72px] min-w-[72px] bg-white dark:bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Batches
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {liveItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleCols.length + 1} className="py-16 text-center text-muted-foreground">
                    {loading ? "Loading items…" : "No items match your filters."}
                  </TableCell>
                </TableRow>
              )}

              {liveItems.length > 0 && (
                <>
                  {/* ── ORIGINAL section (editable) ── */}
                  <TableRow
                    className="cursor-pointer bg-muted/20 hover:bg-muted/30"
                    onClick={() => setSectionExpanded((prev) => ({ ...prev, original: !prev.original }))}
                  >
                    <TableCell colSpan={originalSectionCols.length + 1} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${sectionExpanded.original ? "" : "-rotate-90"}`} />
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Original</span>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{originalItems.length.toLocaleString()} item(s)</span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Sub-header for original section */}
                  {sectionExpanded.original && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      {originalSectionCols.map((colKey) => {
                        const def = ALL_COLUMN_DEFS[colKey];
                        if (!def) return null;
                        const isNewCol = colKey === "newQuantity" || colKey === "newUnitPrice" || colKey === "newTotalValue";
                        const isEditableCol = colKey in EDITABLE_COLS;
                        return (
                          <TableHead
                            key={`orig-hdr-${colKey}`}
                            className={[
                              def.width ?? "",
                              "text-[10px] font-bold uppercase tracking-wider py-1.5",
                              isNewCol
                                ? "text-amber-500 bg-amber-500/5"
                                : isEditableCol
                                  ? "text-emerald-600 dark:text-emerald-400 bg-white dark:bg-background"
                                  : "text-muted-foreground bg-muted/40",
                            ].join(" ")}
                          >
                            {def.label}
                            {isEditableCol && <span className="ml-0.5 text-[8px] opacity-70">✎</span>}
                          </TableHead>
                        );
                      })}
                      <TableHead className="w-[72px] min-w-[72px] text-[10px] text-muted-foreground uppercase tracking-wider py-1.5 bg-muted/40">
                        Batches
                      </TableHead>
                    </TableRow>
                  )}

                  {sectionExpanded.original && originalItems.map((item) => {
                    const row = liveRow(item, edits.get(item.id));
                    const isSaving = savingRows.has(item.id);
                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-muted/10 transition-colors"
                      >
                        {originalSectionCols.map((colKey) => {
                          const def = ALL_COLUMN_DEFS[colKey];
                          if (!def) return null;
                          const isNewCol = colKey === "newQuantity" || colKey === "newUnitPrice" || colKey === "newTotalValue";
                          const isEditableCol = colKey in EDITABLE_COLS;
                          const isActivated = activeCell?.id === item.id && activeCell?.col === colKey;
                          return (
                            <TableCell
                              key={colKey}
                              className={[
                                def.width ?? "",
                                "p-1.5",
                                isEditableCol
                                  ? "bg-white dark:bg-background cursor-cell"
                                  : isNewCol
                                    ? "bg-amber-500/5"
                                    : "bg-muted/40 cursor-default",
                                isActivated ? "ring-2 ring-inset ring-primary/60" : "",
                              ].join(" ")}
                              onClick={() => {
                                if (isEditableCol) setActiveCell({ id: item.id, col: colKey });
                              }}
                            >
                              {isEditableCol ? (
                                <EditableCell
                                  item={row}
                                  colKey={colKey}
                                  draft={edits.get(item.id)}
                                  isActive={isActivated}
                                  isSaving={isSaving}
                                  onActivate={() => setActiveCell({ id: item.id, col: colKey })}
                                  onChange={(field, value) => {
                                    setEdits((prev) => {
                                      const next = new Map(prev);
                                      next.set(item.id, { ...(prev.get(item.id) ?? {}), [field]: value });
                                      return next;
                                    });
                                  }}
                                  onCommit={() => saveRowField(item.id)}
                                  onDiscard={() => discardRowEdit(item.id)}
                                  onKeyNav={(e) => handleCellKeyNav(e, item.id, colKey)}
                                />
                              ) : (
                                def.cell(row)
                              )}
                            </TableCell>
                          );
                        })}
                        {/* Actions for original rows — same batch dropdown as Changed section */}
                        <TableCell className="w-[72px] min-w-[72px] p-1 text-center bg-muted/40">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 border border-border bg-background p-0 text-foreground opacity-100 hover:bg-muted"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => openCreateBatchModal(row)}>
                                + Add delivery batch
                              </DropdownMenuItem>
                              {(batchMap.get(item.id) ?? []).length > 0 && <DropdownMenuSeparator />}
                              {(batchMap.get(item.id) ?? []).map((batch) => (
                                <DropdownMenuItem key={batch.id} onClick={() => openUpdateBatchStatusModal(item.id, batch)}>
                                  Update: {batch.batchLabel}
                                </DropdownMenuItem>
                              ))}
                              {(batchMap.get(item.id) ?? []).length > 0 && (
                                <>
                                  <DropdownMenuSeparator />
                                  {(batchMap.get(item.id) ?? []).map((batch) => (
                                    <DropdownMenuItem key={`dup-${batch.id}`} onClick={() => openDuplicateBatchModal(item.id, batch)}>
                                      Duplicate: {batch.batchLabel}
                                    </DropdownMenuItem>
                                  ))}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {(batchMap.get(item.id)?.length ?? 0) > 0 && (
                            <div className="mt-0.5 flex justify-center">
                              <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums font-medium text-muted-foreground">
                                {batchMap.get(item.id)!.length}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {sectionExpanded.original && originalItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={originalSectionCols.length + 1} className="py-4 text-center text-sm text-muted-foreground">
                        No original-only items in this view.
                      </TableCell>
                    </TableRow>
                  )}

                  {/* ── CHANGED / UPDATED section (editable) ── */}
                  <TableRow
                    className="cursor-pointer bg-violet-500/5 hover:bg-violet-500/10"
                    onClick={() => setSectionExpanded((prev) => ({ ...prev, changed: !prev.changed }))}
                  >
                    <TableCell colSpan={changedSectionCols.length + 1} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${sectionExpanded.changed ? "" : "-rotate-90"}`} />
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Changed / Updated</span>
                          <span className="text-[10px] text-emerald-500/80 font-normal normal-case tracking-normal">click any cell to edit</span>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{changedItems.length.toLocaleString()} item(s)</span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Sub-header for changed section columns */}
                  {sectionExpanded.changed && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      {changedSectionCols.map((colKey) => {
                        const def = ALL_COLUMN_DEFS[colKey];
                        if (!def) return null;
                        const isNewCol = colKey === "newQuantity" || colKey === "newUnitPrice" || colKey === "newTotalValue";
                        const isEditableCol = colKey in EDITABLE_COLS;
                        return (
                          <TableHead
                            key={`changed-hdr-${colKey}`}
                            className={[
                              def.width ?? "",
                              "text-[10px] font-bold uppercase tracking-wider py-1.5",
                              isNewCol
                                ? "text-amber-500 bg-amber-500/5"
                                : isEditableCol
                                  ? "text-emerald-600 dark:text-emerald-400 bg-white dark:bg-background"
                                  : "text-muted-foreground bg-muted/40",
                            ].join(" ")}
                          >
                            {def.label}
                            {isEditableCol && <span className="ml-0.5 text-[8px] opacity-70">✎</span>}
                          </TableHead>
                        );
                      })}
                      <TableHead className="w-[72px] min-w-[72px] text-[10px] text-muted-foreground uppercase tracking-wider py-1.5">
                        Batches
                      </TableHead>
                    </TableRow>
                  )}

                  {sectionExpanded.changed && changedItems.map((item) => {
                    const isVariationRow = item.isVariation;
                    const isAmended = (item.originalQuantity != null && item.originalQuantity !== item.quantity) ||
                                      (item.originalUnitPrice != null && item.originalUnitPrice !== item.unitPrice);
                    const isSaving = savingRows.has(item.id);
                    const itemBatches = batchMap.get(item.id) ?? [];

                    return (
                      <TableRow
                        key={item.id}
                        className={[
                          "transition-colors",
                          isVariationRow
                            ? "bg-violet-500/5 hover:bg-violet-500/10 border-l-2 border-l-violet-500/40"
                            : isAmended
                              ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500/40"
                              : "hover:bg-slate-50 dark:hover:bg-muted/30",
                        ].join(" ")}
                      >
                        {changedSectionCols.map((colKey) => {
                          const def = ALL_COLUMN_DEFS[colKey];
                          if (!def) return null;
                          const isNewCol = colKey === "newQuantity" || colKey === "newUnitPrice" || colKey === "newTotalValue";
                          const isEditableCol = colKey in EDITABLE_COLS;
                          const isActiveCellHere = activeCell?.id === item.id && activeCell?.col === colKey;

                          return (
                            <TableCell
                              key={colKey}
                              className={[
                                def.width ?? "",
                                "p-1.5",
                                isEditableCol
                                  ? "bg-white dark:bg-background cursor-cell"
                                  : isNewCol
                                    ? "bg-amber-500/5"
                                    : "bg-muted/40 cursor-default",
                              ].join(" ")}
                            >
                              {isEditableCol ? (
                                <EditableCell
                                  item={item}
                                  colKey={colKey}
                                  draft={edits.get(item.id)}
                                  isActive={isActiveCellHere}
                                  isSaving={isSaving}
                                  onActivate={() => setActiveCell({ id: item.id, col: colKey })}
                                  onChange={(field, value) => handleCellChange(item.id, field, value)}
                                  onCommit={() => saveRowField(item.id)}
                                  onDiscard={() => discardRowEdit(item.id)}
                                  onKeyNav={(e) => handleCellKeyNav(e, item.id, colKey)}
                                />
                              ) : (
                                def.cell(item)
                              )}
                            </TableCell>
                          );
                        })}

                        {/* Actions cell — batches button */}
                        <TableCell className="w-[72px] min-w-[72px] p-1 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 border border-border bg-background p-0 text-foreground opacity-100 hover:bg-muted"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => openCreateBatchModal(item)}>
                                + Add delivery batch
                              </DropdownMenuItem>
                              {itemBatches.length > 0 && <DropdownMenuSeparator />}
                              {itemBatches.map((batch) => (
                                <DropdownMenuItem key={batch.id} onClick={() => openUpdateBatchStatusModal(item.id, batch)}>
                                  Update: {batch.batchLabel}
                                </DropdownMenuItem>
                              ))}
                              {itemBatches.length > 0 && (
                                <>
                                  <DropdownMenuSeparator />
                                  {itemBatches.map((batch) => (
                                    <DropdownMenuItem key={`dup-${batch.id}`} onClick={() => openDuplicateBatchModal(item.id, batch)}>
                                      Duplicate: {batch.batchLabel}
                                    </DropdownMenuItem>
                                  ))}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {itemBatches.length > 0 && (
                            <div className="mt-0.5 flex justify-center">
                              <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums font-medium text-muted-foreground">
                                {itemBatches.length}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {sectionExpanded.changed && changedItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={changedSectionCols.length + 1} className="py-4 text-center text-sm text-muted-foreground">
                        No changed or updated items in this view.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>

            {/* Sticky totals footer */}
            <tfoot className="sticky bottom-0 z-10">
              <tr className="bg-white dark:bg-background border-t border-border shadow-[0_-1px_0_0_hsl(var(--border))]">
                {visibleCols.map((colKey, idx) => {
                  const def = ALL_COLUMN_DEFS[colKey];
                  if (!def) return null;
                  let content: ReactNode = null;
                  if (idx === 0) {
                    content = <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Totals ({liveItems.length})</span>;
                  } else if (colKey === "totalPrice") {
                    content = <span className="tabular-nums text-sm font-semibold">{fmt(totals.totalPrice)}</span>;
                  } else if (colKey === "delivery") {
                    content = <span className="tabular-nums text-sm font-semibold">{totals.deliveryPct.toFixed(1)}%</span>;
                  } else if (colKey === "lateDays") {
                    content = <span className="tabular-nums text-sm font-semibold">{totals.lateDays.toLocaleString()}</span>;
                  }
                  return (
                    <td key={`totals-${colKey}`} className={`px-4 py-3 ${def.width ?? ""}`}>
                      <div className="text-right">{content}</div>
                    </td>
                  );
                })}
                <td className="w-[72px] min-w-[72px]" />
              </tr>
            </tfoot>
          </Table>
          </div>
        </div>

        {/* Bottom scroll navigation */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-t bg-muted/10 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Scroll left"
              className="inline-flex items-center justify-center h-6 w-6 rounded border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              onClick={() => {
                const el = tableScrollRef.current;
                if (el) el.scrollBy({ left: -240, behavior: "smooth" });
              }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              className="inline-flex items-center justify-center h-6 w-6 rounded border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              onClick={() => {
                const el = tableScrollRef.current;
                if (el) el.scrollBy({ left: 240, behavior: "smooth" });
              }}
            >
              ›
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground select-none">
            {liveItems.length.toLocaleString()} item{liveItems.length !== 1 ? "s" : ""} · drag table or use arrows to scroll
          </span>
        </div>
      </div>

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
