"use client";

import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck } from "@phosphor-icons/react";
import {
    SectionHeader, ViewToggle, StatusPill,
    mockKPIs, mockPOs, mockDeliveryTimeline,
} from "@/components/dashboard/supplier/analytics-shared";
import { useAnalyticsFilters } from "@/components/dashboard/supplier/analytics-shell";
import { DeliveryGantt } from "@/components/dashboard/supplier/charts/delivery-gantt";

export default function DeliveriesPage() {
    const kpis = mockKPIs();
    const pos = mockPOs();
    const deliveryTimeline = mockDeliveryTimeline();
    const { searchQuery, projectFilter } = useAnalyticsFilters();
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
    const toggleView = useCallback((_s: string, mode: "chart" | "table") => setViewMode(mode), []);

    const filteredDeliveries = useMemo(() => {
        let items = deliveryTimeline;
        if (searchQuery) items = items.filter(d => d.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) || d.description.toLowerCase().includes(searchQuery.toLowerCase()));
        if (projectFilter !== "all") {
            const projectPOs = pos.filter(p => p.project === projectFilter).map(p => p.poNumber);
            items = items.filter(d => projectPOs.includes(d.poNumber));
        }
        return items;
    }, [deliveryTimeline, searchQuery, projectFilter, pos]);

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
                                <TableHead className="text-[10px] font-bold uppercase">PO</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Description</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Dispatched</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Transit</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Delivered</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Inspected</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDeliveries.map(d => {
                                const hasDelayed = d.stages.some(s => s.status === "delayed");
                                const allDone = d.stages.every(s => s.status === "completed");
                                const overallStatus = hasDelayed ? "delayed" : allDone ? "completed" : "in-progress";
                                return (
                                    <TableRow key={d.id} className="text-xs hover:bg-muted/20">
                                        <TableCell className="font-semibold">{d.poNumber}</TableCell>
                                        <TableCell className="max-w-[180px] truncate">{d.description}</TableCell>
                                        {d.stages.map(s => (
                                            <TableCell key={s.name}>
                                                {s.date ? new Date(s.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                                            </TableCell>
                                        ))}
                                        <TableCell><StatusPill status={overallStatus} /></TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
