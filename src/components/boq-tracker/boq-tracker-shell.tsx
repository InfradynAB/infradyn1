"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format as formatDateValue } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { BoqTrackerStatus } from "@/lib/actions/boq-tracker";
import { BoqStatusBadge } from "./boq-status-badge";
import { BoqBatchModal, type BatchModalMode, type BatchStatus } from "./boq-batch-modal";

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
  discipline: string | null;
  materialClass: string | null;
  requiredByDate: string | null;
  rosDate: string | null;
  criticality: string | null;
  scheduleActivityRef: string | null;
  scheduleDaysAtRisk: number;
  status: BoqTrackerStatus;
  lateDays: number;
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load data");
    } finally {
      setLoading(false);
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
        <Button size="sm" onClick={() => window.open(`/api/boq/tracker/export?projectId=${projectId}`, "_blank")}>
          Export CSV
        </Button>
      </div>

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

      {/* Hint */}
      <p className="px-4 pb-2 text-[11px] text-muted-foreground shrink-0">
        Click any row to edit it and manage delivery batches.
      </p>

      {/* Items table — viewport-height contained */}
      <div className="mx-4 mb-4 rounded-lg border overflow-hidden flex flex-col h-[calc(100dvh-340px)] min-h-60">
        <div className="overflow-x-auto shrink-0 border-b">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-40">PO / Item #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px] text-right">Qty / Unit</TableHead>
                <TableHead className="w-[110px] text-right">Unit Cost</TableHead>
                <TableHead className="w-[110px] text-right">Total Value</TableHead>
                <TableHead className="w-20 text-right">Delivery</TableHead>
                <TableHead className="w-[110px]">Required by</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="overflow-x-auto min-h-full">
            <Table className="min-w-[760px]">
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                      {loading ? "Loading items…" : "No items match your filters."}
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => {
                  const deliveryPct = item.quantity > 0 ? (item.quantityDelivered / item.quantity) * 100 : 0;
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => openItem(item)}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/10 hover:bg-primary/10" : "hover:bg-muted/30"}`}
                    >
                      <TableCell className="w-40">
                        <p className="font-mono text-[11px] text-muted-foreground leading-none">{item.poNumber}</p>
                        <p className="font-semibold text-sm mt-0.5">#{item.itemNumber}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm leading-snug">{item.description}</p>
                        {item.materialClass && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.materialClass}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right w-[100px]">
                        <span className="tabular-nums text-sm">{item.quantity.toLocaleString()}</span>
                        <span className="text-muted-foreground text-xs ml-1">{item.unit}</span>
                      </TableCell>
                      <TableCell className="text-right w-[110px] tabular-nums text-sm text-muted-foreground">
                        {fmt(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right w-[110px] tabular-nums text-sm font-semibold">
                        {fmt(item.totalPrice)}
                      </TableCell>
                      <TableCell className="text-right w-20">
                        <span className={`tabular-nums text-sm font-bold ${deliveryPct >= 100 ? "text-emerald-400" : deliveryPct > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                          {deliveryPct.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="w-[110px] text-sm text-muted-foreground">
                        {formatDate(item.requiredByDate)}
                      </TableCell>
                      <TableCell className="w-[90px]">
                        <BoqStatusBadge status={item.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Edit side panel */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0" side="right">
          <SheetHeader className="px-6 pt-5 pb-4 shrink-0 border-b">
            <SheetTitle className="text-sm font-semibold leading-tight line-clamp-2">
              {selectedItem?.description ?? "Edit item"}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedItem?.poNumber} &middot; #{selectedItem?.itemNumber}
            </p>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-5">

              {/* Live price card */}
              {draft && (
                <div className="rounded-lg border bg-muted/30 px-4 py-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Live total</p>
                    <p className="text-base font-bold tabular-nums">{fmt(liveDraftTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Delivery %</p>
                    <p className={`text-base font-bold tabular-nums ${(draft.deliveryPercent ?? 0) >= 100 ? "text-emerald-400" : ""}`}>
                      {(draft.deliveryPercent ?? 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              {/* Financials */}
              <section className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Financials &amp; Quantities</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs">Item number</Label>
                    <Input value={draft?.itemNumber ?? ""} onChange={(e) => setDraftField("itemNumber", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <Input value={draft?.unit ?? ""} onChange={(e) => setDraftField("unit", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" min={0} value={draft?.quantity ?? 0} onChange={(e) => setDraftField("quantity", Number(e.target.value) || 0)} className="h-8 text-sm tabular-nums" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit cost (USD)</Label>
                    <Input type="number" min={0} value={draft?.unitPrice ?? 0} onChange={(e) => setDraftField("unitPrice", Number(e.target.value) || 0)} className="h-8 text-sm tabular-nums" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Delivery %</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} max={100} value={draft?.deliveryPercent ?? 0} onChange={(e) => setDraftField("deliveryPercent", Number(e.target.value) || 0)} className="h-8 text-sm tabular-nums flex-1" />
                      <span className="text-xs text-muted-foreground w-4">%</span>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Schedule */}
              <section className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Schedule</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2 space-y-1">
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
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Activity ref</Label>
                    <Input value={draft?.scheduleActivityRef ?? ""} onChange={(e) => setDraftField("scheduleActivityRef", e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Batches */}
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
          <div className="shrink-0 border-t bg-background px-6 py-3 flex items-center gap-2">
            <Button onClick={saveItem} disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {selectedItem && (
              <Button variant="outline" onClick={() => markDelivered(selectedItem)} disabled={saving} className="text-xs">
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
