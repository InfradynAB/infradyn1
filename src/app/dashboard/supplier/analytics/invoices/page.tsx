"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, DotsSixVertical } from "@phosphor-icons/react";
import {
    SectionHeader, ViewToggle, StatusPill, StatCard,
    mockKPIs, mockInvoices, mockInvoiceCycle, fmt,
} from "@/components/dashboard/supplier/analytics-shared";
import { useAnalyticsFilters } from "@/components/dashboard/supplier/analytics-shell";
import { InvoiceCycleLine } from "@/components/dashboard/supplier/charts/invoice-cycle-line";

function reorderCols(
    arr: string[], from: string, to: string, setter: (val: string[]) => void
) {
    const next = [...arr]; const fi = next.indexOf(from); const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return; next.splice(fi, 1); next.splice(ti, 0, from); setter(next);
}

export default function InvoicesPage() {
    const kpis = mockKPIs();
    const invoices = mockInvoices();
    const invoiceCycle = mockInvoiceCycle();
    const { searchQuery, statusFilter } = useAnalyticsFilters();
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
    const toggleView = useCallback((_s: string, mode: "chart" | "table") => setViewMode(mode), []);
    const [invCols, setInvCols] = useState(["invoiceNum", "po", "amount", "submitted", "dueDate", "status", "paid"]);
    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const filteredInvoices = useMemo(() => {
        let items = invoices;
        if (searchQuery) items = items.filter(i => i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || i.poNumber.toLowerCase().includes(searchQuery.toLowerCase()));
        if (statusFilter !== "all") items = items.filter(i => i.status.toLowerCase().replace(/_/g, "-") === statusFilter);
        return items;
    }, [invoices, searchQuery, statusFilter]);

    const INV_DEF: Record<string, { label: string; cell: (inv: (typeof filteredInvoices)[number]) => ReactNode }> = {
        invoiceNum: { label: "Invoice #",  cell: (inv) => <span className="font-semibold">{inv.invoiceNumber}</span> },
        po:         { label: "PO",          cell: (inv) => <span>{inv.poNumber}</span> },
        amount:     { label: "Amount",      cell: (inv) => <span className="font-mono">{fmt(inv.amount)}</span> },
        submitted:  { label: "Submitted",   cell: (inv) => <span>{new Date(inv.submittedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</span> },
        dueDate:    { label: "Due Date",    cell: (inv) => <span>{new Date(inv.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</span> },
        status:     { label: "Status",      cell: (inv) => <StatusPill status={inv.status.toLowerCase().replace(/_/g, "-")} /> },
        paid:       { label: "Paid",        cell: (inv) => <span>{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "\u2014"}</span> },
    };

    return (
        <div className="space-y-5">
            <SectionHeader
                icon={Receipt}
                iconBg="bg-violet-100 dark:bg-violet-500/20"
                iconColor="text-violet-600 dark:text-violet-400"
                title="Invoice Cycle Analytics"
                subtitle={`${filteredInvoices.length} invoices tracked`}
                rightContent={<ViewToggle section="invoices" current={viewMode} onChange={toggleView} />}
            />

            {viewMode === "chart" ? (
                <div className="grid gap-5 lg:grid-cols-2">
                    <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-3">Days to Approval Trend</p>
                        <InvoiceCycleLine data={invoiceCycle} />
                    </Card>
                    <Card className="rounded-2xl border-border/60 bg-card p-5 pt-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-3">Invoice Summary</p>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <StatCard label="Total Invoiced" value={fmt(invoices.reduce((s, i) => s + i.amount, 0))} color="blue" />
                            <StatCard label="Paid" value={fmt(invoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.amount, 0))} color="emerald" />
                            <StatCard label="Pending Approval" value={fmt(invoices.filter(i => i.status === "PENDING_APPROVAL").reduce((s, i) => s + i.amount, 0))} color="amber" />
                            <StatCard label="Avg Cycle" value={`${kpis.averagePaymentCycle}d`} color="violet" />
                        </div>
                        <div className="space-y-2">
                            {filteredInvoices.slice(0, 4).map(inv => (
                                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 bg-card/50">
                                    <div>
                                        <span className="text-xs font-bold">{inv.invoiceNumber}</span>
                                        <span className="text-[10px] text-muted-foreground ml-2">{inv.poNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono">{fmt(inv.amount)}</span>
                                        <StatusPill status={inv.status.toLowerCase().replace(/_/g, "-")} />
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
                                {invCols.map((col) => (
                                    <TableHead key={col} draggable
                                        onDragStart={() => setDragCol(col)}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                        onDragEnd={() => { reorderCols(invCols, dragCol!, dragOverCol!, setInvCols); setDragCol(null); setDragOverCol(null); }}
                                        className={["cursor-grab active:cursor-grabbing select-none text-[10px] font-bold uppercase", dragCol === col ? "opacity-40 bg-muted/60" : "", dragOverCol === col && dragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : ""].join(" ")}
                                    >
                                        <span className="flex items-center gap-1"><DotsSixVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />{INV_DEF[col].label}</span>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvoices.map(inv => (
                                <TableRow key={inv.id} className="text-xs hover:bg-muted/20">
                                    {invCols.map((col) => (<TableCell key={col}>{INV_DEF[col].cell(inv)}</TableCell>))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
