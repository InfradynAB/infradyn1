import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Project Manager Dashboard | Infradyn",
    description: "Deliveries, materials, milestones, suppliers, cost & quality tracking",
};

export default function PMDashboardPage() {
    redirect("/dashboard/pm/overview");
}
