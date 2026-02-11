"use client";

import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldWarning } from "@phosphor-icons/react";
import {
    SectionHeader, ViewToggle, StatusPill, StatCard, SeverityBadge,
    mockKPIs, mockNCRs, mockNCRMonthly,
} from "@/components/dashboard/supplier/analytics-shared";
import { useAnalyticsFilters } from "@/components/dashboard/supplier/analytics-shell";
import { NCRStackedBars } from "@/components/dashboard/supplier/charts/ncr-stacked-bars";

export default function NCRsPage() {
    const kpis = mockKPIs();
    const ncrs = mockNCRs();
    const ncrMonthly = mockNCRMonthly();
    const { searchQuery, statusFilter } = useAnalyticsFilters();
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
    const toggleView = useCallback((_s: string, mode: "chart" | "table") => setViewMode(mode), []);

    const filteredNCRs = useMemo(() => {
        let items = ncrs;
        if (searchQuery) items = items.filter(n => n.ncrNumber.toLowerCase().includes(searchQuery.toLowerCase()) || n.title.toLowerCase().includes(searchQuery.toLowerCase()));
        if (statusFilter !== "all") items = items.filter(n => n.status.toLowerCase() === statusFilter);
        return items;
    }, [ncrs, searchQuery, statusFilter]);

    return (
        <div className="space-y-5">
            <SectionHeader
                icon={ShieldWarning}
                iconBg="bg-red-100 dark:bg-red-500/20"
                iconColor="text-red-600 dark:text-red-400"
                title="NCR Summary"
                subtitle={`${filteredNCRs.length} non-conformance reports`}
                badge={kpis.ncrsAssigned > 0 ? { label: `${kpis.ncrsAssigned} Open`, variant: "destructive" } : undefined}
                rightContent={<ViewToggle section="ncrs" current={viewMode} onChange={toggleView} />}
            />

            {viewMode === "chart" ? (
                <div className="grid gap-5 lg:grid-cols-2">
                    <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-3">Monthly NCR Trend (6 Months)</p>
                        <NCRStackedBars data={ncrMonthly} />
                    </Card>
                    <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-3">Open NCRs</p>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <StatCard label="Open" value={ncrs.filter(n => n.status === "OPEN").length.toString()} color="red" alert />
                            <StatCard label="Responded" value={ncrs.filter(n => n.status === "SUPPLIER_RESPONDED").length.toString()} color="amber" />
                            <StatCard label="Total" value={ncrs.length.toString()} color="blue" />
                        </div>
                        <div className="space-y-2">
                            {filteredNCRs.map(ncr => (
                                <div key={ncr.id} className="rounded-xl border border-border/40 p-3 bg-card/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold">{ncr.ncrNumber}</span>
                                            <SeverityBadge severity={ncr.severity} />
                                        </div>
                                        <StatusPill status={ncr.status.toLowerCase().replace(/_/g, "-")} />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">{ncr.title}</p>
                                    <div className="flex items-center gap-3 mt-1.5 text-[9px] text-muted-foreground">
                                        <span>Reported: {new Date(ncr.reportedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                                        {ncr.slaDueAt && <span className="text-amber-600 font-semibold">SLA: {new Date(ncr.slaDueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>}
                                    </div>
                                </div>
                            ))}
                            {filteredNCRs.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No NCRs matching filters</p>}
                        </div>
                    </Card>
                </div>
            ) : (
                <Card className="rounded-2xl border-border/60 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="text-[10px] font-bold uppercase">NCR #</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Title</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Severity</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Reported</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">SLA Due</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredNCRs.map(ncr => (
                                <TableRow key={ncr.id} className="text-xs hover:bg-muted/20">
                                    <TableCell className="font-semibold">{ncr.ncrNumber}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">{ncr.title}</TableCell>
                                    <TableCell><SeverityBadge severity={ncr.severity} /></TableCell>
                                    <TableCell><StatusPill status={ncr.status.toLowerCase().replace(/_/g, "-")} /></TableCell>
                                    <TableCell>{new Date(ncr.reportedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</TableCell>
                                    <TableCell>{ncr.slaDueAt ? new Date(ncr.slaDueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
