import { Metadata } from "next";
import { SupplierScorecardsClient } from "@/components/dashboard/deep-dive";

export const metadata: Metadata = {
  title: "Supplier Scorecards | Infradyn Analytics",
  description: "Composite supplier scores, trends, and comparisons",
};

export default function SupplierScorecardsPage() {
  return (
    <div className="w-full py-6">
      <SupplierScorecardsClient />
    </div>
  );
}
