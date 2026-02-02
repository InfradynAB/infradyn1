import { Metadata } from "next";
import { HealthDashboard } from "@/components/health/health-dashboard";

export const metadata: Metadata = {
    title: "System Health | Infradyn",
    description: "Monitor the health status of all system services and endpoints",
};

export const dynamic = "force-dynamic";

export default function HealthPage() {
    return (
        <main className="min-h-screen bg-background">
            <HealthDashboard />
        </main>
    );
}
