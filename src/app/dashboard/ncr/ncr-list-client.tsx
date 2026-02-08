"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
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
    ShieldCheck,
    ArrowsClockwise,
    Funnel,
    MagnifyingGlass,
    CheckCircle,
    Warning as WarningIcon,
    XCircle,
    Clock,
    ArrowRight,
} from "@phosphor-icons/react";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface NCR {
    id: string;
    ncrNumber: string;
    title: string;
    description: string | null;
    status: "OPEN" | "SUPPLIER_RESPONDED" | "REINSPECTION" | "REVIEW" | "REMEDIATION" | "CLOSED";
    severity: "CRITICAL" | "MAJOR" | "MINOR";
    slaDueAt: string | null;
    createdAt: string;
    purchaseOrder?: {
        id: string;
        poNumber: string;
        project?: {
            id: string;
            name: string;
        } | null;
    } | null;
    supplier?: {
        id: string;
        name: string;
    } | null;
    reporter?: {
        name: string;
    } | null;
}

interface NCRListPageClientProps {
    organizationId: string;
    initialFilter?: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    OPEN: { color: "bg-blue-500 text-white", label: "Open" },
    SUPPLIER_RESPONDED: { color: "bg-purple-500 text-white", label: "Supplier Responded" },
    REINSPECTION: { color: "bg-cyan-500 text-white", label: "Re-inspection" },
    REVIEW: { color: "bg-indigo-500 text-white", label: "Under Review" },
    REMEDIATION: { color: "bg-amber-500 text-white", label: "Remediation" },
    CLOSED: { color: "bg-green-500 text-white", label: "Closed" },
};

const SEVERITY_CONFIG = {
    CRITICAL: { color: "bg-red-500 text-white", icon: AlertTriangle },
    MAJOR: { color: "bg-orange-500 text-white", icon: AlertCircle },
    MINOR: { color: "bg-yellow-500 text-black", icon: Clock },
};

export function NCRListPageClient({ organizationId, initialFilter }: NCRListPageClientProps) {
    const [ncrs, setNCRs] = useState<NCR[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>(initialFilter === "critical" ? "all" : "all");
    const [severityFilter, setSeverityFilter] = useState<string>(initialFilter === "critical" ? "CRITICAL" : "all");
    const [search, setSearch] = useState("");

    const fetchNCRs = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await fetch(`/api/ncr?organizationId=${organizationId}`);
            if (!response.ok) throw new Error("Failed to fetch");
            
            const result = await response.json();
            if (result.success) {
                setNCRs(result.data || []);
            }
        } catch (error) {
            console.error("Error fetching NCRs:", error);
            toast.error("Failed to load NCRs");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [organizationId]);

    useEffect(() => {
        fetchNCRs();
    }, [fetchNCRs]);

    const handleRefresh = () => {
        fetchNCRs(true);
        toast.success("NCRs refreshed");
    };

    const getSLAStatus = (slaDueAt: string | null, status: string) => {
        if (status === "CLOSED" || !slaDueAt) return null;

        const dueDate = new Date(slaDueAt);
        const now = new Date();
        const hoursRemaining = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursRemaining < 0) {
            return (
                <span className="text-red-500 font-semibold text-xs flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    OVERDUE
                </span>
            );
        } else if (hoursRemaining < 24) {
            return (
                <span className="text-orange-500 text-xs">
                    {Math.round(hoursRemaining)}h left
                </span>
            );
        } else {
            return (
                <span className="text-muted-foreground text-xs">
                    {Math.ceil(hoursRemaining / 24)}d left
                </span>
            );
        }
    };

    const filteredNCRs = ncrs.filter((ncr) => {
        if (statusFilter !== "all" && ncr.status !== statusFilter) return false;
        if (severityFilter !== "all" && ncr.severity !== severityFilter) return false;
        
        if (search) {
            const searchLower = search.toLowerCase();
            return (
                ncr.ncrNumber.toLowerCase().includes(searchLower) ||
                ncr.title.toLowerCase().includes(searchLower) ||
                ncr.supplier?.name.toLowerCase().includes(searchLower) ||
                ncr.purchaseOrder?.poNumber.toLowerCase().includes(searchLower) ||
                ncr.purchaseOrder?.project?.name.toLowerCase().includes(searchLower)
            );
        }
        
        return true;
    });

    // Stats
    const openCount = ncrs.filter(n => n.status !== "CLOSED").length;
    const criticalCount = ncrs.filter(n => n.severity === "CRITICAL" && n.status !== "CLOSED").length;
    const overdueCount = ncrs.filter(n => {
        if (n.status === "CLOSED" || !n.slaDueAt) return false;
        return new Date(n.slaDueAt) < new Date();
    }).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-3">
                        <ShieldCheck className="h-7 w-7 text-primary" weight="duotone" />
                        NCR Management
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Non-Conformance Reports across all projects
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

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-blue-500/10">
                            <ShieldCheck className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{openCount}</p>
                            <p className="text-sm text-muted-foreground">Open NCRs</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className={criticalCount > 0 ? "border-red-200 bg-red-50/50" : ""}>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-red-500/10">
                            <XCircle className="h-5 w-5 text-red-500" weight="fill" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{criticalCount}</p>
                            <p className="text-sm text-muted-foreground">Critical</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className={overdueCount > 0 ? "border-amber-200 bg-amber-50/50" : ""}>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-amber-500/10">
                            <WarningIcon className="h-5 w-5 text-amber-500" weight="fill" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{overdueCount}</p>
                            <p className="text-sm text-muted-foreground">Overdue SLA</p>
                        </div>
                    </CardContent>
                </Card>
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
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="relative">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search NCRs..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="OPEN">Open</SelectItem>
                                <SelectItem value="SUPPLIER_RESPONDED">Supplier Responded</SelectItem>
                                <SelectItem value="REINSPECTION">Re-inspection</SelectItem>
                                <SelectItem value="REVIEW">Under Review</SelectItem>
                                <SelectItem value="REMEDIATION">Remediation</SelectItem>
                                <SelectItem value="CLOSED">Closed</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={severityFilter} onValueChange={setSeverityFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Severity" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Severities</SelectItem>
                                <SelectItem value="CRITICAL">Critical</SelectItem>
                                <SelectItem value="MAJOR">Major</SelectItem>
                                <SelectItem value="MINOR">Minor</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="text-sm text-muted-foreground">
                Showing {filteredNCRs.length} of {ncrs.length} NCRs
            </div>

            {/* NCR Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-6 w-24" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-[250px]" />
                                        <Skeleton className="h-3 w-[200px]" />
                                    </div>
                                    <Skeleton className="h-6 w-20" />
                                </div>
                            ))}
                        </div>
                    ) : filteredNCRs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <CheckCircle className="h-8 w-8 text-green-500" weight="fill" />
                            </div>
                            <h3 className="text-lg font-semibold text-green-600">No NCRs Found</h3>
                            <p className="text-muted-foreground text-sm mt-1">
                                {search || statusFilter !== "all" || severityFilter !== "all"
                                    ? "No NCRs match your filters"
                                    : "No non-conformance reports to display"}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>NCR #</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Severity</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>PO / Project</TableHead>
                                    <TableHead>SLA</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredNCRs.map((ncr) => {
                                    const severityConfig = SEVERITY_CONFIG[ncr.severity];
                                    const SeverityIcon = severityConfig.icon;
                                    const statusConfig = STATUS_CONFIG[ncr.status];
                                    
                                    return (
                                        <TableRow key={ncr.id}>
                                            <TableCell className="font-mono font-medium">
                                                {ncr.ncrNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-[200px]">
                                                    <div className="font-medium truncate">{ncr.title}</div>
                                                    {ncr.reporter?.name && (
                                                        <div className="text-xs text-muted-foreground">
                                                            by {ncr.reporter.name}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn(severityConfig.color, "flex items-center gap-1 w-fit")}>
                                                    <SeverityIcon className="h-3 w-3" />
                                                    {ncr.severity}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusConfig.color}>
                                                    {statusConfig.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {ncr.supplier?.name || "—"}
                                            </TableCell>
                                            <TableCell>
                                                {ncr.purchaseOrder ? (
                                                    <div>
                                                        <div className="font-mono text-sm">{ncr.purchaseOrder.poNumber}</div>
                                                        {ncr.purchaseOrder.project && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {ncr.purchaseOrder.project.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    "—"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {getSLAStatus(ncr.slaDueAt, ncr.status)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {format(new Date(ncr.createdAt), "MMM d")}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(ncr.createdAt), { addSuffix: true })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link href={`/dashboard/procurement/ncr/${ncr.id}`}>
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
