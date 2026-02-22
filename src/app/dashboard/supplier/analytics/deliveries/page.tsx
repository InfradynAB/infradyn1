"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, DotsSixVertical } from "@phosphor-icons/react";
import {
    SectionHeader, ViewToggle, StatusPill,
    mockKPIs, mockPOs, mockDeliveryTimeline,
} from "@/components/dashboard/supplier/analytics-shared";
import { useAnalyticsFilters } from "@/components/dashboard/supplier/analytics-shell";
import { DeliveryGantt } from "@/components/dashboard/supplier/charts/delivery-gantt";

function reorderCols(
    arr: string[], from: string, to: string, setter: (val: string[]) => void
) {
    const next = [...arr]; const fi = next.indexOf(from); const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return; next.splice(fi, 1); next.splice(ti, 0, from); setter(next);
}

export default function DeliveriesPage() {
    const kpis = mockKPIs();
    const pos = mockPOs();
    const deliveryTimeline = mockDeliveryTimeline();
    const { searchQuery, projectFilter } = useAnalyticsFilters();
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
    const toggleView = useCallback((_s: string, mode: "chart" | "table") => setViewMode(mode), []);
    const [delivCols, setDelivCols] = useState(["po", "description", "dispatched", "transit", "delivered", "inspected", "status"]);
    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const filteredDeliveries = useMemo(() => {
        let items = deliveryTimeline;
        if (searchQuery) items = items.filter(d => d.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) || d.description.toLowerCase().includes(searchQuery.toLowerCase()));
        if (projectFilter !== "all") {
            const projectPOs = pos.filter(p => p.project === projectFilter).map(p => p.poNumber);
            items = items.filter(d => projectPOs.includes(d.poNumber));
        }
        return items;
    }, [deliveryTimeline, searchQuery, projectFilter, pos]);

    const DELIV_DEF: Record<string, { label: string; cell: (d: (typeof filteredDeliveries)[number]) => ReactNode }> = {
        po:          { label: "PO",          cell: (d) => <span className="font-semibold">{d.poNumber}</span> },
        description: { label: "Description", cell: (d) => <span className="max-w-[180px] truncate block">{d.description}</span> },
        dispatched:  { label: "Dispatched",  cell: (d) => <span>{d.stages[0]?.date ? new Date(d.stages[0].date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "\u2014"}</span> },
        transit:     { label: "Transit",     cell: (d) => <span>{d.stages[1]?.date ? new Date(d.stages[1].date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "\u2014"}</span> },
        delivered:   { label: "Delivered",   cell: (d) => <span>{d.stages[2]?.date ? new Date(d.stages[2].date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "\u2014"}</span> },
        inspected:   { label: "Inspected",   cell: (d) => <span>{d.stages[3]?.date ? new Date(d.stages[3].date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "\u2014"}</span> },
        status:      { label: "Status",      cell: (d) => { const hasDelayed = d.stages.some((s: { status: string }) => s.status === "delayed"); const allDone = d.stages.every((s: { status: string }) => s.status === "completed"); return <StatusPill status={hasDelayed ? "delayed" : allDone ? "completed" : "in-progress"} />; } },
    };

    return (
        <div className="space-y-5">
            <SectionHeader
                icon={Truck}
                iconBg="bg-cyan-100 dark:bg-cyan-500/20"
                iconColor="text-cyan-600 dark:text-cyan-400"
                title="Delivery Timeline"
                subtitle={`${filteredDeliveries.length} active shipments`}
                badge={kpis.pendingDeliveries > 0 ? { label: `${kpis.pendingDeliveries} Pending`, variant: "destructive" } : undefined}
                rightContent={<ViewToggle section="deliveries" current={viewMode} onChange={toggleView} />}
            />

            {viewMode === "chart" ? (
                <Card className="rounded-2xl border-border/60 bg-card p-5">
                    <DeliveryGantt items={filteredDeliveries} />
                </Card>
            ) : (
                <Card className="rounded-2xl border-border/60 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                {delivCols.map((col) => (
                                    <TableHead key={col} draggable
                                        onDragStart={() => setDragCol(col)}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                        onDragEnd={() => { reorderCols(delivCols, dragCol!, dragOverCol!, setDelivCols); setDragCol(null); setDragOverCol(null); }}
                                        className={["cursor-grab active:cursor-grabbing select-none text-[10px] font-bold uppercase", dragCol === col ? "opacity-40 bg-muted/60" : "", dragOverCol === col && dragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : ""].join(" ")}
                                    >
                                        <span className="flex items-center gap-1"><DotsSixVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />{DELIV_DEF[col].label}</span>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDeliveries.map(d => (
                                <TableRow key={d.id} className="text-xs hover:bg-muted/20">
                                    {delivCols.map((col) => (<TableCell key={col}>{DELIV_DEF[col].cell(d)}</TableCell>))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
