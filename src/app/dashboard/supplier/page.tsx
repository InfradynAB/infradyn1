import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import db from "@/db/drizzle";
import { purchaseOrder, supplier, project } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { FileTextIcon, CheckCircle, WarningCircle, ArrowRight, ShieldCheck, Clock, ListChecks } from "@phosphor-icons/react/dist/ssr";
import { ReadinessScore } from "@/components/supplier/readiness-score";

export default async function SupplierDashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        redirect("/sign-in");
    }

    if (session.user.role !== "SUPPLIER") {
        redirect("/dashboard");
    }

    // Fetch supplier details
    const supplierData = await db.query.supplier.findFirst({
        where: eq(supplier.userId, session.user.id),
        with: {
            organization: true
        }
    });

    if (!supplierData) {
        return (
            <div className="p-8">
                <Card className="border-dashed bg-muted/50">
                    <CardHeader className="text-center py-12">
                        <div className="flex justify-center mb-4">
                            <WarningCircle className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <CardTitle>Supplier Account Not Linked</CardTitle>
                        <CardDescription>We could not find a supplier profile linked to your account.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // Fetch assigned POs
    const pos = await db.query.purchaseOrder.findMany({
        where: eq(purchaseOrder.supplierId, supplierData.id),
        with: {
            project: true
        }
    });

    const pendingCount = pos.filter(po => po.status === "PENDING_RESPONSE" || po.status === "ISSUED").length;
    const activeCount = pos.filter(po => po.status === "ACCEPTED").length;

    return (
        <div className="space-y-8 pb-10">
            {/* Premium Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 md:p-12 text-white shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium backdrop-blur-md border border-white/5 mb-6">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" weight="fill" />
                            Verified Supplier Portal
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
                            Welcome back, <br className="hidden md:block" />
                            <span className="text-blue-400">{supplierData.name}</span>
                        </h1>
                        <p className="text-slate-400 text-lg mb-8 max-w-md">
                            Manage your purchase orders, compliance documents, and track your project assignments in one place.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            {!supplierData.isVerified && (
                                <Link href="/dashboard/supplier/onboarding">
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-6 h-auto rounded-xl">
                                        Complete Onboarding
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            )}
                            <Link href="/dashboard/supplier/pos">
                                <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white font-semibold px-6 py-6 h-auto rounded-xl backdrop-blur-md">
                                    View All Orders
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center justify-center bg-white/5 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-inner">
                        <ReadinessScore score={Number(supplierData.readinessScore) || 0} size={160} strokeWidth={10} />
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <ListChecks className="h-5 w-5" weight="bold" />
                        </div>
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Assignments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold mt-1">{pos.length}</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center">
                            Lifetime project linking
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                            <Clock className="h-5 w-5" weight="bold" />
                        </div>
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Awaiting Response</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold mt-1 text-amber-600">{pendingCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Requires your immediate action</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                            <CheckCircle className="h-5 w-5" weight="bold" />
                        </div>
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Execution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold mt-1 text-green-600">{activeCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Projects currently in progress</p>
                    </CardContent>
                </Card>
            </div>

            <div className="pt-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">Recent Purchase Orders</h2>
                    <Link href="/dashboard/supplier/pos" className="text-blue-500 hover:text-blue-600 text-sm font-semibold flex items-center">
                        View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                </div>

                {pos.length === 0 ? (
                    <Card className="border-dashed bg-muted/30">
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <FileTextIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">No purchase orders assigned yet.</p>
                            <p className="text-sm opacity-60 mt-1">Active projects will appear here as they are issued.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {pos.slice(0, 5).map(po => (
                            <Link href={`/dashboard/supplier/pos/${po.id}`} key={po.id}>
                                <Card className="group hover:bg-slate-50 dark:hover:bg-slate-900 border-none shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                                    <div className="flex items-center p-6 gap-6">
                                        <div className="hidden sm:flex h-14 w-14 rounded-2xl bg-blue-500/5 text-blue-500 items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                                            <FileTextIcon className="h-7 w-7" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                                                <h3 className="font-bold text-lg leading-none">{po.poNumber}</h3>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${po.status === 'ACCEPTED' ? 'bg-green-500/10 text-green-600 border-green-200/50' :
                                                        po.status === 'ISSUED' || po.status === 'PENDING_RESPONSE' ? 'bg-amber-500/10 text-amber-600 border-amber-200/50 animate-pulse' :
                                                            'bg-blue-500/10 text-blue-600 border-blue-200/50'
                                                    }`}>
                                                    {po.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground font-medium truncate">{po.project.name}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-lg font-bold">{po.currency} {Number(po.totalValue).toLocaleString()}</div>
                                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">
                                                Issued {new Date(po.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
