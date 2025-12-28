import { auth } from "@/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Buildings,
    Users,
    Package,
    Briefcase,
    CurrencyDollar,
    TrendUp,
    ArrowRight,
    Plus,
    UserPlus,
    Export,
    Pulse,
    User,
    FileText,
    Clock,
} from "@phosphor-icons/react/dist/ssr";
import { AdminStatsCard } from "@/components/admin/admin-stats-card";
import { getAdminStats, getRecentActivity } from "@/lib/actions/admin-actions";
import { AdminDashboardCharts } from "./charts-section";
import { CreateOrganizationDialog } from "@/components/admin/create-organization-dialog";
import { InvitePMDialog } from "@/components/admin/invite-pm-dialog";
import { formatDistanceToNow } from "date-fns";

export default async function AdminDashboardPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const statsResult = await getAdminStats();
    const activityResult = await getRecentActivity(8);

    const stats = statsResult.success ? statsResult.data : null;
    const activities = activityResult.success ? activityResult.data : [];

    const formatCurrency = (value: number) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
        return `$${value.toLocaleString()}`;
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Welcome back, {session?.user?.name}. Here's an overview of your platform.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <CreateOrganizationDialog />
                    <InvitePMDialog />
                    <Button variant="outline" className="gap-2">
                        <Export className="h-4 w-4" />
                        Export Data
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                <AdminStatsCard
                    title="Organizations"
                    value={stats?.totalOrganizations || 0}
                    subtitle={`+${stats?.newOrgsThisMonth || 0} this month`}
                    trend={stats?.newOrgsThisMonth && stats.newOrgsThisMonth > 0 ? "up" : "neutral"}
                    trendValue={stats?.newOrgsThisMonth ? `+${stats.newOrgsThisMonth}` : undefined}
                    icon={<Buildings className="h-6 w-6" weight="duotone" />}
                    variant="primary"
                />
                <AdminStatsCard
                    title="Total Users"
                    value={stats?.totalUsers || 0}
                    subtitle={`+${stats?.newUsersThisMonth || 0} new this month`}
                    trend={stats?.newUsersThisMonth && stats.newUsersThisMonth > 0 ? "up" : "neutral"}
                    trendValue={stats?.newUsersThisMonth ? `+${stats.newUsersThisMonth}` : undefined}
                    icon={<Users className="h-6 w-6" weight="duotone" />}
                    variant="success"
                />
                <AdminStatsCard
                    title="Suppliers"
                    value={stats?.totalSuppliers || 0}
                    subtitle="Registered suppliers"
                    icon={<Package className="h-6 w-6" weight="duotone" />}
                    variant="warning"
                />
                <AdminStatsCard
                    title="Purchase Orders"
                    value={stats?.totalPurchaseOrders || 0}
                    subtitle={`${stats?.totalProjects || 0} active projects`}
                    icon={<FileText className="h-6 w-6" weight="duotone" />}
                />
                <AdminStatsCard
                    title="Total PO Value"
                    value={formatCurrency(stats?.totalPOValue || 0)}
                    subtitle="Across all organizations"
                    icon={<CurrencyDollar className="h-6 w-6" weight="duotone" />}
                    variant="success"
                />
            </div>

            {/* Charts Section */}
            <AdminDashboardCharts roleDistribution={stats?.roleDistribution || []} />

            {/* Bottom Section */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Recent Activity */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Pulse className="h-5 w-5 text-muted-foreground" />
                                Recent Activity
                            </CardTitle>
                            <Button variant="ghost" size="sm" className="text-muted-foreground">
                                View all
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {activities && activities.length > 0 ? (
                                    activities.map((activity, index) => (
                                        <div key={index} className="flex items-start gap-4">
                                            <div className={`p-2 rounded-lg shrink-0 ${activity.type === "user_signup"
                                                ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                                                : activity.type === "po_created"
                                                    ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                                                    : "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
                                                }`}>
                                                {activity.type === "user_signup" ? (
                                                    <User className="h-4 w-4" weight="duotone" />
                                                ) : activity.type === "po_created" ? (
                                                    <FileText className="h-4 w-4" weight="duotone" />
                                                ) : (
                                                    <Buildings className="h-4 w-4" weight="duotone" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm">{activity.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground shrink-0">
                                                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">No recent activity</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Link href="/dashboard/admin/organizations" className="block">
                            <Button variant="outline" className="w-full justify-between h-12">
                                <span className="flex items-center gap-2">
                                    <Buildings className="h-4 w-4" />
                                    Manage Organizations
                                </span>
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/dashboard/admin/users" className="block">
                            <Button variant="outline" className="w-full justify-between h-12">
                                <span className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Manage Users
                                </span>
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/dashboard/admin/analytics" className="block">
                            <Button variant="outline" className="w-full justify-between h-12">
                                <span className="flex items-center gap-2">
                                    <TrendUp className="h-4 w-4" />
                                    View Analytics
                                </span>
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
