"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, DotsSixVertical } from "@phosphor-icons/react";
import {
    SectionHeader, ViewToggle, StatusPill,
    mockKPIs, mockPOs, mockPOStatus, fmt,
} from "@/components/dashboard/supplier/analytics-shared";
import { useAnalyticsFilters } from "@/components/dashboard/supplier/analytics-shell";
import { POStatusRadial } from "@/components/dashboard/supplier/charts/po-status-radial";

function reorderCols(
    arr: string[], from: string, to: string, setter: (val: string[]) => void
) {
    const next = [...arr]; const fi = next.indexOf(from); const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return; next.splice(fi, 1); next.splice(ti, 0, from); setter(next);
}

export default function OrdersPage() {
    const kpis = mockKPIs();
    const pos = mockPOs();
    const poStatus = mockPOStatus();
    const { searchQuery, projectFilter, statusFilter } = useAnalyticsFilters();
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
    const toggleView = useCallback((_s: string, mode: "chart" | "table") => setViewMode(mode), []);
    const [ordCols, setOrdCols] = useState(["poNumber", "project", "value", "status", "progress", "date"]);
    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const filteredPOs = useMemo(() => {
        let items = pos;
        if (searchQuery) items = items.filter(p => p.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) || p.project.toLowerCase().includes(searchQuery.toLowerCase()));
        if (projectFilter !== "all") items = items.filter(p => p.project === projectFilter);
        if (statusFilter !== "all") items = items.filter(p => p.status.toLowerCase() === statusFilter);
        return items;
    }, [pos, searchQuery, projectFilter, statusFilter]);

    const ORD_DEF: Record<string, { label: string; cell: (po: (typeof filteredPOs)[number]) => ReactNode }> = {
        poNumber: { label: "PO Number", cell: (po) => <span className="font-semibold">{po.poNumber}</span> },
        project:  { label: "Project",   cell: (po) => <span>{po.project}</span> },
        value:    { label: "Value",      cell: (po) => <span className="font-mono">{fmt(po.totalValue)}</span> },
        status:   { label: "Status",     cell: (po) => <StatusPill status={po.status.toLowerCase().split("_").join("-")} /> },
        progress: { label: "Progress",   cell: (po) => <div className="flex items-center gap-1.5"><div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${po.deliveryProgress}%` }} /></div><span className="text-[10px]">{po.deliveryProgress}%</span></div> },
        date:     { label: "Date",       cell: (po) => <span className="text-muted-foreground">{new Date(po.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</span> },
    };

    return (
        <div className="space-y-5">
            <SectionHeader
                icon={FileText}
                iconBg="bg-blue-100 dark:bg-blue-500/20"
                iconColor="text-blue-600 dark:text-blue-400"
                title="Purchase Order Status"
                subtitle={`${filteredPOs.length} purchase orders`}
                badge={kpis.totalActivePOs > 0 ? { label: `${kpis.totalActivePOs} Active`, variant: "default" } : undefined}
                rightContent={<ViewToggle section="orders" current={viewMode} onChange={toggleView} />}
            />

            {viewMode === "chart" ? (
                <div className="grid gap-5 lg:grid-cols-2">
                    <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-3">PO Distribution</p>
                        <POStatusRadial data={poStatus} />
                    </Card>
                    <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-3">Orders List</p>
                        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                            {filteredPOs.map(po => (
                                <div key={po.id} className="flex items-center gap-3 rounded-xl border border-border/40 p-3 bg-card/50 hover:bg-muted/30 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <FileText className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" weight="duotone" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold">{po.poNumber}</span>
                                            <StatusPill status={po.status.toLowerCase().replace(/_/g, "-")} />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{po.project}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-bold font-mono">{fmt(po.totalValue, "$")}</p>
                                        <div className="flex items-center gap-1 mt-1 justify-end">
                                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                                <div className="h-full rounded-full bg-blue-500" style={{ width: `${po.deliveryProgress}%` }} />
                                            </div>
                                            <span className="text-[9px] text-muted-foreground">{po.deliveryProgress}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            ) : (
                <Card className="rounded-2xl border-border/60 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                {ordCols.map((col) => (
                                    <TableHead key={col} draggable
                                        onDragStart={() => setDragCol(col)}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                        onDragEnd={() => { reorderCols(ordCols, dragCol!, dragOverCol!, setOrdCols); setDragCol(null); setDragOverCol(null); }}
                                        className={["cursor-grab active:cursor-grabbing select-none text-[10px] font-bold uppercase", dragCol === col ? "opacity-40 bg-muted/60" : "", dragOverCol === col && dragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : ""].join(" ")}
                                    >
                                        <span className="flex items-center gap-1"><DotsSixVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />{ORD_DEF[col].label}</span>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPOs.map(po => (
                                <TableRow key={po.id} className="text-xs hover:bg-muted/20">
                                    {ordCols.map((col) => (<TableCell key={col}>{ORD_DEF[col].cell(po)}</TableCell>))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
