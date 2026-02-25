import { Metadata } from "next";
import { QualityNCRAnalyticsClient } from "@/components/dashboard/deep-dive";

export const metadata: Metadata = {
  title: "Quality & NCR Analytics | Infradyn Analytics",
  description: "NCR trends, root-cause analysis, and resolution metrics",
};

export default function QualityNCRPage() {
  return (
    <div className="w-full py-6">
      <QualityNCRAnalyticsClient />
    </div>
  );
}
