"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, DotsSixVertical } from "@phosphor-icons/react";
import {
    SectionHeader, ViewToggle, StatusPill, fmt,
    mockMilestones,
} from "@/components/dashboard/supplier/analytics-shared";
import { useAnalyticsFilters } from "@/components/dashboard/supplier/analytics-shell";

function reorderCols(
    arr: string[], from: string, to: string, setter: (val: string[]) => void
) {
    const next = [...arr]; const fi = next.indexOf(from); const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return; next.splice(fi, 1); next.splice(ti, 0, from); setter(next);
}

export default function MilestonesPage() {
    const milestones = mockMilestones();
    const { searchQuery, statusFilter } = useAnalyticsFilters();
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
    const toggleView = useCallback((_s: string, mode: "chart" | "table") => setViewMode(mode), []);
    const [now] = useState(() => Date.now());
    const [milestCols, setMilestCols] = useState(["milestone", "poNum", "amount", "status", "dueDate"]);
    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const filteredMilestones = useMemo(() => {
        let items = milestones;
        if (searchQuery) items = items.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.poNumber.toLowerCase().includes(searchQuery.toLowerCase()));
        if (statusFilter !== "all") items = items.filter(m => m.status.toLowerCase() === statusFilter);
        return items;
    }, [milestones, searchQuery, statusFilter]);

    const completed = milestones.filter(m => m.status === "COMPLETED").length;
    const pending = milestones.filter(m => m.status === "PENDING").length;
    const submitted = milestones.filter(m => m.status === "SUBMITTED").length;

    const MILEST_DEF: Record<string, { label: string; cell: (m: (typeof filteredMilestones)[number]) => ReactNode }> = {
        milestone: { label: "Milestone", cell: (m) => <span className="font-semibold max-w-[200px] truncate block">{m.title}</span> },
        poNum:     { label: "PO #",      cell: (m) => <span>{m.poNumber}</span> },
        amount:    { label: "Amount",    cell: (m) => <span>{fmt(m.amount)}</span> },
        status:    { label: "Status",    cell: (m) => <StatusPill status={m.status.toLowerCase().split("_").join("-")} /> },
        dueDate:   { label: "Due Date",  cell: (m) => <span>{new Date(m.expectedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</span> },
    };

    return (
        <div className="space-y-5">
            <SectionHeader
                icon={Target}
                iconBg="bg-indigo-100 dark:bg-indigo-500/20"
                iconColor="text-indigo-600 dark:text-indigo-400"
                title="Milestones"
                subtitle={`${milestones.length} total milestones`}
                badge={submitted > 0 ? { label: `${submitted} Submitted`, variant: "default" } : undefined}
                rightContent={<ViewToggle section="milestones" current={viewMode} onChange={toggleView} />}
            />

            {viewMode === "chart" ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-5">
                    {filteredMilestones.map(m => {
                        const daysLeft = Math.ceil((new Date(m.expectedDate).getTime() - now) / 86400000);
                        const isOverdue = daysLeft < 0 && m.status !== "COMPLETED";
                        return (
                            <Card key={m.id} className="rounded-2xl border-border/60 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold truncate max-w-[180px]">{m.title}</h3>
                                    <StatusPill status={m.status.toLowerCase().replace(/_/g, "-")} />
                                </div>
                                <p className="text-[10px] text-muted-foreground mb-3">{m.poNumber}</p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span>Payment: {m.paymentPercentage}%</span>
                                        <span className="font-semibold">{fmt(m.amount)}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                                        <div
                                            className={`h-full rounded-full transition-all ${isOverdue ? "bg-red-500" : m.status === "COMPLETED" ? "bg-green-500" : "bg-indigo-500"}`}
                                            style={{ width: `${m.paymentPercentage}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[9px] text-muted-foreground mt-2">
                                        <span>Due: {new Date(m.expectedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</span>
                                        {m.status !== "COMPLETED" && <span className={isOverdue ? "text-red-600 font-semibold" : daysLeft <= 7 ? "text-amber-600" : ""}>{Math.abs(daysLeft)} days {isOverdue ? "overdue" : "left"}</span>}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                    {filteredMilestones.length === 0 && <p className="col-span-full text-xs text-muted-foreground text-center py-10">No milestones matching filters</p>}
                </div>
            ) : (
                <Card className="rounded-2xl border-border/60 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                {milestCols.map((col) => (
                                    <TableHead key={col} draggable
                                        onDragStart={() => setDragCol(col)}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                        onDragEnd={() => { reorderCols(milestCols, dragCol!, dragOverCol!, setMilestCols); setDragCol(null); setDragOverCol(null); }}
                                        className={["cursor-grab active:cursor-grabbing select-none text-[10px] font-bold uppercase", dragCol === col ? "opacity-40 bg-muted/60" : "", dragOverCol === col && dragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : ""].join(" ")}
                                    >
                                        <span className="flex items-center gap-1"><DotsSixVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />{MILEST_DEF[col].label}</span>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMilestones.map(m => (
                                <TableRow key={m.id} className="text-xs hover:bg-muted/20">
                                    {milestCols.map((col) => (<TableCell key={col}>{MILEST_DEF[col].cell(m)}</TableCell>))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Stats bar */}
            <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 text-[10px] font-medium">
                <span className="text-green-600 dark:text-green-400">{completed} Completed</span>
                <span className="text-amber-600 dark:text-amber-400">{submitted} Submitted</span>
                <span className="text-blue-600 dark:text-blue-400">{pending} Pending</span>
            </div>
        </div>
    );
}
