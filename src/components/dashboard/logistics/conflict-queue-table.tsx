"use client";

/**
 * Phase 6: Conflict Queue Table
 * 
 * Displays logistics and delivery conflicts for PM review and adjudication.
 */

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertTriangle, CheckCircle, Clock, Filter,
    Calendar, Package, FileText, ChevronRight, GripVertical
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Conflict {
    id: string;
    type: string;
    state: string;
    severity?: string | null;
    description?: string | null;
    deviationPercent?: string | null;
    createdAt: string | Date;
    slaDeadline?: string | Date | null;
    autoResolved?: boolean;
    purchaseOrder?: {
        poNumber: string;
    };
    supplierValue?: string | null;
    logisticsValue?: string | null;
    fieldValue?: string | null;
}

interface ConflictQueueTableProps {
    projectId?: string;
    initialConflicts?: Conflict[];
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
    DATE_VARIANCE: { label: "ETA Delay", icon: <Calendar className="h-4 w-4" /> },
    QUANTITY_MISMATCH: { label: "Qty Variance", icon: <Package className="h-4 w-4" /> },
    PROGRESS_MISMATCH: { label: "Progress", icon: <Clock className="h-4 w-4" /> },
    EVIDENCE_FAILURE: { label: "Evidence", icon: <FileText className="h-4 w-4" /> },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
    HIGH: { label: "High", color: "bg-red-500" },
    MEDIUM: { label: "Medium", color: "bg-yellow-500" },
    LOW: { label: "Low", color: "bg-blue-500" },
};

const STATE_CONFIG: Record<string, { label: string; color: string }> = {
    OPEN: { label: "Open", color: "bg-orange-500" },
    REVIEW: { label: "In Review", color: "bg-blue-500" },
    ESCALATED: { label: "Escalated", color: "bg-red-500" },
    RESOLVED: { label: "Resolved", color: "bg-green-500" },
    CLOSED: { label: "Closed", color: "bg-gray-500" },
};

function reorderCols(
    arr: string[], from: string, to: string, setter: (val: string[]) => void
) {
    const next = [...arr]; const fi = next.indexOf(from); const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return; next.splice(fi, 1); next.splice(ti, 0, from); setter(next);
}

export function ConflictQueueTable({
    projectId,
    initialConflicts = [],
}: ConflictQueueTableProps) {
    const router = useRouter();
    const [conflicts, setConflicts] = useState<Conflict[]>(initialConflicts);
    const [loading, setLoading] = useState(initialConflicts.length === 0);
    const [filterType, setFilterType] = useState<string>("all");
    const [filterSeverity, setFilterSeverity] = useState<string>("all");
    const [filterState, setFilterState] = useState<string>("OPEN");
    const [conflictCols, setConflictCols] = useState(["type", "po", "description", "severity", "age", "state"]);
    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    useEffect(() => {
        if (initialConflicts.length === 0) {
            fetchConflicts();
        }
    }, [projectId]);

    const fetchConflicts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                state: filterState === "all" ? "" : filterState,
            });
            if (projectId) params.set("projectId", projectId);

            const response = await fetch(`/api/conflicts?${params}`);
            const data = await response.json();
            if (data.conflicts) {
                setConflicts(data.conflicts);
            }
        } catch (error) {
            console.error("Failed to fetch conflicts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (conflictId: string) => {
        try {
            const response = await fetch("/api/conflicts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conflictId,
                    state: "RESOLVED",
                }),
            });
            const data = await response.json();
            if (data.success) {
                toast.success("Conflict resolved");
                fetchConflicts();
            }
        } catch (error) {
            toast.error("Failed to resolve conflict");
        }
    };

    // Filter conflicts
    const filteredConflicts = conflicts.filter((c) => {
        if (filterType !== "all" && c.type !== filterType) return false;
        if (filterSeverity !== "all" && c.severity !== filterSeverity) return false;
        if (filterState !== "all" && c.state !== filterState) return false;
        return true;
    });

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Conflict Queue</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const CONFLICT_DEF: Record<string, { label: string; cell: (conflict: Conflict) => ReactNode }> = {
        type:        { label: "Type",        cell: (c) => { const cfg = TYPE_CONFIG[c.type] || { label: c.type, icon: <AlertTriangle className="h-4 w-4" /> }; return <div className="flex items-center gap-2">{cfg.icon}<span className="text-sm font-medium">{cfg.label}</span></div>; } },
        po:          { label: "PO",          cell: (c) => <span className="font-sans tabular-nums text-sm">{c.purchaseOrder?.poNumber || "—"}</span> },
        description: { label: "Description", cell: (c) => (<><p className="text-sm truncate max-w-[200px]">{c.description || "—"}</p>{(c.supplierValue || c.logisticsValue) && <p className="text-xs text-muted-foreground">Supplier: {c.supplierValue || "—"} | API: {c.logisticsValue || "—"}</p>}</>) },
        severity:    { label: "Severity",    cell: (c) => { const cfg = SEVERITY_CONFIG[c.severity ?? "MEDIUM"]; return <Badge className={cn("text-white text-xs", cfg?.color)}>{cfg?.label ?? c.severity}</Badge>; } },
        age:         { label: "Age",         cell: (c) => { const t = typeof c.createdAt === "string" ? new Date(c.createdAt) : c.createdAt; return <span className="text-sm text-muted-foreground">{formatDistanceToNow(t, { addSuffix: true })}</span>; } },
        state:       { label: "State",       cell: (c) => { const cfg = STATE_CONFIG[c.state] || STATE_CONFIG.OPEN; return <Badge variant="outline" className={cn(cfg.color, "text-white text-xs")}>{cfg.label}</Badge>; } },
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Conflict Queue
                        </CardTitle>
                        <CardDescription>
                            {filteredConflicts.length} conflicts require attention
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchConflicts}>
                        Refresh
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mt-4">
                    <Select value={filterState} onValueChange={setFilterState}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All States</SelectItem>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="REVIEW">In Review</SelectItem>
                            <SelectItem value="ESCALATED">Escalated</SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="DATE_VARIANCE">ETA Delay</SelectItem>
                            <SelectItem value="QUANTITY_MISMATCH">Qty Variance</SelectItem>
                            <SelectItem value="PROGRESS_MISMATCH">Progress</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Severity</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="LOW">Low</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            <CardContent>
                {filteredConflicts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                        <p className="font-medium">No open conflicts</p>
                        <p className="text-sm">All issues have been resolved</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {conflictCols.map((col) => (
                                    <TableHead key={col} draggable
                                        onDragStart={() => setDragCol(col)}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                        onDragEnd={() => { reorderCols(conflictCols, dragCol!, dragOverCol!, setConflictCols); setDragCol(null); setDragOverCol(null); }}
                                        className={["cursor-grab active:cursor-grabbing select-none", dragCol === col ? "opacity-40 bg-muted/60" : "", dragOverCol === col && dragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : ""].join(" ")}
                                    >
                                        <span className="flex items-center gap-1"><GripVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />{CONFLICT_DEF[col].label}</span>
                                    </TableHead>
                                ))}
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredConflicts.map((conflict) => (
                                <TableRow key={conflict.id} className={cn(conflict.severity === "HIGH" && "bg-red-50")}>
                                    {conflictCols.map((col) => (<TableCell key={col}>{CONFLICT_DEF[col].cell(conflict)}</TableCell>))}
                                    <TableCell>
                                        <div className="flex gap-2">
                                            {conflict.state === "OPEN" && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleResolve(conflict.id)}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Resolve
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm">
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
