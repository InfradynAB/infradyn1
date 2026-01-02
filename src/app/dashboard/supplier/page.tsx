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

    // Fetch supplier details with organization
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
                        <p className="text-muted-foreground mt-2">
                            We could not find a supplier profile linked to your account.
                        </p>
                    </CardHeader>
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
                                        style={{ width: `${performance.responseRate}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Accuracy</span>
                                    <span className={`text-2xl font-bold ${performance.reportingAccuracy >= 80 ? 'text-green-600' : performance.reportingAccuracy >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {performance.reportingAccuracy.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${performance.reportingAccuracy >= 80 ? 'bg-green-500' : performance.reportingAccuracy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${performance.reportingAccuracy}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Reliability</span>
                                    <span className={`text-2xl font-bold ${performance.reliabilityScore >= 80 ? 'text-green-600' : performance.reliabilityScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {performance.reliabilityScore.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${performance.reliabilityScore >= 80 ? 'bg-green-500' : performance.reliabilityScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${performance.reliabilityScore}%` }}
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
