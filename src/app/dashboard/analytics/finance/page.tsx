import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FinanceLiveSection } from "@/components/dashboard/analytics/live-deep-dive-sections";
import { getFinanceDeepDiveData } from "@/lib/services/analytics-deep-dive";

export const metadata: Metadata = {
  title: "Cost & Payment Dashboards | Infradyn Analytics",
  description: "Cash flow projections, budget variance, and payment analytics",
};

export default async function FinanceDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/sign-in");
  }

  if (!session.user.organizationId) {
    return <div className="py-6 text-sm text-muted-foreground">No active organization found.</div>;
  }

  const data = await getFinanceDeepDiveData({
    organizationId: session.user.organizationId,
  });

  return (
    <div className="w-full py-6">
      <FinanceLiveSection data={data} />
    </div>
  );
}
