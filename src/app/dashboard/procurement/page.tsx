import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { listPurchaseOrders } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, FileTextIcon, ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { formatDistanceToNow } from "date-fns";

// Status badge color mapping
const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    ACTIVE: "bg-green-100 text-green-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-red-100 text-red-700",
};

// Loading skeleton
function POTableSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="h-16 bg-muted animate-pulse rounded-lg"
                />
            ))}
        </div>
    );
}

// Empty state
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
                <FileTextIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No Purchase Orders</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Get started by creating your first purchase order to track
                materials and suppliers.
            </p>
            <Button asChild>
                <Link href="/dashboard/procurement/new">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create First PO
                </Link>
            </Button>
        </div>
    );
}

// PO List Table
async function POList() {
    const result = await listPurchaseOrders();

    if (!result.success) {
        return (
            <div className="text-center py-8 text-destructive">
                Failed to load purchase orders: {result.error}
            </div>
        );
    }

    const purchaseOrders = result.data || [];

    if (purchaseOrders.length === 0) {
        return <EmptyState />;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {purchaseOrders.map((po: any) => (
                    <TableRow key={po.id} className="group">
                        <TableCell className="font-medium">
                            {po.poNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                            {po.project?.name || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                            {po.supplier?.name || "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {po.currency} {Number(po.totalValue ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                            <Badge
                                variant="secondary"
                                className={statusColors[po.status] || ""}
                            >
                                {po.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                            {formatDistanceToNow(new Date(po.updatedAt), {
                                addSuffix: true,
                            })}
                        </TableCell>
                        <TableCell>
                            <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Link href={`/dashboard/procurement/${po.id}`}>
                                    <ArrowRightIcon className="h-4 w-4" />
                                </Link>
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

// Main Page
export default async function ProcurementPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Procurement
                    </h1>
                    <p className="text-muted-foreground">
                        Manage purchase orders and track materials
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/procurement/new">
                        <PlusIcon className="mr-2 h-4 w-4" />
                        New Purchase Order
                    </Link>
                </Button>
            </div>

            {/* PO List Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Purchase Orders</CardTitle>
                    <CardDescription>
                        All purchase orders across your projects
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<POTableSkeleton />}>
                        <POList />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
