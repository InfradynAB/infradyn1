"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    Clock,
    ChartLineUp,
    WarningCircle,
    CheckCircle,
    Package,
    FileText,
    ArrowRight,
    CaretDown,
    CaretUp,
    Calendar,
} from "@phosphor-icons/react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { TrustIndicator, TrustLevel } from "@/components/shared/trust-indicator";
import Link from "next/link";

// --- Types ---
interface HistoryItem {
    type: "progress" | "conflict" | "milestone" | "document";
    date: Date;
    title: string;
    description: string;
    projectName?: string;
    poNumber?: string;
    metadata?: Record<string, any>;
}

interface SupplierHistoryTimelineProps {
    supplierId: string;
    supplierName: string;
    history: HistoryItem[];
    className?: string;
}

const TYPE_CONFIG: Record<string, {
    icon: typeof ChartLineUp;
    color: string;
    bgColor: string;
    label: string;
}> = {
    progress: {
        icon: ChartLineUp,
        color: "text-blue-600",
        bgColor: "bg-blue-100 dark:bg-blue-500/20",
        label: "Progress Update",
    },
    conflict: {
        icon: WarningCircle,
        color: "text-red-600",
        bgColor: "bg-red-100 dark:bg-red-500/20",
        label: "Conflict",
    },
    milestone: {
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-100 dark:bg-green-500/20",
        label: "Milestone",
    },
    document: {
        icon: FileText,
        color: "text-purple-600",
        bgColor: "bg-purple-100 dark:bg-purple-500/20",
        label: "Document",
    },
};

/**
 * Supplier History Timeline
 * Consolidated view of all supplier activity across projects.
 * Critical for Phase 5 supplier assessment.
 */
export function SupplierHistoryTimeline({
    supplierId,
    supplierName,
    history,
    className,
}: SupplierHistoryTimelineProps) {
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [projectFilter, setProjectFilter] = useState<string>("ALL");
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    // Get unique projects for filter
    const projects = [...new Set(history.map((h) => h.projectName).filter(Boolean))];

    // Filter history
    const filteredHistory = history.filter((item) => {
        if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
        if (projectFilter !== "ALL" && item.projectName !== projectFilter) return false;
        return true;
    });

    // Group by month
    const groupedByMonth: Record<string, HistoryItem[]> = {};
    filteredHistory.forEach((item) => {
        const monthKey = format(new Date(item.date), "MMMM yyyy");
        if (!groupedByMonth[monthKey]) {
            groupedByMonth[monthKey] = [];
        }
        groupedByMonth[monthKey].push(item);
    });

    const toggleExpand = (index: number) => {
        setExpanded((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    // Stats
    const progressCount = history.filter((h) => h.type === "progress").length;
    const conflictCount = history.filter((h) => h.type === "conflict").length;
    const milestoneCount = history.filter((h) => h.type === "milestone").length;

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{supplierName}</h2>
                    <p className="text-muted-foreground">Consolidated history across all projects</p>
                </div>
                <div className="flex gap-2">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Types</SelectItem>
                            <SelectItem value="progress">Progress</SelectItem>
                            <SelectItem value="conflict">Conflicts</SelectItem>
                            <SelectItem value="milestone">Milestones</SelectItem>
                            <SelectItem value="document">Documents</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Project" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Projects</SelectItem>
                            {projects.map((proj) => (
                                <SelectItem key={proj} value={proj!}>
                                    {proj}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                                <ChartLineUp className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{progressCount}</p>
                                <p className="text-xs text-muted-foreground">Progress Updates</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20">
                                <WarningCircle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{conflictCount}</p>
                                <p className="text-xs text-muted-foreground">Conflicts</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/20">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{milestoneCount}</p>
                                <p className="text-xs text-muted-foreground">Milestones</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Activity Timeline
                    </CardTitle>
                    <CardDescription>
                        {filteredHistory.length} events across {projects.length} projects
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {Object.keys(groupedByMonth).length > 0 ? (
                        <div className="space-y-8">
                            {Object.entries(groupedByMonth).map(([month, items]) => (
                                <div key={month}>
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {month}
                                    </h3>
                                    <div className="relative border-l-2 border-muted pl-6 space-y-6">
                                        {items.map((item, index) => {
                                            const config = TYPE_CONFIG[item.type];
                                            const Icon = config.icon;
                                            const isExpanded = expanded.has(index);

                                            return (
                                                <div key={index} className="relative">
                                                    {/* Timeline Dot */}
                                                    <div className={cn(
                                                        "absolute -left-9 w-4 h-4 rounded-full border-2 border-background",
                                                        config.bgColor
                                                    )} />

                                                    {/* Content */}
                                                    <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                                                        <div className="flex items-start gap-3">
                                                            <div className={cn("p-2 rounded-lg shrink-0", config.bgColor)}>
                                                                <Icon className={cn("h-4 w-4", config.color)} weight="duotone" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-medium">{item.title}</span>
                                                                    {item.metadata?.trustLevel && (
                                                                        <TrustIndicator
                                                                            level={item.metadata.trustLevel as TrustLevel}
                                                                            size="sm"
                                                                            showLabel={false}
                                                                        />
                                                                    )}
                                                                    {item.metadata?.isForecast && (
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            ⚠ Forecast
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                                    {item.description}
                                                                </p>
                                                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                                                                    </span>
                                                                    {item.projectName && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Package className="h-3 w-3" />
                                                                            {item.projectName}
                                                                        </span>
                                                                    )}
                                                                    {item.poNumber && (
                                                                        <Link
                                                                            href={`/dashboard/procurement/pos/${item.poNumber}`}
                                                                            className="flex items-center gap-1 hover:text-foreground"
                                                                        >
                                                                            {item.poNumber}
                                                                            <ArrowRight className="h-3 w-3" />
                                                                        </Link>
                                                                    )}
                                                                </div>

                                                                {/* Expandable Metadata */}
                                                                {item.metadata && Object.keys(item.metadata).length > 0 && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="mt-2 h-6 text-xs"
                                                                        onClick={() => toggleExpand(index)}
                                                                    >
                                                                        {isExpanded ? (
                                                                            <>Hide Details <CaretUp className="h-3 w-3 ml-1" /></>
                                                                        ) : (
                                                                            <>Show Details <CaretDown className="h-3 w-3 ml-1" /></>
                                                                        )}
                                                                    </Button>
                                                                )}
                                                                {isExpanded && item.metadata && (
                                                                    <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                                                                        <pre className="whitespace-pre-wrap">
                                                                            {JSON.stringify(item.metadata, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground">No history found</p>
                            <p className="text-sm text-muted-foreground/70">
                                {typeFilter !== "ALL" || projectFilter !== "ALL"
                                    ? "Try clearing filters"
                                    : "Activity will appear here as it happens"}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
