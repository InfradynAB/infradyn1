import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { QualityLiveSection } from "@/components/dashboard/analytics/live-deep-dive-sections";
import { getQualityDeepDiveData } from "@/lib/services/analytics-deep-dive";

export const metadata: Metadata = {
  title: "Quality & NCR Analytics | Infradyn Analytics",
  description: "NCR trends, root-cause analysis, and resolution metrics",
};

export default async function QualityNCRPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/sign-in");
  }

  if (!session.user.organizationId) {
    return <div className="py-6 text-sm text-muted-foreground">No active organization found.</div>;
  }

  const data = await getQualityDeepDiveData({
    organizationId: session.user.organizationId,
  });

  return (
    <div className="w-full py-6">
      <QualityLiveSection data={data} />
    </div>
  );
}
