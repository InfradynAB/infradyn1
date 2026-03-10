import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SuppliersLiveSection } from "@/components/dashboard/analytics/live-deep-dive-sections";
import { getSuppliersDeepDiveData } from "@/lib/services/analytics-deep-dive";

export const metadata: Metadata = {
  title: "Supplier Scorecards | Infradyn Analytics",
  description: "Composite supplier scores, trends, and comparisons",
};

export default async function SupplierScorecardsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/sign-in");
  }

  if (!session.user.organizationId) {
    return <div className="py-6 text-sm text-muted-foreground">No active organization found.</div>;
  }

  const data = await getSuppliersDeepDiveData({
    organizationId: session.user.organizationId,
  });

  return (
    <div className="w-full py-6">
      <SuppliersLiveSection data={data} />
    </div>
  );
}
