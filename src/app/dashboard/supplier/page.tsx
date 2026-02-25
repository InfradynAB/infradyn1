import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import db from "@/db/drizzle";
import { purchaseOrder, supplier } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getSupplierActiveProjectId } from "@/lib/utils/supplier-project-context";
import {
    FileText,
    WarningCircle,
    ShieldCheck,
    CaretRight,
    Files,
    Headset,
    ArrowRight,
    Package,
    Truck,
    Clock,
    TrendUp,
    CalendarBlank,
} from "@phosphor-icons/react/dist/ssr";
import { ReadinessScore } from "@/components/supplier/readiness-score";
import { PerformanceBarChart, PerformanceDonut } from "@/components/supplier/performance-charts";
import { SignOutButton } from "@/components/sign-out-button";
import { getSupplierActionItems } from "@/lib/actions/supplier-dashboard-actions";
import { getSupplierPerformance } from "@/lib/actions/supplier-performance";
import { OnboardingTourWrapper } from "@/components/dashboard/supplier/onboarding-tour";

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

    // --- Supplier lookup (3 methods) ---
    let supplierData = null;

    supplierData = await db.query.supplier.findFirst({
        where: eq(supplier.userId, session.user.id),
        with: { organization: true }
    });

    if (!supplierData && session.user.supplierId) {
        supplierData = await db.query.supplier.findFirst({
            where: eq(supplier.id, session.user.supplierId),
            with: { organization: true }
        });
        if (supplierData) {
            await db.update(supplier)
                .set({ userId: session.user.id })
                .where(eq(supplier.id, supplierData.id));
        }
    }

    if (!supplierData && session.user.email) {
        supplierData = await db.query.supplier.findFirst({
            where: eq(supplier.contactEmail, session.user.email),
            with: { organization: true }
        });
        if (supplierData) {
            await db.update(supplier)
                .set({ userId: session.user.id })
                .where(eq(supplier.id, supplierData.id));
        }
    }

    if (!supplierData) {
        return (
            <div className="fixed inset-0 z-200 bg-black/60 backdrop-blur-sm flex items-center justify-center">
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

    // --- Data fetching ---
    const activeSupplierProjectId = await getSupplierActiveProjectId();

    const pos = await db.query.purchaseOrder.findMany({
        where: activeSupplierProjectId
            ? and(
                eq(purchaseOrder.supplierId, supplierData.id),
                eq(purchaseOrder.projectId, activeSupplierProjectId)
            )
            : eq(purchaseOrder.supplierId, supplierData.id),
        with: { project: true, milestones: true },
        orderBy: [asc(purchaseOrder.createdAt)]
    });

    const actions = await getSupplierActionItems(
        supplierData.id,
        activeSupplierProjectId || undefined
    );

    const performanceResult = await getSupplierPerformance(supplierData.id);
    const performance = performanceResult.success ? performanceResult.data : null;

    const allMilestones = pos.flatMap(po =>
        (po.milestones || []).map(m => ({ ...m, poNumber: po.poNumber, currency: po.currency }))
    );
    const upcomingMilestones = allMilestones
        .filter(m => m.status === "PENDING" && m.expectedDate)
        .sort((a, b) => new Date(a.expectedDate!).getTime() - new Date(b.expectedDate!).getTime())
        .slice(0, 3);

    const readinessScore = Number(supplierData.readinessScore) || 0;

    // Compute narrative context
    const totalUrgent = actions.openNcrs + actions.pendingPos + actions.overdueDeliveries;
    const today = new Date();
    const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

    // PO breakdowns for charts
    const pendingResponsePos = pos.filter(po => po.status === "PENDING_RESPONSE" || po.status === "ISSUED");
    const acceptedPos = pos.filter(po => po.status === "ACCEPTED");
    const completedPos = pos.filter(po => po.status === "COMPLETED");
    const draftPos = pos.filter(po => po.status === "DRAFT");

    // Performance chart data
    const responseRate = Math.round(performance?.responseRate ?? 0);
    const accuracy = Math.round(Math.min(100, performance?.reportingAccuracy ?? 0));
    const reliability = Math.round(Math.min(100, performance?.reliabilityScore ?? 0));

    const barChartData = [
        { label: "Response", value: responseRate, color: responseRate >= 80 ? "#22c55e" : responseRate >= 50 ? "#f59e0b" : "#ef4444" },
        { label: "Accuracy", value: accuracy, color: accuracy >= 80 ? "#22c55e" : accuracy >= 50 ? "#f59e0b" : "#ef4444" },
        { label: "Reliability", value: reliability, color: reliability >= 80 ? "#22c55e" : reliability >= 50 ? "#f59e0b" : "#ef4444" },
    ];

    const overallScore = Math.round((responseRate + accuracy + reliability) / 3);

    const donutSegments = [
        { value: acceptedPos.length + completedPos.length, color: "#22c55e", label: "Active / Complete" },
        { value: pendingResponsePos.length, color: "#f59e0b", label: "Pending Response" },
        { value: draftPos.length, color: "#3b82f6", label: "Draft" },
    ].filter(s => s.value > 0);

    return (
        <div className="w-full space-y-8 pb-16">
            {/* Onboarding Tour */}
            <OnboardingTourWrapper />

            {/* ── HEADER BAR ── */}
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {greeting}, {supplierData.name}
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-lg">
                        {totalUrgent === 0
                            ? "Everything looks good — you're all caught up. Here's your overview."
                            : `You have ${totalUrgent} item${totalUrgent !== 1 ? "s" : ""} that need${totalUrgent === 1 ? "s" : ""} your attention. Let's get started.`
                        }
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {supplierData.isVerified && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-500">
                            <ShieldCheck className="h-3.5 w-3.5" weight="fill" />
                            Verified
                        </span>
                    )}
                    <div id="tour-readiness" className="inline-flex items-center gap-2 rounded-full bg-muted/50 border border-border px-3 py-1.5">
                        <span className="text-xs text-muted-foreground font-medium">Readiness</span>
                        <ReadinessScore score={readinessScore} size={26} strokeWidth={3} />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-muted/50 border border-border px-3 py-1.5 text-xs font-semibold text-foreground tabular-nums">
                        {pos.length} PO{pos.length !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>

            {/* ── CLICKABLE STATS ROW ── */}
            <div id="tour-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    href="/dashboard/supplier/pos?filter=ncr"
                    count={actions.openNcrs}
                    label="Open NCRs"
                    sublabel={actions.openNcrs > 0 ? "Review & respond →" : "All resolved"}
                    icon={<WarningCircle className="h-5 w-5" weight="fill" />}
                    color="red"
                    urgent={actions.openNcrs > 0}
                />
                <StatCard
                    href="/dashboard/supplier/pos?filter=pending"
                    count={actions.pendingPos}
                    label="POs Awaiting"
                    sublabel={actions.pendingPos > 0 ? "Accept or reject →" : "Nothing pending"}
                    icon={<Package className="h-5 w-5" />}
                    color="amber"
                    urgent={actions.pendingPos > 0}
                />
                <StatCard
                    href="/dashboard/supplier/pos?filter=shipments"
                    count={actions.activeShipments}
                    label="Active Shipments"
                    sublabel={actions.activeShipments > 0 ? "Track progress →" : "No shipments"}
                    icon={<Truck className="h-5 w-5" />}
                    color="blue"
                    urgent={false}
                />
                <StatCard
                    href="/dashboard/supplier/pos?filter=overdue"
                    count={actions.overdueDeliveries}
                    label="Overdue"
                    sublabel={actions.overdueDeliveries > 0 ? "Action needed →" : "On schedule"}
                    icon={<Clock className="h-5 w-5" />}
                    color="orange"
                    urgent={actions.overdueDeliveries > 0}
                />
            </div>

            {/* ── ATTENTION CARDS (only if urgent) ── */}
            {totalUrgent > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {actions.pendingPos > 0 && (
                        <ActionCard
                            href="/dashboard/supplier/pos?filter=pending"
                            count={actions.pendingPos}
                            title={`${actions.pendingPos} PO${actions.pendingPos !== 1 ? "s" : ""} waiting for your response`}
                            desc="Review the details and accept or reject to keep things moving."
                            actionLabel="Review now"
                            color="amber"
                            icon={<Package className="h-5 w-5" />}
                        />
                    )}
                    {actions.openNcrs > 0 && (
                        <ActionCard
                            href="/dashboard/supplier/pos?filter=ncr"
                            count={actions.openNcrs}
                            title={`${actions.openNcrs} NCR${actions.openNcrs !== 1 ? "s" : ""} open`}
                            desc="Quality issues flagged — respond with your corrective action plan."
                            actionLabel="Respond now"
                            color="red"
                            icon={<WarningCircle className="h-5 w-5" weight="fill" />}
                        />
                    )}
                    {actions.overdueDeliveries > 0 && (
                        <ActionCard
                            href="/dashboard/supplier/pos?filter=overdue"
                            count={actions.overdueDeliveries}
                            title={`${actions.overdueDeliveries} overdue deliver${actions.overdueDeliveries !== 1 ? "ies" : "y"}`}
                            desc="Shipments past expected date. Update tracking or contact support."
                            actionLabel="View overdue"
                            color="orange"
                            icon={<Clock className="h-5 w-5" />}
                        />
                    )}
                </div>
            )}

            {/* ── MAIN GRID: Recent POs + Performance ── */}
            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">

                {/* LEFT — Recent Purchase Orders (table-style) */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Recent Purchase Orders</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {pos.length === 0
                                    ? "No orders yet — they'll appear here once issued."
                                    : `${pos.length} total · ${pendingResponsePos.length} pending`
                                }
                            </p>
                        </div>
                        {pos.length > 0 && (
                            <Link href="/dashboard/supplier/pos">
                                <Button variant="outline" size="sm" className="text-xs font-medium gap-1.5 h-8 rounded-lg">
                                    View all <ArrowRight className="h-3 w-3" />
                                </Button>
                            </Link>
                        )}
                    </div>

                    {pos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                                <FileText className="h-8 w-8 text-muted-foreground/20" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">No purchase orders yet</p>
                            <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                                When a buyer assigns you a purchase order, it will show up here.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Table header */}
                            <div className="grid grid-cols-[1.2fr_1.5fr_100px_1fr_20px] gap-4 px-6 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/20">
                                <span>PO Number</span>
                                <span>Project</span>
                                <span>Status</span>
                                <span className="text-right">Value</span>
                                <span />
                            </div>
                            <div className="divide-y divide-border/30">
                                {pos.slice(0, 8).map(po => {
                                    const needsAction = po.status === "PENDING_RESPONSE" || po.status === "ISSUED";
                                    return (
                                        <Link
                                            href={`/dashboard/supplier/pos/${po.id}`}
                                            key={po.id}
                                            className={`grid grid-cols-[1.2fr_1.5fr_100px_1fr_20px] items-center gap-4 px-6 py-3.5 hover:bg-muted/30 transition-colors group ${needsAction ? "bg-amber-500/3 dark:bg-amber-500/4" : ""}`}
                                        >
                                            <span className="text-sm font-bold text-foreground tabular-nums truncate">
                                                {po.poNumber}
                                            </span>
                                            <span className="text-sm text-muted-foreground truncate">
                                                {po.project.name}
                                            </span>
                                            <div>
                                                <POStatusBadge status={po.status || "DRAFT"} />
                                            </div>
                                            <span className="text-sm font-semibold tabular-nums text-foreground text-right">
                                                ${Number(po.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <div className="flex justify-end">
                                                <CaretRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground transition-colors" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* RIGHT — Performance & Analytics */}
                <div id="tour-performance" className="space-y-6">

                    {/* Performance Bar Chart */}
                    <div className="rounded-2xl border border-border bg-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-foreground">Performance</h3>
                            <Link href="/dashboard/supplier/analytics" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                Details →
                            </Link>
                        </div>
                        <PerformanceBarChart data={barChartData} height={160} />
                    </div>

                    {/* Overall Score Donut */}
                    <div className="rounded-2xl border border-border bg-card p-6">
                        <h3 className="text-lg font-bold text-foreground mb-6">PO Breakdown</h3>
                        <div className="flex justify-center">
                            <PerformanceDonut
                                score={pos.length > 0 ? Math.round(((acceptedPos.length + completedPos.length) / pos.length) * 100) : 0}
                                size={150}
                                label="On Track"
                                segments={donutSegments}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── BOTTOM ROW: Milestones + Onboarding + Quick Actions ── */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                {/* Upcoming Milestones */}
                <div id="tour-milestones" className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="text-lg font-bold text-foreground mb-1">Coming Up</h3>
                    <p className="text-xs text-muted-foreground mb-5">
                        {upcomingMilestones.length === 0
                            ? "No milestones on the horizon."
                            : `Your next ${upcomingMilestones.length} milestone${upcomingMilestones.length !== 1 ? "s" : ""}`
                        }
                    </p>
                    {upcomingMilestones.length === 0 ? (
                        <div className="flex flex-col items-center py-6">
                            <CalendarBlank className="h-10 w-10 text-muted-foreground/10 mb-2" />
                            <p className="text-xs text-muted-foreground">Nothing scheduled</p>
                        </div>
                    ) : (
                        <div className="space-y-0 relative">
                            <div className="absolute left-[19px] top-3 bottom-5 w-px bg-border z-0" />
                            {upcomingMilestones.map((m) => {
                                const date = m.expectedDate ? new Date(m.expectedDate) : null;
                                const monthStr = date ? date.toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "";
                                const dayStr = date ? String(date.getDate()).padStart(2, "0") : "";
                                return (
                                    <div key={m.id} className="relative z-10 flex gap-4 pb-6 last:pb-0 group">
                                        <div className="flex flex-col items-center shrink-0 w-10 bg-card">
                                            <span className="text-[10px] font-bold text-muted-foreground mb-0.5">{monthStr}</span>
                                            <span className="text-lg font-bold text-foreground leading-none">{dayStr}</span>
                                        </div>
                                        <div className="min-w-0 pt-0.5">
                                            <p className="text-sm font-medium text-foreground">{m.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{m.poNumber}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Onboarding / Profile Card */}
                <Link
                    id="tour-onboarding"
                    href="/dashboard/supplier/onboarding"
                    className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/30 transition-all flex flex-col justify-between"
                >
                    <div>
                        <h3 className="text-lg font-bold text-foreground mb-2">
                            {readinessScore >= 100 ? "Your Profile" : "Complete Onboarding"}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-6">
                            {readinessScore >= 100
                                ? "Your profile is fully set up. You can update documents, certifications, and contact info anytime."
                                : "Finish setting up your profile to unlock full portal access and improve buyer confidence."
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="shrink-0">
                            <ReadinessScore score={readinessScore} size={56} strokeWidth={5} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">Profile completeness</span>
                                <span className="text-xs font-bold text-foreground">{readinessScore}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-500"
                                    style={{ width: `${readinessScore}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-5 group-hover:gap-2 transition-all">
                        {readinessScore >= 100 ? "Update profile" : "Continue setup"} <ArrowRight className="h-3 w-3" />
                    </span>
                </Link>

                {/* Quick Actions */}
                <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
                    <div className="space-y-1">
                        <QuickLink href="/dashboard/supplier/pos" icon={<Files className="h-4 w-4" />} label="All Purchase Orders" desc="Browse & manage your POs" />
                        <QuickLink href="/dashboard/supplier/analytics" icon={<TrendUp className="h-4 w-4" />} label="Analytics & Reports" desc="Performance trends" />
                        <QuickLink href="/dashboard/supplier/onboarding" icon={<Headset className="h-4 w-4" />} label="Help & Support" desc="Get assistance" />
                    </div>
                </div>
            </div>

        </div>
    );
}

/* ── Helper Components ── */

function StatCard({
    href, count, label, sublabel, icon, color, urgent,
}: {
    href: string; count: number; label: string; sublabel: string;
    icon: React.ReactNode; color: string; urgent: boolean;
}) {
    const colorMap: Record<string, { bg: string; iconBg: string; iconText: string; dot: string }> = {
        red: { bg: "hover:border-red-500/30", iconBg: "bg-red-500/10", iconText: "text-red-500", dot: "bg-red-500" },
        amber: { bg: "hover:border-amber-500/30", iconBg: "bg-amber-500/10", iconText: "text-amber-500", dot: "bg-amber-500" },
        blue: { bg: "hover:border-blue-500/30", iconBg: "bg-blue-500/10", iconText: "text-blue-500", dot: "bg-blue-500" },
        orange: { bg: "hover:border-orange-500/30", iconBg: "bg-orange-500/10", iconText: "text-orange-500", dot: "bg-orange-500" },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <Link href={href} className={`group rounded-xl border border-border bg-card p-4 transition-all ${c.bg} hover:shadow-lg hover:shadow-black/5`}>
            <div className="flex items-center justify-between mb-3">
                <div className={`h-8 w-8 rounded-lg ${c.iconBg} flex items-center justify-center ${c.iconText} [&>svg]:h-4 [&>svg]:w-4`}>
                    {icon}
                </div>
                {urgent && count > 0 && (
                    <span className={`h-2 w-2 rounded-full ${c.dot} animate-pulse`} />
                )}
            </div>
            <span className="text-2xl font-bold text-foreground tabular-nums">{count}</span>
            <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 group-hover:text-foreground/70 transition-colors">{sublabel}</p>
        </Link>
    );
}

function ActionCard({
    href, count, title, desc, actionLabel, color, icon,
}: {
    href: string; count: number; title: string; desc: string;
    actionLabel: string; color: string; icon: React.ReactNode;
}) {
    const colorMap: Record<string, { border: string; bg: string; iconBg: string; iconText: string; action: string }> = {
        amber: { border: "border-amber-200 dark:border-amber-500/20", bg: "bg-amber-50/40 dark:bg-amber-500/[0.04]", iconBg: "bg-amber-100 dark:bg-amber-500/15", iconText: "text-amber-600 dark:text-amber-400", action: "text-amber-600 dark:text-amber-400" },
        red: { border: "border-red-200 dark:border-red-500/20", bg: "bg-red-50/40 dark:bg-red-500/[0.04]", iconBg: "bg-red-100 dark:bg-red-500/15", iconText: "text-red-600 dark:text-red-400", action: "text-red-600 dark:text-red-400" },
        orange: { border: "border-orange-200 dark:border-orange-500/20", bg: "bg-orange-50/40 dark:bg-orange-500/[0.04]", iconBg: "bg-orange-100 dark:bg-orange-500/15", iconText: "text-orange-600 dark:text-orange-400", action: "text-orange-600 dark:text-orange-400" },
    };
    const c = colorMap[color] || colorMap.amber;

    return (
        <Link href={href} className={`group rounded-xl border ${c.border} ${c.bg} px-4 py-3 hover:shadow-sm transition-all`}>
            <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg ${c.iconBg} flex items-center justify-center ${c.iconText} shrink-0 [&>svg]:h-4 [&>svg]:w-4`}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${c.action} shrink-0 group-hover:gap-1.5 transition-all`}>
                    {actionLabel} <ArrowRight className="h-3 w-3" />
                </span>
            </div>
        </Link>
    );
}

function POStatusBadge({ status }: { status: string }) {
    const config: Record<string, { cls: string; label: string }> = {
        ACCEPTED: { cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", label: "Accepted" },
        ISSUED: { cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400", label: "Issued" },
        PENDING_RESPONSE: { cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400", label: "Pending" },
        COMPLETED: { cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400", label: "Complete" },
        CANCELLED: { cls: "bg-red-500/15 text-red-600 dark:text-red-400", label: "Cancelled" },
        DRAFT: { cls: "bg-muted text-muted-foreground", label: "Draft" },
    };
    const c = config[status] || config.DRAFT;
    return (
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.cls}`}>
            {c.label}
        </span>
    );
}

function QuickLink({ href, icon, label, desc }: { href: string; icon: React.ReactNode; label: string; desc?: string }) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted/40 transition-colors"
        >
            <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-all shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground block">{label}</span>
                {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
            </div>
            <CaretRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-foreground transition-colors shrink-0" />
        </Link>
    );
}
