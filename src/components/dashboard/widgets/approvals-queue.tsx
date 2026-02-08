"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Eye,
    CheckCircle,
    Clock,
    Warning,
    CaretRight,
    FunnelSimple,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ApprovalItem {
    id: string;
    type: "invoice" | "change_order" | "milestone" | "ncr" | "document";
    title: string;
    reference: string;
    requestedBy: string;
    requestedAt: Date;
    amount?: number;
    priority: "low" | "normal" | "high" | "urgent";
    status: "pending" | "in-review" | "awaiting-info";
}

interface ApprovalsQueueProps {
    data: ApprovalItem[];
    onApprove?: (id: string) => void;
    onReview?: (id: string) => void;
    currency?: string;
}

const TYPE_CONFIG = {
    invoice: { label: "Invoice", class: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
    change_order: { label: "CO", class: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
    milestone: { label: "Milestone", class: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800" },
    ncr: { label: "NCR", class: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" },
    document: { label: "Document", class: "bg-muted text-muted-foreground" },
};

const PRIORITY_CONFIG = {
    low: { label: "Low", class: "text-muted-foreground" },
    normal: { label: "Normal", class: "text-blue-600 dark:text-blue-400" },
    high: { label: "High", class: "text-amber-600 dark:text-amber-400" },
    urgent: { label: "Urgent", class: "text-red-600 dark:text-red-400 animate-pulse" },
};

const STATUS_ICON = { pending: Clock, "in-review": Eye, "awaiting-info": Warning };

const formatCurrency = (value: number | undefined, currency = "USD") => {
    if (!value) return "";
    if (value >= 1_000_000) return `${currency} ${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${currency} ${(value / 1_000).toFixed(1)}K`;
    return `${currency} ${value.toFixed(0)}`;
};

const formatTimeAgo = (date: Date): string => {
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
};

export function ApprovalsQueue({ data, onReview, currency = "USD" }: ApprovalsQueueProps) {
    const [filter, setFilter] = useState<string | null>(null);

    const filteredData = filter ? data.filter(item => item.type === filter) : data;
    const sortedData = [...filteredData].sort((a, b) => {
        const order = { urgent: 0, high: 1, normal: 2, low: 3 };
        if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
        return b.requestedAt.getTime() - a.requestedAt.getTime();
    });

    const urgentCount = data.filter(d => d.priority === "urgent").length;

    return (
        <Card className="shadow-none border">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">Approvals Queue</CardTitle>
                        <CardDescription>{data.length} items awaiting action</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {urgentCount > 0 && (
                            <Badge variant="destructive" className="text-xs animate-pulse">{urgentCount} Urgent</Badge>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                    <FunnelSimple className="w-3.5 h-3.5 mr-1" />
                                    {filter ? TYPE_CONFIG[filter as keyof typeof TYPE_CONFIG]?.label : "All"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setFilter(null)}>All Types</DropdownMenuItem>
                                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                                    <DropdownMenuItem key={key} onClick={() => setFilter(key)}>{config.label}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {sortedData.length === 0 ? (
                    <div className="py-10 text-center">
                        <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
                        <p className="font-medium">All Clear</p>
                        <p className="text-xs text-muted-foreground mt-0.5">No items pending approval</p>
                    </div>
                ) : (
                    <div className="divide-y max-h-[380px] overflow-y-auto">
                        {sortedData.map((item) => {
                            const StatusIcon = STATUS_ICON[item.status];
                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer group",
                                        item.priority === "urgent" && "bg-red-500/5"
                                    )}
                                    onClick={() => onReview?.(item.id)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TYPE_CONFIG[item.type].class)}>
                                                    {TYPE_CONFIG[item.type].label}
                                                </Badge>
                                                <span className={cn("text-[10px] font-medium", PRIORITY_CONFIG[item.priority].class)}>
                                                    {PRIORITY_CONFIG[item.priority].label}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium truncate">{item.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                                <span className="font-mono">{item.reference}</span>
                                                <span>·</span>
                                                <span>{item.requestedBy}</span>
                                                <span>·</span>
                                                <span>{formatTimeAgo(item.requestedAt)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 pt-1">
                                            {item.amount && (
                                                <span className="font-mono text-xs font-medium">{formatCurrency(item.amount, currency)}</span>
                                            )}
                                            <StatusIcon className="w-4 h-4 text-muted-foreground" />
                                            <CaretRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
