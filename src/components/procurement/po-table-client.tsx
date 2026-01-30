"use client";

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
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
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

export function POTableClient({ purchaseOrders }: POTableClientProps) {
    const router = useRouter();

    const handleRowClick = (poId: string) => {
        router.push(`/dashboard/procurement/${poId}`);
    };

    return (
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">PO Number</TableHead>
                        <TableHead className="font-semibold">Project</TableHead>
                        <TableHead className="font-semibold">Supplier</TableHead>
                        <TableHead className="text-right font-semibold">Value</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Last Activity</TableHead>
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
                            <TableCell className="font-medium">
                                <div className="text-primary font-semibold flex items-center gap-2">
                                    {po.poNumber}
                                    <ArrowRightIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    <span className="text-foreground">{po.project?.name || "—"}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="text-foreground">{po.supplier?.name || "—"}</span>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="font-mono font-semibold">
                                    {po.currency} {Number(po.totalValue ?? 0).toLocaleString()}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant="secondary"
                                    className={cn("border", statusColors[po.status] || "")}
                                >
                                    <span className="mr-1">{statusIcons[po.status]}</span>
                                    {statusLabels[po.status] || po.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                                {formatDistanceToNow(new Date(po.updatedAt), {
                                    addSuffix: true,
                                })}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2">
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
