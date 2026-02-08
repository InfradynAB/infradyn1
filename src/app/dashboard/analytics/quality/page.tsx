import { Metadata } from "next";
import { QualityNCRAnalyticsClient } from "@/components/dashboard/deep-dive";

export const metadata: Metadata = {
  title: "Quality & NCR Analytics | Infradyn Analytics",
  description: "NCR trends, root-cause analysis, and resolution metrics",
};

export default function QualityNCRPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <QualityNCRAnalyticsClient />
    </div>
  );
}
