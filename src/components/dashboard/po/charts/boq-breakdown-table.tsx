"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface BOQTableRow {
  id: string;
  itemNumber: string;
  description: string;
  unit: string;
  orderedQty: number;
  deliveredQty: number;
  installedQty: number;
  certifiedQty: number;
  unitPrice: number;
  totalValue: number;
  isCritical: boolean;
  status: "pending" | "partial" | "complete" | "overdue";
}

function MiniBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground w-12 text-right">
        {value}/{max}
      </span>
    </div>
  );
}

const statusConfig: Record<
  BOQTableRow["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  complete: { label: "Complete", variant: "default" },
  partial: { label: "Partial", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  overdue: { label: "Overdue", variant: "destructive" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

function reorderCols(
    arr: string[], from: string, to: string, setter: (val: string[]) => void
) {
    const next = [...arr]; const fi = next.indexOf(from); const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return; next.splice(fi, 1); next.splice(ti, 0, from); setter(next);
}

export function BOQBreakdownTable({
  items,
  searchQuery,
}: {
  items: BOQTableRow[];
  searchQuery?: string;
}) {
  const [boqCols, setBoqCols] = useState(["itemNum", "description", "unitPrice", "total", "delivered", "installed", "certified", "status"]);
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const filtered = searchQuery
    ? items.filter(
        (i) =>
          i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.itemNumber.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No BOQ items found.
      </div>
    );
  }

  const BOQ_DEF: Record<string, { label: string; cell: (item: BOQTableRow) => ReactNode }> = {
    itemNum:     { label: "#",           cell: (item) => <span className="font-mono text-muted-foreground">{item.itemNumber}{item.isCritical && <span className="ml-1 text-red-500 text-[10px]">●</span>}</span> },
    description: { label: "Description", cell: (item) => <span className="font-medium max-w-[200px] truncate block">{item.description}</span> },
    unitPrice:   { label: "Unit Price",  cell: (item) => <span className="text-right tabular-nums block">{fmt(item.unitPrice)}</span> },
    total:       { label: "Total",       cell: (item) => <span className="text-right tabular-nums font-medium block">{fmt(item.totalValue)}</span> },
    delivered:   { label: "Delivered",   cell: (item) => <MiniBar value={item.deliveredQty} max={item.orderedQty} color="#3B82F6" /> },
    installed:   { label: "Installed",   cell: (item) => <MiniBar value={item.installedQty} max={item.orderedQty} color="#8B5CF6" /> },
    certified:   { label: "Certified",   cell: (item) => <MiniBar value={item.certifiedQty} max={item.orderedQty} color="#22C55E" /> },
    status:      { label: "Status",      cell: (item) => { const cfg = statusConfig[item.status]; return <Badge variant={cfg.variant} className="text-[10px] px-1.5">{cfg.label}</Badge>; } },
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="text-[11px]">
            {boqCols.map((col) => (
              <TableHead key={col} draggable
                onDragStart={() => setDragCol(col)}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                onDragEnd={() => { reorderCols(boqCols, dragCol!, dragOverCol!, setBoqCols); setDragCol(null); setDragOverCol(null); }}
                className={["cursor-grab active:cursor-grabbing select-none", dragCol === col ? "opacity-40 bg-muted/60" : "", dragOverCol === col && dragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : ""].join(" ")}
              >
                <span className="flex items-center gap-1"><GripVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />{BOQ_DEF[col].label}</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((item) => (
            <TableRow key={item.id} className={cn("text-xs", item.isCritical && "bg-red-50/50 dark:bg-red-950/10")}>
              {boqCols.map((col) => (<TableCell key={col}>{BOQ_DEF[col].cell(item)}</TableCell>))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
