import { Metadata } from "next";
import { PMDashboardClient } from "@/components/dashboard/pm/pm-dashboard-client";

export const metadata: Metadata = {
    title: "Project Manager Dashboard | Infradyn",
    description: "Deliveries, materials, milestones, suppliers, cost & quality tracking",
};

export default function PMDashboardPage() {
    return (
        <div className="container mx-auto py-6 px-4 max-w-7xl">
            <PMDashboardClient />
        </div>
    );
}
