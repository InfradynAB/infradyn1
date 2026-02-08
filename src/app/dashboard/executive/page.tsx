import { Metadata } from "next";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ExecutiveDashboardClient } from "@/components/dashboard/executive-dashboard-client";

export const metadata: Metadata = {
  title: "Executive Dashboard | Infradyn",
  description: "Portfolio overview, risk heatmaps, and financial summary for executives",
};

export default async function ExecutiveDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  // Only allow ADMIN and SUPER_ADMIN
  const userRole = session?.user?.role;
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    redirect("/dashboard/access-denied");
  }

  return <ExecutiveDashboardClient />;
}
