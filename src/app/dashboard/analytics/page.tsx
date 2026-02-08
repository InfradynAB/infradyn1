import { Metadata } from "next";
import { ExecutiveDashboardClient } from "@/components/dashboard/executive-dashboard-client";

export const metadata: Metadata = {
    title: "Executive Dashboard | Infradyn",
    description: "Portfolio health, financial intelligence, and risk visibility",
};

export default function AnalyticsDashboardPage() {
    return (
        <div className="container mx-auto py-6 px-4 max-w-7xl">
            <ExecutiveDashboardClient />
        </div>
    );
}

