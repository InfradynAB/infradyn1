"use client";

import { useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Clock, TrendingUp, ChevronRight, GripVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface AgingNCR {
    id: string;
    ncrNumber: string;
    title: string;
    severity: string;
    status: string;
    daysOpen: number;
    supplier?: { name: string } | null;
    purchaseOrderId: string;
}

interface NCRAgingReportProps {
    ncrs?: AgingNCR[];
    loading?: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: "text-red-500",
    MAJOR: "text-orange-500",
    MINOR: "text-yellow-600",
};

const getAgingBand = (days: number) => {
    if (days > 14) return { color: "bg-red-500", label: "Critical" };
    if (days > 7) return { color: "bg-orange-500", label: "High" };
    if (days > 3) return { color: "bg-yellow-500", label: "Medium" };
    return { color: "bg-green-500", label: "Normal" };
};

function reorderCols(
    arr: string[],
    from: string,
    to: string,
    setter: (val: string[]) => void
) {
    const next = [...arr];
    const fi = next.indexOf(from);
    const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return;
    next.splice(fi, 1);
    next.splice(ti, 0, from);
    setter(next);
}

export function NCRAgingReport({ ncrs = [], loading = false }: NCRAgingReportProps) {
    const [agingCols, setAgingCols] = useState(["ncr", "severity", "supplier", "daysOpen"]);
    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        NCR Aging Report
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Sort by days open, descending
    const sortedNCRs = [...ncrs]
        .filter(n => n.status !== "CLOSED")
        .sort((a, b) => b.daysOpen - a.daysOpen);

    if (sortedNCRs.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        NCR Aging Report
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8 text-muted-foreground">
                    <p>No open NCRs</p>
                </CardContent>
            </Card>
        );
    }

    // Calculate aging distribution
    const critical = sortedNCRs.filter(n => n.daysOpen > 14).length;
    const high = sortedNCRs.filter(n => n.daysOpen > 7 && n.daysOpen <= 14).length;
    const medium = sortedNCRs.filter(n => n.daysOpen > 3 && n.daysOpen <= 7).length;
    const normal = sortedNCRs.filter(n => n.daysOpen <= 3).length;
    const total = sortedNCRs.length;

    const AGING_DEF: Record<string, { label: string; hCls?: string; cell: (ncr: AgingNCR) => ReactNode }> = {
        ncr:      { label: "NCR",       cell: (ncr) => <div><p className="font-mono text-sm">{ncr.ncrNumber}</p><p className="text-xs text-muted-foreground truncate max-w-[150px]">{ncr.title}</p></div> },
        severity: { label: "Severity",  cell: (ncr) => <span className={`text-sm font-medium ${SEVERITY_COLORS[ncr.severity]}`}>{ncr.severity}</span> },
        supplier: { label: "Supplier",  cell: (ncr) => <span className="text-sm">{ncr.supplier?.name || "-"}</span> },
        daysOpen: { label: "Days Open", hCls: "text-right", cell: (ncr) => { const band = getAgingBand(ncr.daysOpen); return <div className="flex justify-end"><Badge className={`${band.color} text-white`}>{ncr.daysOpen}d</Badge></div>; } },
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        NCR Aging Report
                    </span>
                    <Badge variant="outline">{sortedNCRs.length} Open</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Aging Distribution Bar */}
                <div className="space-y-2">
                    <div className="flex h-4 rounded-full overflow-hidden">
                        {critical > 0 && (
                            <div
                                className="bg-red-500"
                                style={{ width: `${(critical / total) * 100}%` }}
                                title={`Critical: ${critical}`}
                            />
                        )}
                        {high > 0 && (
                            <div
                                className="bg-orange-500"
                                style={{ width: `${(high / total) * 100}%` }}
                                title={`High: ${high}`}
                            />
                        )}
                        {medium > 0 && (
                            <div
                                className="bg-yellow-500"
                                style={{ width: `${(medium / total) * 100}%` }}
                                title={`Medium: ${medium}`}
                            />
                        )}
                        {normal > 0 && (
                            <div
                                className="bg-green-500"
                                style={{ width: `${(normal / total) * 100}%` }}
                                title={`Normal: ${normal}`}
                            />
                        )}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" /> &gt;14d: {critical}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-orange-500" /> 7-14d: {high}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-yellow-500" /> 3-7d: {medium}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500" /> &lt;3d: {normal}
                        </span>
                    </div>
                </div>

                {/* NCR List */}
                <Table>
                    <TableHeader>
                        <TableRow>
                            {agingCols.map((col) => (
                                <TableHead
                                    key={col}
                                    draggable
                                    onDragStart={() => setDragCol(col)}
                                    onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                    onDragEnd={() => { reorderCols(agingCols, dragCol!, dragOverCol!, setAgingCols); setDragCol(null); setDragOverCol(null); }}
                                    className={[
                                        "cursor-grab active:cursor-grabbing select-none",
                                        dragCol === col ? "opacity-40 bg-muted/60" : "",
                                        dragOverCol === col && dragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : "",
                                        AGING_DEF[col].hCls ?? "",
                                    ].join(" ")}
                                >
                                    <span className="flex items-center gap-1">
                                        <GripVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                        {AGING_DEF[col].label}
                                    </span>
                                </TableHead>
                            ))}
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedNCRs.slice(0, 10).map((ncr) => (
                            <TableRow key={ncr.id}>
                                {agingCols.map((col) => (
                                    <TableCell key={col}>{AGING_DEF[col].cell(ncr)}</TableCell>
                                ))}
                                <TableCell>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/dashboard/procurement/ncr/${ncr.id}`}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {sortedNCRs.length > 10 && (
                    <p className="text-xs text-center text-muted-foreground">
                        +{sortedNCRs.length - 10} more NCRs
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
