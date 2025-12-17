import { Suspense } from "react";
import { getSuppliers } from "@/lib/actions/supplier";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ImportSupplierDialog } from "@/components/import-supplier-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {  TruckIcon } from "@phosphor-icons/react/dist/ssr";

export default async function SuppliersPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Suppliers</h1>
                    <p className="text-muted-foreground">Manage your organization&apos;s supplier registry.</p>
                </div>
                <ImportSupplierDialog />
            </div>

            <Suspense fallback={<SuppliersTableSkeleton />}>
                <SuppliersList />
            </Suspense>
        </div>
    );
}

async function SuppliersList() {
    const suppliers = await getSuppliers();

    if (suppliers.length === 0) {
        return (
            <div className="border rounded-lg p-12 text-center text-muted-foreground bg-muted/50 border-dashed">
                <div className="flex flex-col items-center gap-2">
                    <TruckIcon className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold">No Suppliers</h3>
                    <p>You haven&apos;t imported or added any suppliers yet.</p>
                </div>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registered Suppliers</CardTitle>
                <CardDescription>A list of all suppliers available for this organization.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Tax ID</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suppliers.map(
                            (
                                supplier: {
                                    id: string;
                                    name: string;
                                    contactEmail?: string | null;
                                    taxId?: string | null;
                                    status: string;
                                }
                            ) => (
                                <TableRow key={supplier.id}>
                                    <TableCell className="font-medium">{supplier.name}</TableCell>
                                    <TableCell>{supplier.contactEmail || "-"}</TableCell>
                                    <TableCell>{supplier.taxId || "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant={supplier.status === "ACTIVE" ? "default" : "secondary"}>
                                            {supplier.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function SuppliersTableSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="space-y-2">
                    <Skeleton className="h-6 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-6 w-[80px]" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
