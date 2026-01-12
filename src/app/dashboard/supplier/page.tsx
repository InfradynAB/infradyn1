import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import db from "@/db/drizzle";
import { purchaseOrder, supplier, milestone, organization } from "@/db/schema";
import { eq, and, gte, asc } from "drizzle-orm";
import {
    FileText,
    CheckCircle,
    WarningCircle,
    ArrowRight,
    ShieldCheck,
    Clock,
    CurrencyDollar,
    ChartLineUp,
    Buildings,
    CalendarCheck,
    Package,
    Briefcase,
    UploadSimple,
    ChartBar,
} from "@phosphor-icons/react/dist/ssr";
import { ReadinessScore } from "@/components/supplier/readiness-score";
import { SupplierStatsCard } from "@/components/supplier/supplier-stats-card";
import { UpcomingMilestones } from "@/components/supplier/upcoming-milestones";
import { ProgressUpdateSheetWrapper } from "@/components/supplier/progress-update-sheet-wrapper";
import { getSupplierPerformance } from "@/lib/actions/supplier-performance";
import { SignOutButton } from "@/components/sign-out-button";

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

    // Debug: Log user info for troubleshooting
    console.log("[SUPPLIER-DASHBOARD] User ID:", session.user.id);
    console.log("[SUPPLIER-DASHBOARD] User Email:", session.user.email);
    console.log("[SUPPLIER-DASHBOARD] User Role:", session.user.role);
    console.log("[SUPPLIER-DASHBOARD] User supplierId from session:", session.user.supplierId);

    // Try multiple methods to find the supplier
    let supplierData = null;

    // Method 1: Lookup by userId (normal flow when invite was properly accepted)
    supplierData = await db.query.supplier.findFirst({
        where: eq(supplier.userId, session.user.id),
        with: {
            organization: true
        }
    });
    console.log("[SUPPLIER-DASHBOARD] Method 1 - Supplier by userId:", !!supplierData);

    // Method 2: Fallback - lookup by user.supplierId if set
    if (!supplierData && session.user.supplierId) {
        console.log("[SUPPLIER-DASHBOARD] Trying Method 2 - by user.supplierId:", session.user.supplierId);
        supplierData = await db.query.supplier.findFirst({
            where: eq(supplier.id, session.user.supplierId),
            with: {
                organization: true
            }
        });
        console.log("[SUPPLIER-DASHBOARD] Method 2 - Supplier by user.supplierId:", !!supplierData);

        // If found, also update the supplier's userId for future lookups
        if (supplierData) {
            await db.update(supplier)
                .set({ userId: session.user.id })
                .where(eq(supplier.id, supplierData.id));
            console.log("[SUPPLIER-DASHBOARD] Updated supplier.userId for faster future lookups");
        }
    }

    // Method 3: Fallback - lookup by matching email
    if (!supplierData && session.user.email) {
        console.log("[SUPPLIER-DASHBOARD] Trying Method 3 - by email:", session.user.email);
        supplierData = await db.query.supplier.findFirst({
            where: eq(supplier.contactEmail, session.user.email),
            with: {
                organization: true
            }
        });
        console.log("[SUPPLIER-DASHBOARD] Method 3 - Supplier by contactEmail:", !!supplierData);

        // If found, update the supplier's userId for future lookups
        if (supplierData) {
            await db.update(supplier)
                .set({ userId: session.user.id })
                .where(eq(supplier.id, supplierData.id));
            console.log("[SUPPLIER-DASHBOARD] Linked supplier to user via email match");
        }
    }

    if (!supplierData) {
        console.log("[SUPPLIER-DASHBOARD] No supplier found by any method. User email:", session.user.email);

        // Full-screen overlay that blocks all navigation
        return (
            <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center">

                <Card className="max-w-md w-full mx-4 border-amber-200 bg-amber-50/80 shadow-2xl">
                    <CardHeader className="text-center py-10">
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                                <WarningCircle className="h-8 w-8 text-amber-600" weight="fill" />
                            </div>
                        </div>
                        <CardTitle className="text-amber-900 text-xl">Account Not Available</CardTitle>
                        <p className="text-amber-800 mt-3 text-sm">
                            Your supplier account is not currently linked to any organization, or it may have been removed.
                        </p>
                    </CardHeader>
                    <CardContent className="text-center space-y-4 pb-8">
                        <div className="bg-white/80 border border-amber-200 rounded-lg p-4 text-left">
                            <p className="text-sm text-amber-900 font-medium mb-2">This could mean:</p>
                            <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                                <li>Your supplier account was removed by the organization</li>
                                <li>You have not yet accepted an invitation</li>
                                <li>The invitation link may have expired</li>
                            </ul>
                        </div>
                        <p className="text-xs text-amber-700">
                            If you believe this is an error, please contact the organization that invited you.
                        </p>
                        <div className="pt-4">
                            <SignOutButton fullWidth className="bg-amber-600 hover:bg-amber-700" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }



    // Fetch all assigned POs with their projects and milestones
    const pos = await db.query.purchaseOrder.findMany({
        where: eq(purchaseOrder.supplierId, supplierData.id),
        with: {
            project: true,
            milestones: true,
        },
        orderBy: [asc(purchaseOrder.createdAt)]
    });

    // Debug: Log PO count
    console.log("[SUPPLIER-DASHBOARD] POs found:", pos.length);
    if (pos.length > 0) {
        console.log("[SUPPLIER-DASHBOARD] First PO:", pos[0].poNumber);
    }


    // Calculate stats
    const pendingCount = pos.filter(po => po.status === "PENDING_RESPONSE" || po.status === "ISSUED").length;
    const activeCount = pos.filter(po => po.status === "ACCEPTED").length;
    const completedCount = pos.filter(po => po.status === "COMPLETED" || po.status === "CLOSED").length;
    const totalValue = pos.reduce((sum, po) => sum + Number(po.totalValue || 0), 0);
    const primaryCurrency = pos[0]?.currency || "USD";

    // Get unique projects
    const uniqueProjects = new Set(pos.map(po => po.projectId));

    // Get upcoming milestones across all POs
    const allMilestones = pos.flatMap(po =>
        (po.milestones || []).map(m => ({
            ...m,
            poNumber: po.poNumber,
            currency: po.currency,
        }))
    );

    const upcomingMilestones = allMilestones
        .filter(m => m.status === "PENDING" && m.expectedDate)
        .sort((a, b) => new Date(a.expectedDate!).getTime() - new Date(b.expectedDate!).getTime())
        .slice(0, 5);

    const completedMilestones = allMilestones.filter(m => m.status === "COMPLETED").length;
    const totalMilestones = allMilestones.length;

    // Fetch supplier performance metrics
    const performanceResult = await getSupplierPerformance(supplierData.id);
    const performance = performanceResult.success ? performanceResult.data : null;

    return (
        <div className="space-y-8 pb-10">
            {/* Premium Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 md:p-10 text-white shadow-2xl">
                <div className="relative z-10">
                    {/* Organization Badge */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-md border border-white/10">
                            <Buildings className="h-3.5 w-3.5" weight="fill" />
                            {supplierData.organization?.name || "Organization"}
                        </div>
                        {supplierData.isVerified && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold border border-green-500/20">
                                <ShieldCheck className="h-3.5 w-3.5" weight="fill" />
                                Verified
                            </div>
                        )}
                    </div>

                    {/* Welcome Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="max-w-xl">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                                Welcome back, <span className="text-blue-400">{supplierData.name}</span>
                            </h1>
                            <p className="text-slate-400 text-base mb-6">
                                Track your purchase orders, manage compliance, and monitor project milestones.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Link href="/dashboard/supplier/onboarding">
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-5 h-auto rounded-xl">
                                        {(supplierData.isVerified || Number(supplierData.readinessScore) >= 100) ? "Update Profile" : "Complete Onboarding"}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                                {pos.length > 0 && (
                                    <ProgressUpdateSheetWrapper
                                        purchaseOrders={pos.map(po => ({
                                            id: po.id,
                                            poNumber: po.poNumber,
                                            organizationId: po.organizationId,
                                            projectId: po.projectId,
                                            milestones: po.milestones.map(m => ({
                                                id: m.id,
                                                title: m.title,
                                                paymentPercentage: m.paymentPercentage,
                                            })),
                                        }))}
                                    />
                                )}
                                <Link href="/dashboard/supplier/pos">
                                    <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white font-semibold px-5 py-5 h-auto rounded-xl backdrop-blur-md">
                                        View All Orders
                                    </Button>
                                </Link>
                                <Link href="#performance">
                                    <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white font-semibold px-5 py-5 h-auto rounded-xl backdrop-blur-md gap-2">
                                        <ChartBar className="h-4 w-4" />
                                        My Performance
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Readiness Score */}
                        <div className="hidden md:flex flex-col items-center gap-3 bg-white/5 p-6 rounded-2xl backdrop-blur-md border border-white/10">
                            <ReadinessScore score={Number(supplierData.readinessScore) || 0} size={120} strokeWidth={8} />
                            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Compliance Score</p>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SupplierStatsCard
                    title="Total PO Value"
                    value={`${primaryCurrency} ${totalValue.toLocaleString()}`}
                    subtitle={`Across ${pos.length} purchase orders`}
                    icon={<CurrencyDollar className="h-12 w-12" weight="duotone" />}
                />
                <SupplierStatsCard
                    title="Pending Action"
                    value={pendingCount}
                    subtitle="Requires your response"
                    variant={pendingCount > 0 ? "warning" : "default"}
                    icon={<Clock className="h-12 w-12" weight="duotone" />}
                />
                <SupplierStatsCard
                    title="Active Execution"
                    value={activeCount}
                    subtitle="Projects in progress"
                    variant={activeCount > 0 ? "success" : "default"}
                    icon={<Package className="h-12 w-12" weight="duotone" />}
                />
                <SupplierStatsCard
                    title="Projects Assigned"
                    value={uniqueProjects.size}
                    subtitle={`${completedCount} completed orders`}
                    icon={<Briefcase className="h-12 w-12" weight="duotone" />}
                />
            </div>

            {/* Performance Metrics Section */}
            {performance && (
                <div id="performance" className="scroll-mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <ChartBar className="h-5 w-5 text-muted-foreground" />
                            My Performance
                        </h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="border">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Response Rate</span>
                                    <span className={`text-2xl font-bold ${performance.responseRate >= 80 ? 'text-green-600' : performance.responseRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {performance.responseRate.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${performance.responseRate >= 80 ? 'bg-green-500' : performance.responseRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.min(100, performance.responseRate)}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Accuracy</span>
                                    <span className={`text-2xl font-bold ${performance.reportingAccuracy >= 80 ? 'text-green-600' : performance.reportingAccuracy >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {Math.min(100, performance.reportingAccuracy).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${performance.reportingAccuracy >= 80 ? 'bg-green-500' : performance.reportingAccuracy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.min(100, performance.reportingAccuracy)}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Reliability</span>
                                    <span className={`text-2xl font-bold ${performance.reliabilityScore >= 80 ? 'text-green-600' : performance.reliabilityScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {Math.min(100, performance.reliabilityScore).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${performance.reliabilityScore >= 80 ? 'bg-green-500' : performance.reliabilityScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.min(100, performance.reliabilityScore)}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Missed Updates</span>
                                    <span className={`text-2xl font-bold ${performance.missedUpdates === 0 ? 'text-green-600' : performance.missedUpdates <= 2 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {performance.missedUpdates}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {performance.missedUpdates > 3 ? '⚠️ Flagged for review' : 'Keep responding on time!'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Purchase Orders List - Takes 2 columns */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight">Recent Purchase Orders</h2>
                        <Link href="/dashboard/supplier/pos" className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1">
                            View all <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {pos.length === 0 ? (
                        <Card className="border-dashed bg-muted/30">
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-medium">No purchase orders yet</p>
                                <p className="text-sm opacity-60 mt-1">Orders will appear here once assigned</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {pos.slice(0, 5).map(po => (
                                <Link href={`/dashboard/supplier/pos/${po.id}`} key={po.id}>
                                    <Card className="group hover:bg-muted/50 border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                                        <div className="flex items-center p-5 gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <FileText className="h-6 w-6" weight="duotone" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-base">{po.poNumber}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${po.status === 'ACCEPTED' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                                                        po.status === 'ISSUED' || po.status === 'PENDING_RESPONSE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                                            po.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                                                                'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400'
                                                        }`}>
                                                        {po.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground truncate">{po.project.name}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-bold">{po.currency} {Number(po.totalValue).toLocaleString()}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(po.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Upcoming Milestones */}
                    <UpcomingMilestones
                        milestones={upcomingMilestones.map(m => ({
                            id: m.id,
                            title: m.title,
                            expectedDate: m.expectedDate,
                            amount: m.amount ? Number(m.amount) : null,
                            currency: m.currency,
                            poNumber: m.poNumber,
                            status: m.status || "PENDING",
                        }))}
                    />

                    {/* Milestone Progress */}
                    <Card className="border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                                Milestone Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-3xl font-bold">{completedMilestones}/{totalMilestones}</span>
                                <CalendarCheck className="h-8 w-8 text-muted-foreground/30" weight="duotone" />
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                                    style={{ width: `${totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {totalMilestones > 0
                                    ? `${Math.round((completedMilestones / totalMilestones) * 100)}% milestones completed`
                                    : "No milestones tracked yet"
                                }
                            </p>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                                Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Link href="/dashboard/supplier/onboarding" className="block">
                                <Button variant="outline" className="w-full justify-start gap-2 h-10">
                                    <ShieldCheck className="h-4 w-4" />
                                    Update Compliance Docs
                                </Button>
                            </Link>
                            <Link href="/dashboard/supplier/pos" className="block">
                                <Button variant="outline" className="w-full justify-start gap-2 h-10">
                                    <FileText className="h-4 w-4" />
                                    View All Orders
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
