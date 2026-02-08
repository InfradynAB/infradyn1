import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Analytics | Infradyn",
  description: "Deep-dive analytics across suppliers, quality, logistics, and finance",
};

const pages = [
  {
    title: "Supplier Scorecards",
    description: "Composite scores, trend analysis, and side-by-side comparisons",
    href: "/dashboard/analytics/suppliers",
  },
  {
    title: "Quality & NCR",
    description: "NCR trends, root-cause analysis, and resolution metrics",
    href: "/dashboard/analytics/quality",
  },
  {
    title: "Logistics",
    description: "Shipment pipelines, carrier performance, and transit tracking",
    href: "/dashboard/analytics/logistics",
  },
  {
    title: "Finance",
    description: "Cash flow, budget variance, and payment cycles",
    href: "/dashboard/analytics/finance",
  },
];

export default async function AnalyticsHubPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = session?.user?.role;
  const isPM = userRole === "PM" || userRole === "PROJECT_MANAGER";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Deep-dive dashboards for procurement operations
        </p>
      </div>

      {/* Executive Dashboard - Only for Admins */}
      {isAdmin && (
        <Link 
          href="/dashboard/executive" 
          className="group flex items-center justify-between p-4 mb-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div>
            <p className="font-medium">Executive Dashboard</p>
            <p className="text-sm text-muted-foreground">Portfolio overview, risk heatmaps, and financial summary</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Admin Dashboard - Only for Admins */}
      {isAdmin && (
        <Link 
          href="/dashboard/admin" 
          className="group flex items-center justify-between p-4 mb-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div>
            <p className="font-medium">Admin Dashboard</p>
            <p className="text-sm text-muted-foreground">Manage organization, members, and permissions</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* PM Dashboard - Only for Project Managers */}
      {isPM && (
        <Link 
          href="/dashboard/pm" 
          className="group flex items-center justify-between p-4 mb-6 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div>
            <p className="font-medium">My PM Dashboard</p>
            <p className="text-sm text-muted-foreground">Your projects, POs, and performance metrics</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Deep Dive
      </div>

      <div className="rounded-lg border bg-card divide-y">
        {pages.map((p) => (
          <Link 
            key={p.href} 
            href={p.href} 
            className="group flex items-center justify-between p-4 hover:bg-accent/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
          >
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-sm text-muted-foreground">{p.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ))}
      </div>
    </div>
  );
}

