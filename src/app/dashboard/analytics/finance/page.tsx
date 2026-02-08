import { Metadata } from "next";
import { CostPaymentDashboardClient } from "@/components/dashboard/deep-dive";

export const metadata: Metadata = {
  title: "Cost & Payment Dashboards | Infradyn Analytics",
  description: "Cash flow projections, budget variance, and payment analytics",
};

export default function FinanceDashboardPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <CostPaymentDashboardClient />
    </div>
  );
}
