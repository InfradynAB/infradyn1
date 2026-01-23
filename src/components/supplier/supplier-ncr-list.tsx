"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, MessageSquare, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface NCR {
    id: string;
    ncrNumber: string;
    title: string;
    severity: string;
    status: string;
    issueType: string;
    slaDueAt: string | null;
    createdAt: string;
}

interface SupplierNCRListProps {
    purchaseOrderId: string;
    supplierId: string;
}

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
    CRITICAL: { color: "bg-red-500 text-white", label: "Critical" },
    MAJOR: { color: "bg-orange-500 text-white", label: "Major" },
    MINOR: { color: "bg-yellow-500 text-black", label: "Minor" },
};

const STATUS_LABELS: Record<string, string> = {
    OPEN: "Awaiting Your Response",
    SUPPLIER_RESPONDED: "Response Received",
    REINSPECTION: "Under Re-inspection",
    REVIEW: "Under Review",
    REMEDIATION: "Remediation",
    CLOSED: "Resolved",
};

export function SupplierNCRList({ purchaseOrderId, supplierId }: SupplierNCRListProps) {
    const [ncrs, setNCRs] = useState<NCR[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNCRs();
    }, [purchaseOrderId]);

    const fetchNCRs = async () => {
        try {
            const res = await fetch(`/api/ncr?purchaseOrderId=${purchaseOrderId}`);
            const result = await res.json();
            if (result.success) {
                setNCRs(result.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch NCRs:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter to show only non-closed NCRs for suppliers
    const openNCRs = ncrs.filter(n => n.status !== "CLOSED");
    const closedNCRs = ncrs.filter(n => n.status === "CLOSED");

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Quality Issues
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (ncrs.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                        Quality Issues
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-6">
                    <p className="text-muted-foreground">No quality issues reported</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        You will be notified if any NCRs are raised
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={openNCRs.length > 0 ? "border-orange-300" : ""}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className={`h-5 w-5 ${openNCRs.length > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
                        Quality Issues
                    </CardTitle>
                    {openNCRs.length > 0 && (
                        <Badge variant="destructive">
                            {openNCRs.length} Open
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Open NCRs requiring attention */}
                {openNCRs.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-orange-600">Requires Your Attention</p>
                        {openNCRs.map((ncr) => {
                            const severity = SEVERITY_CONFIG[ncr.severity] || SEVERITY_CONFIG.MINOR;
                            const isOverdue = ncr.slaDueAt && new Date(ncr.slaDueAt) < new Date();

                            return (
                                <div
                                    key={ncr.id}
                                    className={`p-4 rounded-lg border ${isOverdue ? "bg-red-50 border-red-200" : "bg-muted/50"}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm text-muted-foreground">
                                                    {ncr.ncrNumber}
                                                </span>
                                                <Badge className={severity.color}>
                                                    {severity.label}
                                                </Badge>
                                                {isOverdue && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        OVERDUE
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="font-medium">{ncr.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Status: {STATUS_LABELS[ncr.status] || ncr.status}
                                            </p>
                                        </div>
                                        <Button size="sm" variant="outline" asChild>
                                            <a href={`/dashboard/supplier/ncr/${ncr.id}`}>
                                                <MessageSquare className="h-4 w-4 mr-1" />
                                                Respond
                                            </a>
                                        </Button>
                                    </div>
                                    {ncr.slaDueAt && !isOverdue && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            Response due: {format(new Date(ncr.slaDueAt), "MMM d, h:mm a")}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Closed NCRs */}
                {closedNCRs.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                            Resolved ({closedNCRs.length})
                        </p>
                        {closedNCRs.slice(0, 3).map((ncr) => (
                            <div
                                key={ncr.id}
                                className="p-3 rounded-lg bg-muted/30 text-sm flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-muted-foreground">
                                        {ncr.ncrNumber}
                                    </span>
                                    <span>{ncr.title}</span>
                                </div>
                                <Badge variant="outline" className="text-green-600 border-green-300">
                                    Resolved
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
