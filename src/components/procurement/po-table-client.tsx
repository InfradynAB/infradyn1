"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon, ChartLineUpIcon, DotsSixVertical } from "@phosphor-icons/react/dist/ssr";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { POActions } from "@/components/procurement/po-actions";

// Status badge color mapping with visual indicators
const statusColors: Record<string, string> = {
    DRAFT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200",
    ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200",
    COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200",
    CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200",
};

const statusIcons: Record<string, string> = {
    DRAFT: "🟡",
    ACTIVE: "🟢",
    COMPLETED: "🔵",
    CANCELLED: "🔴",
};

const statusLabels: Record<string, string> = {
    DRAFT: "Draft",
    ACTIVE: "Active",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

// Get primary action for each PO status
function getPrimaryAction(status: string, poId: string, poNumber: string) {
    switch (status) {
        case "DRAFT":
            return {
                label: "View Details",
                href: `/dashboard/procurement/${poId}`,
                variant: "outline" as const,
            };
        case "ACTIVE":
            return {
                label: "Track Progress",
                href: `/dashboard/procurement/${poId}#milestones`,
                variant: "outline" as const,
            };
        case "COMPLETED":
            return {
                label: "View Summary",
                href: `/dashboard/procurement/${poId}`,
                variant: "ghost" as const,
            };
        default:
            return {
                label: "View Details",
                href: `/dashboard/procurement/${poId}`,
                variant: "outline" as const,
            };
    }
}

interface POTableClientProps {
    purchaseOrders: any[];
}

function reorderCols(
    arr: string[],
    from: string,
    to: string,
    setter: (val: string[]) => void
) {
    const next = [...arr];
    const fi = next.indexOf(from);
    const ti = next.indexOf(to);
    if (fi < 0 || ti < 0) return;
    next.splice(fi, 1);
    next.splice(ti, 0, from);
    setter(next);
}

export function POTableClient({ purchaseOrders }: POTableClientProps) {
    const router = useRouter();
    const [poCols, setPoCols] = useState(["poNumber", "project", "supplier", "value", "status", "lastActivity"]);
    const [dragCol, setDragCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const handleRowClick = (poId: string) => {
        router.push(`/dashboard/procurement/${poId}`);
    };

    const PO_DEF: Record<string, { label: string; hCls?: string; cell: (po: any) => ReactNode }> = {
        poNumber:     { label: "PO Number",     hCls: "font-semibold",              cell: (po) => <div className="text-primary font-semibold flex items-center gap-2">{po.poNumber}<ArrowRightIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div> },
        project:      { label: "Project",       hCls: "font-semibold",              cell: (po) => <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-foreground">{po.project?.name || "\u2014"}</span></div> },
        supplier:     { label: "Supplier",      hCls: "font-semibold",              cell: (po) => <span className="text-foreground">{po.supplier?.name || "\u2014"}</span> },
        value:        { label: "Value",         hCls: "text-right font-semibold",   cell: (po) => <div className="font-mono font-semibold text-right">{po.currency} {Number(po.totalValue ?? 0).toLocaleString()}</div> },
        status:       { label: "Status",        hCls: "font-semibold",              cell: (po) => <Badge variant="secondary" className={cn("border", statusColors[po.status] || "")}><span className="mr-1">{statusIcons[po.status]}</span>{statusLabels[po.status] || po.status}</Badge> },
        lastActivity: { label: "Last Activity", hCls: "font-semibold",              cell: (po) => <span className="text-muted-foreground text-sm">{formatDistanceToNow(new Date(po.updatedAt), { addSuffix: true })}</span> },
    };

    return (
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        {poCols.map((col) => (
                            <TableHead
                                key={col}
                                draggable
                                onDragStart={() => setDragCol(col)}
                                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                onDragEnd={() => { reorderCols(poCols, dragCol!, dragOverCol!, setPoCols); setDragCol(null); setDragOverCol(null); }}
                                className={[
                                    "cursor-grab active:cursor-grabbing select-none",
                                    PO_DEF[col].hCls ?? "",
                                    dragCol === col ? "opacity-40 bg-muted/60" : "",
                                    dragOverCol === col && dragCol !== col ? "bg-[#0E7490]/20 border-l-2 border-l-[#0E7490]" : "",
                                ].join(" ")}
                            >
                                <span className="flex items-center gap-1">
                                    <DotsSixVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                    {PO_DEF[col].label}
                                </span>
                            </TableHead>
                        ))}
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {purchaseOrders.map((po: any) => (
                        <TableRow 
                            key={po.id} 
                            className="group hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => handleRowClick(po.id)}
                        >
                            {poCols.map((col) => (
                                <TableCell key={col}>{PO_DEF[col].cell(po)}</TableCell>
                            ))}
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="sm"
                                        title="View Analytics"
                                    >
                                        <Link href={`/dashboard/procurement/${po.id}/analytics`}>
                                            <ChartLineUpIcon className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    {(() => {
                                        const action = getPrimaryAction(po.status, po.id, po.poNumber);
                                        return (
                                            <Button
                                                asChild
                                                variant={action.variant}
                                                size="sm"
                                            >
                                                <Link href={action.href}>
                                                    {action.label}
                                                </Link>
                                            </Button>
                                        );
                                    })()}
                                    <POActions poId={po.id} poNumber={po.poNumber} />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
