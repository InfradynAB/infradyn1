"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Clock, TrendingUp, ChevronRight } from "lucide-react";
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

export function NCRAgingReport({ ncrs = [], loading = false }: NCRAgingReportProps) {
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
                            <TableHead>NCR</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead className="text-right">Days Open</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedNCRs.slice(0, 10).map((ncr) => {
                            const band = getAgingBand(ncr.daysOpen);
                            return (
                                <TableRow key={ncr.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-mono text-sm">{ncr.ncrNumber}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                {ncr.title}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`text-sm font-medium ${SEVERITY_COLORS[ncr.severity]}`}>
                                            {ncr.severity}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {ncr.supplier?.name || "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge className={`${band.color} text-white`}>
                                            {ncr.daysOpen}d
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/procurement/ncr/${ncr.id}`}>
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
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
