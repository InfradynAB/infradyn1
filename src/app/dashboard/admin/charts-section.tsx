"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    AdminLineChart,
    AdminBarChart,
    AdminPieChart,
} from "@/components/admin/admin-charts";

// Placeholder data for charts
const monthlyActivityData = [
    { name: "Jan", value: 12, value2: 8 },
    { name: "Feb", value: 19, value2: 14 },
    { name: "Mar", value: 25, value2: 18 },
    { name: "Apr", value: 32, value2: 24 },
    { name: "May", value: 28, value2: 20 },
    { name: "Jun", value: 38, value2: 29 },
    { name: "Jul", value: 45, value2: 35 },
    { name: "Aug", value: 52, value2: 42 },
    { name: "Sep", value: 48, value2: 38 },
    { name: "Oct", value: 58, value2: 45 },
    { name: "Nov", value: 65, value2: 52 },
    { name: "Dec", value: 72, value2: 58 },
];

const poValueByMonthData = [
    { name: "Jan", value: 450000 },
    { name: "Feb", value: 620000 },
    { name: "Mar", value: 890000 },
    { name: "Apr", value: 750000 },
    { name: "May", value: 1100000 },
    { name: "Jun", value: 980000 },
    { name: "Jul", value: 1250000 },
    { name: "Aug", value: 1400000 },
    { name: "Sep", value: 1150000 },
    { name: "Oct", value: 1600000 },
    { name: "Nov", value: 1450000 },
    { name: "Dec", value: 1800000 },
];

interface AdminDashboardChartsProps {
    roleDistribution: { name: string; value: number }[];
}

export function AdminDashboardCharts({ roleDistribution }: AdminDashboardChartsProps) {
    // Use actual role distribution or placeholder
    const pieData = roleDistribution.length > 0
        ? roleDistribution
        : [
            { name: "PM", value: 45 },
            { name: "Admin", value: 5 },
            { name: "Supplier", value: 120 },
            { name: "QA", value: 15 },
            { name: "Site Receiver", value: 8 },
        ];

    return (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {/* Monthly Activity */}
            <ChartContainer
                title="Platform Activity"
                subtitle="Users & POs created per month"
                className="xl:col-span-2"
            >
                <AdminLineChart
                    data={monthlyActivityData}
                    height={280}
                    showSecondLine
                    color="primary"
                    secondaryColor="success"
                />
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <span className="text-muted-foreground">Users</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <span className="text-muted-foreground">Purchase Orders</span>
                    </div>
                </div>
            </ChartContainer>

            {/* User Distribution */}
            <ChartContainer
                title="User Distribution"
                subtitle="By role"
            >
                <AdminPieChart data={pieData} height={280} />
            </ChartContainer>

            {/* PO Value by Month */}
            <ChartContainer
                title="PO Value by Month"
                subtitle="Total value of purchase orders"
                className="xl:col-span-3"
            >
                <AdminBarChart
                    data={poValueByMonthData.map(d => ({
                        name: d.name,
                        value: d.value / 1000, // Show in K
                    }))}
                    height={250}
                    color="primary"
                />
                <p className="text-xs text-muted-foreground text-center mt-2">Values in thousands ($K)</p>
            </ChartContainer>
        </div>
    );
}
