"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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

export function BOQBreakdownTable({
  items,
  searchQuery,
}: {
  items: BOQTableRow[];
  searchQuery?: string;
}) {
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

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="text-[11px]">
            <TableHead className="w-[60px]">#</TableHead>
            <TableHead className="min-w-[180px]">Description</TableHead>
            <TableHead className="text-right w-[80px]">Unit Price</TableHead>
            <TableHead className="text-right w-[90px]">Total</TableHead>
            <TableHead className="w-[160px]">Delivered</TableHead>
            <TableHead className="w-[160px]">Installed</TableHead>
            <TableHead className="w-[160px]">Certified</TableHead>
            <TableHead className="w-[90px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((item) => {
            const cfg = statusConfig[item.status];
            return (
              <TableRow
                key={item.id}
                className={cn(
                  "text-xs",
                  item.isCritical && "bg-red-50/50 dark:bg-red-950/10"
                )}
              >
                <TableCell className="font-mono text-muted-foreground">
                  {item.itemNumber}
                  {item.isCritical && (
                    <span className="ml-1 text-red-500 text-[10px]">●</span>
                  )}
                </TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {item.description}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmt(item.unitPrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {fmt(item.totalValue)}
                </TableCell>
                <TableCell>
                  <MiniBar
                    value={item.deliveredQty}
                    max={item.orderedQty}
                    color="#3B82F6"
                  />
                </TableCell>
                <TableCell>
                  <MiniBar
                    value={item.installedQty}
                    max={item.orderedQty}
                    color="#8B5CF6"
                  />
                </TableCell>
                <TableCell>
                  <MiniBar
                    value={item.certifiedQty}
                    max={item.orderedQty}
                    color="#22C55E"
                  />
                </TableCell>
                <TableCell>
                  <Badge variant={cfg.variant} className="text-[10px] px-1.5">
                    {cfg.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
