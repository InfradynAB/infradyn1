"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    WarningCircle,
    ArrowRight,
    Clock,
    User,
    Package,
    Scales,
    CheckCircle,
    XCircle,
    CaretUp,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { TrustIndicator } from "@/components/shared/trust-indicator";

// --- Types ---
interface ConflictItem {
    id: string;
    type: "QUANTITY_MISMATCH" | "PROGRESS_MISMATCH" | "DATE_VARIANCE" | "EVIDENCE_FAILURE" | "NCR_CONFLICT";
    state: "OPEN" | "REVIEW" | "ESCALATED" | "RESOLVED" | "CLOSED";
    deviationPercent?: number;
    description: string;
    slaDeadline?: Date;
    createdAt: Date;
    escalationLevel: number;
    isCriticalPath: boolean;
    isFinancialMilestone: boolean;
    purchaseOrder: {
        id: string;
        poNumber: string;
    };
    milestone?: {
        id: string;
        title: string;
    };
    assignee?: {
        id: string;
        name: string;
    };
    // Comparison data
    srpValue?: number;
    irpValue?: number;
}

interface ConflictQueueProps {
    conflicts: ConflictItem[];
    onResolve?: (conflictId: string) => void;
    className?: string;
}

const STATE_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
    OPEN: { color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-500/20", label: "Open" },
    REVIEW: { color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-500/20", label: "In Review" },
    ESCALATED: { color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-500/20", label: "Escalated" },
    RESOLVED: { color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-500/20", label: "Resolved" },
    CLOSED: { color: "text-slate-600", bgColor: "bg-slate-100 dark:bg-slate-500/20", label: "Closed" },
};

const TYPE_LABELS: Record<string, string> = {
    QUANTITY_MISMATCH: "Quantity Mismatch",
    PROGRESS_MISMATCH: "Progress Variance",
    DATE_VARIANCE: "Date Variance",
    EVIDENCE_FAILURE: "Evidence Issue",
    NCR_CONFLICT: "NCR Conflict",
};

const ESCALATION_LABELS = ["None", "PM", "Executive", "Finance"];

/**
 * Unified Conflict Queue Component
 * Displays all discrepancies with clear delegation paths and comparison view.
 */
export function ConflictQueue({ conflicts, onResolve, className }: ConflictQueueProps) {
    const [stateFilter, setStateFilter] = useState<string>("ALL");
    const [typeFilter, setTypeFilter] = useState<string>("ALL");

    const filteredConflicts = conflicts.filter((c) => {
        if (stateFilter !== "ALL" && c.state !== stateFilter) return false;
        if (typeFilter !== "ALL" && c.type !== typeFilter) return false;
        return true;
    });

    const openCount = conflicts.filter((c) => c.state === "OPEN").length;
    const escalatedCount = conflicts.filter((c) => c.state === "ESCALATED").length;

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header with Stats */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <WarningCircle className="h-5 w-5 text-red-500" weight="duotone" />
                    <h3 className="font-semibold">Conflict Queue</h3>
                    {openCount > 0 && (
                        <Badge variant="destructive" className="rounded-full">
                            {openCount} Open
                        </Badge>
                    )}
                    {escalatedCount > 0 && (
                        <Badge variant="secondary" className="rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400">
                            {escalatedCount} Escalated
                        </Badge>
                    )}
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <Select value={stateFilter} onValueChange={setStateFilter}>
                        <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All States</SelectItem>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="REVIEW">In Review</SelectItem>
                            <SelectItem value="ESCALATED">Escalated</SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Types</SelectItem>
                            <SelectItem value="PROGRESS_MISMATCH">Progress Variance</SelectItem>
                            <SelectItem value="QUANTITY_MISMATCH">Quantity Mismatch</SelectItem>
                            <SelectItem value="DATE_VARIANCE">Date Variance</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Conflict List */}
            {filteredConflicts.length > 0 ? (
                <div className="space-y-3">
                    {filteredConflicts.map((conflict) => {
                        const stateConfig = STATE_CONFIG[conflict.state];
                        const isOverdue = conflict.slaDeadline && new Date(conflict.slaDeadline) < new Date();

                        return (
                            <Card key={conflict.id} className={cn("transition-shadow hover:shadow-md", isOverdue && "border-red-500")}>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        {/* Status Icon */}
                                        <div className={cn("p-2 rounded-lg shrink-0", stateConfig.bgColor)}>
                                            <WarningCircle className={cn("h-5 w-5", stateConfig.color)} weight="duotone" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", stateConfig.bgColor, stateConfig.color)}>
                                                    {stateConfig.label}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {TYPE_LABELS[conflict.type]}
                                                </span>
                                                {conflict.isCriticalPath && (
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20">
                                                        Critical Path
                                                    </span>
                                                )}
                                                {conflict.isFinancialMilestone && (
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20">
                                                        Financial
                                                    </span>
                                                )}
                                            </div>

                                            <p className="font-medium text-sm mb-2">{conflict.description}</p>

                                            {/* Comparison View for Progress Mismatch */}
                                            {conflict.type === "PROGRESS_MISMATCH" && conflict.srpValue !== undefined && conflict.irpValue !== undefined && (
                                                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <TrustIndicator level="VERIFIED" size="sm" showLabel={false} />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Supplier</p>
                                                            <p className="font-bold text-lg">{conflict.srpValue}%</p>
                                                        </div>
                                                    </div>
                                                    <Scales className="h-6 w-6 text-muted-foreground" />
                                                    <div className="flex items-center gap-2">
                                                        <TrustIndicator level="INTERNAL" size="sm" showLabel={false} />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Internal</p>
                                                            <p className="font-bold text-lg">{conflict.irpValue}%</p>
                                                        </div>
                                                    </div>
                                                    <div className="ml-auto text-right">
                                                        <p className="text-xs text-muted-foreground">Deviation</p>
                                                        <p className="font-bold text-lg text-red-600">
                                                            {conflict.deviationPercent}%
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Meta Info */}
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <Link href={`/dashboard/procurement/pos/${conflict.purchaseOrder.id}`} className="flex items-center gap-1 hover:text-foreground">
                                                    <Package className="h-3.5 w-3.5" />
                                                    {conflict.purchaseOrder.poNumber}
                                                </Link>
                                                {conflict.milestone && (
                                                    <span className="flex items-center gap-1">
                                                        <CheckCircle className="h-3.5 w-3.5" />
                                                        {conflict.milestone.title}
                                                    </span>
                                                )}
                                                {conflict.assignee && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3.5 w-3.5" />
                                                        {conflict.assignee.name}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {formatDistanceToNow(new Date(conflict.createdAt), { addSuffix: true })}
                                                </span>
                                                {conflict.escalationLevel > 0 && (
                                                    <span className="flex items-center gap-1 text-purple-600">
                                                        <CaretUp className="h-3.5 w-3.5" />
                                                        {ESCALATION_LABELS[conflict.escalationLevel]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="shrink-0 flex flex-col gap-2">
                                            <Link href={`/dashboard/procurement/pos/${conflict.purchaseOrder.id}?conflict=${conflict.id}`}>
                                                <Button size="sm" variant="outline" className="gap-1">
                                                    View <ArrowRight className="h-3.5 w-3.5" />
                                                </Button>
                                            </Link>
                                            {conflict.state === "OPEN" && onResolve && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => onResolve(conflict.id)}
                                                >
                                                    <CheckCircle className="h-3.5 w-3.5" /> Resolve
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 rounded-xl border border-dashed">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500/30 mb-3" />
                    <p className="text-muted-foreground">No conflicts found</p>
                    <p className="text-sm text-muted-foreground/70">
                        {stateFilter !== "ALL" || typeFilter !== "ALL" ? "Try clearing filters" : "All clear!"}
                    </p>
                </div>
            )}
        </div>
    );
}
