"use client";

/**
 * Phase 6: Conflict Queue Table
 * 
 * Displays logistics and delivery conflicts for PM review and adjudication.
 */

import { useState, useEffect } from "react";
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
    Calendar, Package, FileText, ChevronRight
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
                                <TableHead>Type</TableHead>
                                <TableHead>PO</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Age</TableHead>
                                <TableHead>State</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredConflicts.map((conflict) => {
                                const typeConfig = TYPE_CONFIG[conflict.type] || {
                                    label: conflict.type,
                                    icon: <AlertTriangle className="h-4 w-4" />,
                                };
                                const severityConfig = SEVERITY_CONFIG[conflict.severity || "MEDIUM"];
                                const stateConfig = STATE_CONFIG[conflict.state] || STATE_CONFIG.OPEN;
                                const createdAt = typeof conflict.createdAt === "string"
                                    ? new Date(conflict.createdAt)
                                    : conflict.createdAt;

                                return (
                                    <TableRow key={conflict.id} className={cn(
                                        conflict.severity === "HIGH" && "bg-red-50"
                                    )}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {typeConfig.icon}
                                                <span className="text-sm font-medium">
                                                    {typeConfig.label}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {conflict.purchaseOrder?.poNumber || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm truncate max-w-[200px]">
                                                {conflict.description || "—"}
                                            </p>
                                            {(conflict.supplierValue || conflict.logisticsValue) && (
                                                <p className="text-xs text-muted-foreground">
                                                    Supplier: {conflict.supplierValue || "—"} |
                                                    API: {conflict.logisticsValue || "—"}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn("text-white text-xs", severityConfig?.color)}>
                                                {severityConfig?.label || conflict.severity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDistanceToNow(createdAt, { addSuffix: true })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(stateConfig.color, "text-white text-xs")}>
                                                {stateConfig.label}
                                            </Badge>
                                        </TableCell>
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
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
