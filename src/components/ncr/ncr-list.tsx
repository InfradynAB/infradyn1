"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Clock, CheckCircle, AlertCircle, Plus } from "lucide-react";
import { format } from "date-fns";

// Types
type NCRSeverity = "MINOR" | "MAJOR" | "CRITICAL";
type NCRStatus = "OPEN" | "SUPPLIER_RESPONDED" | "REINSPECTION" | "REVIEW" | "REMEDIATION" | "CLOSED";

interface NCR {
    id: string;
    ncrNumber: string;
    title: string;
    severity: NCRSeverity;
    status: NCRStatus;
    issueType: string;
    slaDueAt: string | null;
    createdAt: string;
    supplier?: { name: string } | null;
    purchaseOrder?: { poNumber: string } | null;
    reporter?: { name: string } | null;
}

interface NCRListProps {
    organizationId: string;
    purchaseOrderId?: string;
    onCreateNCR?: () => void;
    onViewNCR?: (ncrId: string) => void;
}

// Severity Badge Component
function SeverityBadge({ severity }: { severity: NCRSeverity }) {
    const config = {
        CRITICAL: { color: "bg-red-500 text-white", icon: AlertTriangle },
        MAJOR: { color: "bg-orange-500 text-white", icon: AlertCircle },
        MINOR: { color: "bg-yellow-500 text-black", icon: Clock },
    };

    const { color, icon: Icon } = config[severity];

    return (
        <Badge className={`${color} flex items-center gap-1`}>
            <Icon className="h-3 w-3" />
            {severity}
        </Badge>
    );
}

// Status Badge Component
function StatusBadge({ status }: { status: NCRStatus }) {
    const config: Record<NCRStatus, { color: string; label: string }> = {
        OPEN: { color: "bg-blue-500 text-white", label: "Open" },
        SUPPLIER_RESPONDED: { color: "bg-purple-500 text-white", label: "Supplier Responded" },
        REINSPECTION: { color: "bg-cyan-500 text-white", label: "Re-inspection" },
        REVIEW: { color: "bg-indigo-500 text-white", label: "Under Review" },
        REMEDIATION: { color: "bg-amber-500 text-white", label: "Remediation" },
        CLOSED: { color: "bg-green-500 text-white", label: "Closed" },
    };

    const { color, label } = config[status];

    return <Badge className={color}>{label}</Badge>;
}

// SLA Indicator Component
function SLAIndicator({ slaDueAt, status }: { slaDueAt: string | null; status: NCRStatus }) {
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
}

// Main NCR List Component
export function NCRList({ organizationId, purchaseOrderId, onCreateNCR, onViewNCR }: NCRListProps) {
    const [ncrs, setNCRs] = useState<NCR[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [severityFilter, setSeverityFilter] = useState<string>("all");

    useEffect(() => {
        fetchNCRs();
    }, [organizationId, purchaseOrderId]);

    const fetchNCRs = async () => {
        try {
            const params = new URLSearchParams();
            if (purchaseOrderId) {
                params.append("purchaseOrderId", purchaseOrderId);
            } else {
                params.append("organizationId", organizationId);
            }

            const res = await fetch(`/api/ncr?${params.toString()}`);
            const result = await res.json();

            if (result.success) {
                setNCRs(result.data?.ncrs || result.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch NCRs:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter NCRs
    const filteredNCRs = ncrs.filter(ncr => {
        if (statusFilter !== "all" && ncr.status !== statusFilter) return false;
        if (severityFilter !== "all" && ncr.severity !== severityFilter) return false;
        return true;
    });

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    Loading NCRs...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold">
                    Non-Conformance Reports
                </CardTitle>
                {onCreateNCR && (
                    <Button onClick={onCreateNCR} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        New NCR
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {/* Filters */}
                <div className="flex gap-3 mb-4">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="SUPPLIER_RESPONDED">Supplier Responded</SelectItem>
                            <SelectItem value="REINSPECTION">Re-inspection</SelectItem>
                            <SelectItem value="REVIEW">Under Review</SelectItem>
                            <SelectItem value="REMEDIATION">Remediation</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Severity</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                            <SelectItem value="MAJOR">Major</SelectItem>
                            <SelectItem value="MINOR">Minor</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                {filteredNCRs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                        <p>No NCRs found</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>NCR #</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>PO</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>SLA</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredNCRs.map((ncr) => (
                                <TableRow
                                    key={ncr.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => onViewNCR?.(ncr.id)}
                                >
                                    <TableCell className="font-mono text-sm">
                                        {ncr.ncrNumber}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate">
                                        {ncr.title}
                                    </TableCell>
                                    <TableCell>
                                        <SeverityBadge severity={ncr.severity} />
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={ncr.status} />
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                        {ncr.purchaseOrder?.poNumber || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {ncr.supplier?.name || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <SLAIndicator slaDueAt={ncr.slaDueAt} status={ncr.status} />
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(new Date(ncr.createdAt), "MMM d, yyyy")}
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

export { SeverityBadge, StatusBadge, SLAIndicator };
