import { Metadata } from "next";
import { LogisticsTimelinesClient } from "@/components/dashboard/deep-dive";

export const metadata: Metadata = {
  title: "Logistics Timelines | Infradyn Analytics",
  description: "Shipment pipelines, carrier performance, and transit tracking",
};

export default function LogisticsTimelinesPage() {
  return (
    <div className="w-full py-6">
      <LogisticsTimelinesClient />
    </div>
  );
}
