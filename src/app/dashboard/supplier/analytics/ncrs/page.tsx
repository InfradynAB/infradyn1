"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldWarning, DotsSixVertical } from "@phosphor-icons/react";
import {
    SectionHeader, ViewToggle, StatusPill, StatCard, SeverityBadge,
    mockKPIs, mockNCRs, mockNCRMonthly,
} from "@/components/dashboard/supplier/analytics-shared";
import { useAnalyticsFilters } from "@/components/dashboard/supplier/analytics-shell";
import { NCRStackedBars } from "@/components/dashboard/supplier/charts/ncr-stacked-bars";

function reorderCols(
    arr: string[], from: string, to: string, setter: (val: string[]) => void
) {
    const next = [...arr]; const fi = next.indexOf(from); const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return; next.splice(fi, 1); next.splice(ti, 0, from); setter(next);
}

export default function NCRsPage() {
    const kpis = mockKPIs();
    const ncrs = mockNCRs();
    const ncrMonthly = mockNCRMonthly();
    const { searchQuery, statusFilter } = useAnalyticsFilters();
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
    const toggleView = useCallback((_s: string, mode: "chart" | "table") => setViewMode(mode), []);
    const [ncrSACols, setNcrSACols] = useState(["ncrNum", "title", "severity", "status", "reported", "slaDue"]);
    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const filteredNCRs = useMemo(() => {
        let items = ncrs;
        if (searchQuery) items = items.filter(n => n.ncrNumber.toLowerCase().includes(searchQuery.toLowerCase()) || n.title.toLowerCase().includes(searchQuery.toLowerCase()));
        if (statusFilter !== "all") items = items.filter(n => n.status.toLowerCase() === statusFilter);
        return items;
    }, [ncrs, searchQuery, statusFilter]);

    const NCR_SA_DEF: Record<string, { label: string; cell: (ncr: (typeof filteredNCRs)[number]) => ReactNode }> = {
        ncrNum:   { label: "NCR #",    cell: (ncr) => <span className="font-semibold">{ncr.ncrNumber}</span> },
        title:    { label: "Title",    cell: (ncr) => <span className="max-w-[200px] truncate block">{ncr.title}</span> },
        severity: { label: "Severity", cell: (ncr) => <SeverityBadge severity={ncr.severity} /> },
        status:   { label: "Status",   cell: (ncr) => <StatusPill status={ncr.status.toLowerCase().split("_").join("-")} /> },
        reported: { label: "Reported", cell: (ncr) => <span>{new Date(ncr.reportedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</span> },
        slaDue:   { label: "SLA Due",  cell: (ncr) => <span>{ncr.slaDueAt ? new Date(ncr.slaDueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "\u2014"}</span> },
    };

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
                                {ncrSACols.map((col) => (
                                    <TableHead key={col} draggable
                                        onDragStart={() => setDragCol(col)}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                        onDragEnd={() => { reorderCols(ncrSACols, dragCol!, dragOverCol!, setNcrSACols); setDragCol(null); setDragOverCol(null); }}
                                        className={["cursor-grab active:cursor-grabbing select-none text-[10px] font-bold uppercase", dragCol === col ? "opacity-40 bg-muted/60" : "", dragOverCol === col && dragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : ""].join(" ")}
                                    >
                                        <span className="flex items-center gap-1"><DotsSixVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />{NCR_SA_DEF[col].label}</span>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredNCRs.map(ncr => (
                                <TableRow key={ncr.id} className="text-xs hover:bg-muted/20">
                                    {ncrSACols.map((col) => (<TableCell key={col}>{NCR_SA_DEF[col].cell(ncr)}</TableCell>))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
