import { Suspense } from "react";
import { getSuppliers } from "@/lib/actions/supplier";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TruckIcon, MagnifyingGlassIcon, CheckCircleIcon, SealCheckIcon, ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr";
import { InviteSupplierUserDialog } from "@/components/invite-supplier-user-dialog";
import { Progress } from "@/components/ui/progress";
import { ImportSupplierDialog } from "@/components/import-supplier-dialog";
import { AddSupplierDialog } from "@/components/add-supplier-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default async function SuppliersPage() {
    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight mb-2">Supplier Registry</h1>
                    <p className="text-muted-foreground text-lg">Central database for qualified and linked organization partners.</p>
                </div>
                <div className="flex items-center gap-3">
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

    if (suppliers.length === 0) {
        return (
            <Card className="border-dashed bg-muted/30 py-20">
                <CardContent className="flex flex-col items-center text-center">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                        <TruckIcon className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Registry is Empty</h3>
                    <p className="text-muted-foreground max-w-sm mb-8">
                        You haven&apos;t added any suppliers to your organization yet. Start by onboarding your first partner.
                    </p>
                    <AddSupplierDialog />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-6">
            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="py-5 font-bold text-foreground">Supplier Identity</TableHead>
                            <TableHead className="py-5 font-bold text-foreground">Contact</TableHead>
                            <TableHead className="py-5 font-bold text-foreground">Readiness</TableHead>
                            <TableHead className="py-5 font-bold text-foreground">Verification</TableHead>
                            <TableHead className="py-5 font-bold text-foreground text-right">Onboarding</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suppliers.map(
                            (
                                s: any
                            ) => {
                                const readiness = Number(s.readinessScore) || 0;
                                const isVerified = readiness === 100;

                                return (
                                    <TableRow key={s.id} className="group transition-colors hover:bg-muted/30 border-muted/40">
                                        <TableCell className="py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-bold">
                                                    {s.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-base leading-none mb-1 group-hover:text-primary transition-colors">{s.name}</div>
                                                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">Tax ID: {s.taxId || "Not set"}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-medium">{s.contactEmail || "-"}</div>
                                        </TableCell>
                                        <TableCell className="w-[200px]">
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    <span>Score</span>
                                                    <span>{readiness}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${isVerified ? 'bg-green-500' : 'bg-primary'}`}
                                                        style={{ width: `${readiness}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {isVerified ? (
                                                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-200/50 flex items-center gap-1.5 px-3 py-1 text-xs font-bold ring-1 ring-green-500/20">
                                                    <SealCheckIcon className="h-3.5 w-3.5" weight="fill" />
                                                    Verified
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-amber-500/5 text-amber-600 border-amber-200/50 flex items-center gap-1.5 px-3 py-1 text-xs font-bold">
                                                    <ArrowsClockwiseIcon className="h-3.5 w-3.5 animate-spin-slow" />
                                                    Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right py-6">
                                            <InviteSupplierUserDialog
                                                supplierId={s.id}
                                                supplierName={s.name}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            }
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
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
