import { Metadata } from "next";
import { AnalyticsDashboardClient } from "@/components/dashboard/analytics-dashboard-client";

export const metadata: Metadata = {
    title: "Analytics Dashboard | Infradyn",
    description: "Executive overview of project financials, progress, and health metrics",
};

export default function AnalyticsDashboardPage() {
    return (
        <div className="container mx-auto py-6 px-4 max-w-7xl">
            <AnalyticsDashboardClient />
        </div>
    );
}
