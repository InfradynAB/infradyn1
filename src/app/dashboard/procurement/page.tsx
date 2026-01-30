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
import { Badge } from "@/components/ui/badge";
import { PlusIcon, FileTextIcon, ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { formatDistanceToNow } from "date-fns";
import { ProgressDashboard } from "@/components/procurement/progress-dashboard";
import { NCRDashboardWidget } from "@/components/procurement/ncr-dashboard-widget";
import { QuickActions } from "@/components/procurement/quick-actions";
import { AttentionStrip } from "@/components/procurement/attention-strip";
import { cn } from "@/lib/utils";
import { POTableClient } from "@/components/procurement/po-table-client";

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
                label: "Submit PO",
                href: `/dashboard/procurement/${poId}/submit`,
                variant: "default" as const,
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
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
                <FileTextIcon className="h-12 w-12 text-primary" weight="duotone" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Purchase Orders Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Purchase orders help you track materials, manage suppliers, and control project costs. 
                Get started by creating your first one.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg">
                    <Link href="/dashboard/procurement/new">
                        <PlusIcon className="mr-2 h-5 w-5" />
                        Create First Purchase Order
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                    <Link href="/dashboard/settings/suppliers">
                        <FileTextIcon className="mr-2 h-5 w-5" />
                        Add Suppliers First
                    </Link>
                </Button>
            </div>
            <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-md">
                <p className="text-xs text-muted-foreground">
                    💡 <strong>Tip:</strong> You can upload existing PO documents and our AI will extract the details automatically
                </p>
            </div>
        </div>
    );
}

import { POActions } from "@/components/procurement/po-actions";

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

    return <POTableClient purchaseOrders={purchaseOrders} />;
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Procurement
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage purchase orders and track materials
                    </p>
                </div>
                <Button asChild size="lg" className="sm:w-auto w-full">
                    <Link href="/dashboard/procurement/new">
                        <PlusIcon className="mr-2 h-5 w-5" />
                        New Purchase Order
                    </Link>
                </Button>
            </div>

            {/* 1️⃣ ATTENTION STRIP - What needs action NOW */}
            <AttentionStrip />

            {/* 2️⃣ FINANCIAL SNAPSHOT */}
            <ProgressDashboard />

            {/* 3️⃣ QUICK ACTIONS */}
            <QuickActions />

            {/* 4️⃣ QUALITY OVERVIEW */}
            <NCRDashboardWidget />

            {/* 5️⃣ ACTIVE PURCHASE ORDERS */}
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
