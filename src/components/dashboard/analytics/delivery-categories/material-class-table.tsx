import type { MaterialClassRow } from "@/lib/actions/delivery-analytics";
import { StatusBadge } from "./status-badge";
import { ChevronRight, Package } from "lucide-react";
import Link from "next/link";

interface Props {
    rows: MaterialClassRow[];
    disciplineLabel: string;
    onMaterialClassClick: (materialClass: string) => void;
}

export function MaterialClassTable({
    rows,
    disciplineLabel,
    onMaterialClassClick,
}: Props) {
    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <Package className="h-8 w-8 opacity-40" />
                <p className="text-sm">No items found for {disciplineLabel}.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border/60 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <th className="pb-3 pr-4">Material Class</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Delivered / Required</th>
                        <th className="pb-3 pr-4">Schedule Impact</th>
                        <th className="pb-3 pr-4">Trend</th>
                        <th className="pb-3 pr-4">Ordered</th>
                        <th className="pb-3 pr-4">PO Count</th>
                        <th className="pb-3 pr-4">Items</th>
                        <th className="pb-3" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                    {rows.map((row) => (
                        <tr
                            key={row.materialClass}
                            className="group cursor-pointer transition-colors hover:bg-muted/40"
                            onClick={() => onMaterialClassClick(row.materialClass)}
                        >
                            {/* Material class name */}
                            <td className="py-3 pr-4 font-medium text-foreground">
                                {row.materialClass}
                                {row.purchaseOrders && row.purchaseOrders.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                        {row.purchaseOrders.slice(0, 4).map((po) => (
                                            <Link
                                                key={po.id}
                                                href={`/dashboard/procurement/${po.id}/edit?step=boq`}
                                                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {po.poNumber}
                                            </Link>
                                        ))}
                                        {row.purchaseOrders.length > 4 && (
                                            <span className="text-muted-foreground">+{row.purchaseOrders.length - 4} more</span>
                                        )}
                                    </div>
                                )}
                            </td>

                            {/* Status badge */}
                            <td className="py-3 pr-4">
                                <StatusBadge
                                    status={row.status}
                                    lateDays={row.lateDays}
                                    compact
                                />
                            </td>

                            {/* Delivered / Required */}
                            <td className="py-3 pr-4 tabular-nums text-foreground">
                                {row.deliveredQty.toLocaleString()} /{" "}
                                {row.requiredQty.toLocaleString()}
                            </td>

                            {/* Schedule impact */}
                            <td className="py-3 pr-4 tabular-nums text-foreground">
                                {row.status === "LATE" && row.lateDays > 0
                                    ? `+${row.lateDays}d`
                                    : row.status === "AT_RISK"
                                        ? "Buffer"
                                        : "—"}
                            </td>

                            {/* Trend */}
                            <td className="py-3 pr-4 text-muted-foreground">
                                {row.trend === "IMPROVING"
                                    ? "Improving"
                                    : row.trend === "DETERIORATING"
                                        ? "Deteriorating"
                                        : row.trend === "STABLE"
                                            ? "Stable"
                                            : "—"}
                            </td>

                            {/* Ordered total */}
                            <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                                {row.orderedQty.toLocaleString()}
                            </td>

                            {/* PO count */}
                            <td className="py-3 pr-4 text-muted-foreground">
                                {row.purchaseOrderIds.length}
                            </td>

                            {/* Item count */}
                            <td className="py-3 pr-4 text-muted-foreground">{row.itemCount}</td>

                            {/* Chevron */}
                            <td className="py-3 pl-2 text-muted-foreground transition-colors group-hover:text-foreground">
                                <ChevronRight className="h-4 w-4" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
