"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ClockCounterClockwise,
    ArrowsClockwise,
    Funnel,
    MagnifyingGlass,
    CheckCircle,
    Warning,
    XCircle,
    Info,
    UserCircle,
    CaretLeft,
    CaretRight,
    DotsSixVertical,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AlertLogEntry {
    id: string;
    alertType: string;
    alertSeverity: "INFO" | "WARNING" | "CRITICAL";
    alertTitle: string;
    alertDescription: string | null;
    entityType: string | null;
    entityId: string | null;
    entityReference: string | null;
    action: "ACKNOWLEDGED" | "RESOLVED" | "ESCALATED" | "DISMISSED" | "SNOOZED";
    actionNotes: string | null;
    alertGeneratedAt: string | null;
    respondedAt: string;
    metadata: Record<string, unknown> | null;
    responder: {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
    } | null;
}

interface AlertLogsResponse {
    success: boolean;
    data: {
        logs: AlertLogEntry[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

const ALERT_TYPE_LABELS: Record<string, string> = {
    OVERDUE_DELIVERY: "Overdue Delivery",
    NCR_OPEN: "Open NCR",
    INVOICE_PENDING: "Pending Invoice",
    DOCUMENT_EXPIRING: "Expiring Document",
    MILESTONE_DUE: "Milestone Due",
    BUDGET_EXCEEDED: "Budget Exceeded",
    SUPPLIER_COMPLIANCE: "Supplier Compliance",
    QA_FAILED: "QA Failed",
    PO_APPROVAL_PENDING: "PO Approval Pending",
    SHIPMENT_DELAYED: "Shipment Delayed",
    PAYMENT_OVERDUE: "Payment Overdue",
    OTHER: "Other",
};

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    ACKNOWLEDGED: { label: "Acknowledged", variant: "secondary" },
    RESOLVED: { label: "Resolved", variant: "default" },
    ESCALATED: { label: "Escalated", variant: "destructive" },
    DISMISSED: { label: "Dismissed", variant: "outline" },
    SNOOZED: { label: "Snoozed", variant: "secondary" },
};

function reorderCols(
    arr: string[], from: string, to: string, setter: (val: string[]) => void
) {
    const next = [...arr]; const fi = next.indexOf(from); const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return; next.splice(fi, 1); next.splice(ti, 0, from); setter(next);
}

export function AlertLogsClient() {
    const [logs, setLogs] = useState<AlertLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [alertTypeFilter, setAlertTypeFilter] = useState<string>("all");
    const [severityFilter, setSeverityFilter] = useState<string>("all");
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [logCols, setLogCols] = useState(["alert", "reference", "respondedBy", "action", "responseTime", "notes"]);
    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const fetchLogs = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "25",
            });

            if (alertTypeFilter !== "all") params.set("alertType", alertTypeFilter);
            if (severityFilter !== "all") params.set("severity", severityFilter);
            if (actionFilter !== "all") params.set("action", actionFilter);

            const response = await fetch(`/api/dashboard/alerts/logs?${params}`);
            if (!response.ok) throw new Error("Failed to fetch");
            
            const result: AlertLogsResponse = await response.json();
            if (result.success) {
                setLogs(result.data.logs);
                setTotalPages(result.data.totalPages);
                setTotal(result.data.total);
            }
        } catch (error) {
            console.error("Error fetching alert logs:", error);
            toast.error("Failed to load alert logs");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, alertTypeFilter, severityFilter, actionFilter]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleRefresh = () => {
        fetchLogs(true);
        toast.success("Logs refreshed");
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case "CRITICAL":
                return <XCircle className="h-4 w-4 text-red-500" weight="fill" />;
            case "WARNING":
                return <Warning className="h-4 w-4 text-amber-500" weight="fill" />;
            default:
                return <Info className="h-4 w-4 text-blue-500" weight="fill" />;
        }
    };

    const getSeverityBadge = (severity: string) => {
        const variants: Record<string, "destructive" | "default" | "secondary"> = {
            CRITICAL: "destructive",
            WARNING: "default",
            INFO: "secondary",
        };
        return (
            <Badge variant={variants[severity] || "secondary"} className="text-xs">
                {severity}
            </Badge>
        );
    };

    const filteredLogs = logs.filter((log) => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            log.alertTitle.toLowerCase().includes(searchLower) ||
            log.alertDescription?.toLowerCase().includes(searchLower) ||
            log.entityReference?.toLowerCase().includes(searchLower) ||
            log.responder?.name?.toLowerCase().includes(searchLower) ||
            log.responder?.email?.toLowerCase().includes(searchLower)
        );
    });

    const LOG_DEF: Record<string, { label: string; cell: (log: AlertLogEntry) => ReactNode }> = {
        alert:        { label: "Alert",         cell: (log) => (
            <div className="flex items-start gap-3">
                {getSeverityIcon(log.alertSeverity)}
                <div>
                    <div className="font-medium">{log.alertTitle}</div>
                    <div className="flex items-center gap-2 mt-1">
                        {getSeverityBadge(log.alertSeverity)}
                        <span className="text-xs text-muted-foreground">{ALERT_TYPE_LABELS[log.alertType] || log.alertType}</span>
                    </div>
                    {log.alertDescription && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{log.alertDescription}</p>
                    )}
                </div>
            </div>
        ) },
        reference:    { label: "Reference",     cell: (log) => log.entityReference ? (
            <div><div className="font-mono text-sm">{log.entityReference}</div>{log.entityType && <div className="text-xs text-muted-foreground">{log.entityType}</div>}</div>
        ) : <span className="text-muted-foreground">—</span> },
        respondedBy:  { label: "Responded By",  cell: (log) => log.responder ? (
            <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7"><AvatarImage src={log.responder.image || undefined} /><AvatarFallback className="text-xs">{log.responder.name?.charAt(0) || log.responder.email.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                <div><div className="text-sm font-medium">{log.responder.name || "Unknown"}</div><div className="text-xs text-muted-foreground">{log.responder.email}</div></div>
            </div>
        ) : <div className="flex items-center gap-2 text-muted-foreground"><UserCircle className="h-5 w-5" /><span className="text-sm">Unknown</span></div> },
        action:       { label: "Action",        cell: (log) => <Badge variant={ACTION_LABELS[log.action]?.variant || "secondary"}>{ACTION_LABELS[log.action]?.label || log.action}</Badge> },
        responseTime: { label: "Response Time", cell: (log) => (
            <div><div className="text-sm">{format(new Date(log.respondedAt), "MMM d, yyyy")}</div><div className="text-xs text-muted-foreground">{format(new Date(log.respondedAt), "h:mm a")}</div></div>
        ) },
        notes:        { label: "Notes",         cell: (log) => log.actionNotes ? (
            <p className="text-sm text-muted-foreground max-w-[200px] truncate" title={log.actionNotes}>{log.actionNotes}</p>
        ) : <span className="text-muted-foreground">—</span> },
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-3">
                        <ClockCounterClockwise className="h-7 w-7 text-primary" />
                        Alert Logs
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        History of alert responses and actions taken
                    </p>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="gap-2"
                >
                    <ArrowsClockwise className={cn("h-4 w-4", refreshing && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Funnel className="h-4 w-4" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="relative">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search logs..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={alertTypeFilter} onValueChange={setAlertTypeFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Alert Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {Object.entries(ALERT_TYPE_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={severityFilter} onValueChange={setSeverityFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Severity" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Severities</SelectItem>
                                <SelectItem value="CRITICAL">Critical</SelectItem>
                                <SelectItem value="WARNING">Warning</SelectItem>
                                <SelectItem value="INFO">Info</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                                <SelectItem value="RESOLVED">Resolved</SelectItem>
                                <SelectItem value="ESCALATED">Escalated</SelectItem>
                                <SelectItem value="DISMISSED">Dismissed</SelectItem>
                                <SelectItem value="SNOOZED">Snoozed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="text-sm text-muted-foreground">
                Showing {filteredLogs.length} of {total} log entries
            </div>

            {/* Logs Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-[250px]" />
                                        <Skeleton className="h-3 w-[200px]" />
                                    </div>
                                    <Skeleton className="h-6 w-20" />
                                </div>
                            ))}
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-green-600">No Logs Found</h3>
                            <p className="text-muted-foreground text-sm mt-1">
                                {search || alertTypeFilter !== "all" || severityFilter !== "all" || actionFilter !== "all"
                                    ? "No logs match your filters"
                                    : "No alert responses have been logged yet"}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {logCols.map((col) => (
                                        <TableHead key={col} draggable
                                            onDragStart={() => setDragCol(col)}
                                            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                            onDragEnd={() => { reorderCols(logCols, dragCol!, dragOverCol!, setLogCols); setDragCol(null); setDragOverCol(null); }}
                                            className={["cursor-grab active:cursor-grabbing select-none", dragCol === col ? "opacity-40 bg-muted/60" : "", dragOverCol === col && dragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : ""].join(" ")}
                                        >
                                            <span className="flex items-center gap-1"><DotsSixVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />{LOG_DEF[col].label}</span>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        {logCols.map((col) => (<TableCell key={col}>{LOG_DEF[col].cell(log)}</TableCell>))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <CaretLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Next
                            <CaretRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
