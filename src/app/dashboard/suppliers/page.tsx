import { Suspense } from "react";
import { getSuppliers } from "@/lib/actions/supplier";
import { ImportSupplierDialog } from "@/components/import-supplier-dialog";
import { AddSupplierDialog } from "@/components/add-supplier-dialog";
import { BulkInviteButton } from "@/components/bulk-invite-button";
import { SuppliersClient } from "@/components/suppliers-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default async function SuppliersPage() {
    // Get pending count for Invite All button
    const suppliers = await getSuppliers();
    const pendingCount = suppliers.filter(
        (s: { status: string | null; contactEmail: string | null }) =>
            s.status === 'INACTIVE' && s.contactEmail && s.contactEmail.includes('@')
    ).length;

    return (
        <div className="flex flex-col gap-6 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Supplier Registry</h1>
                    <p className="text-muted-foreground">Central database for qualified and linked organization partners.</p>
                </div>
                <div className="flex items-center gap-3">
                    <BulkInviteButton pendingCount={pendingCount} />
                    <ImportSupplierDialog />
                    <AddSupplierDialog />
                </div>
            </div>

            <Suspense fallback={<SuppliersTableSkeleton />}>
                <SuppliersList />
            </Suspense>
        </div>
    );
}

async function SuppliersList() {
    const suppliers = await getSuppliers();
    return <SuppliersClient suppliers={suppliers} />;
}

function SuppliersTableSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-80" />
            <Card className="p-6">
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-5 w-5" />
                            <Skeleton className="h-10 w-10 rounded-xl" />
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-6 w-[80px]" />
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

