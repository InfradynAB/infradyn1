import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LogisticsLiveSection } from "@/components/dashboard/analytics/live-deep-dive-sections";
import { getLogisticsDeepDiveData } from "@/lib/services/analytics-deep-dive";

export const metadata: Metadata = {
  title: "Logistics Timelines | Infradyn Analytics",
  description: "Shipment pipelines, carrier performance, and transit tracking",
};

export default async function LogisticsTimelinesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/sign-in");
  }

  if (!session.user.organizationId) {
    return <div className="py-6 text-sm text-muted-foreground">No active organization found.</div>;
  }

  const data = await getLogisticsDeepDiveData({
    organizationId: session.user.organizationId,
  });

  return (
    <div className="w-full py-6">
      <LogisticsLiveSection data={data} />
    </div>
  );
}
