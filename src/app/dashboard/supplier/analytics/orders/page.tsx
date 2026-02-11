"use client";

import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "@phosphor-icons/react";
import {
    SectionHeader, ViewToggle, StatusPill,
    mockKPIs, mockPOs, mockPOStatus, fmt,
} from "@/components/dashboard/supplier/analytics-shared";
import { useAnalyticsFilters } from "@/components/dashboard/supplier/analytics-shell";
import { POStatusRadial } from "@/components/dashboard/supplier/charts/po-status-radial";

export default function OrdersPage() {
    const kpis = mockKPIs();
    const pos = mockPOs();
    const poStatus = mockPOStatus();
    const { searchQuery, projectFilter, statusFilter } = useAnalyticsFilters();
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
    const toggleView = useCallback((_s: string, mode: "chart" | "table") => setViewMode(mode), []);

    const filteredPOs = useMemo(() => {
        let items = pos;
        if (searchQuery) items = items.filter(p => p.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) || p.project.toLowerCase().includes(searchQuery.toLowerCase()));
        if (projectFilter !== "all") items = items.filter(p => p.project === projectFilter);
        if (statusFilter !== "all") items = items.filter(p => p.status.toLowerCase() === statusFilter);
        return items;
    }, [pos, searchQuery, projectFilter, statusFilter]);

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
                                <TableHead className="text-[10px] font-bold uppercase">PO Number</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Project</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Value</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Progress</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPOs.map(po => (
                                <TableRow key={po.id} className="text-xs hover:bg-muted/20">
                                    <TableCell className="font-semibold">{po.poNumber}</TableCell>
                                    <TableCell>{po.project}</TableCell>
                                    <TableCell className="font-mono">{fmt(po.totalValue)}</TableCell>
                                    <TableCell><StatusPill status={po.status.toLowerCase().replace(/_/g, "-")} /></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5"><div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${po.deliveryProgress}%` }} /></div><span className="text-[10px]">{po.deliveryProgress}%</span></div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{new Date(po.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
