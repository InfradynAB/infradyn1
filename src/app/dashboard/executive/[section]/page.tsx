import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { ExecutiveDashboardClient } from "@/components/dashboard/executive-dashboard-client";

const SECTION_TITLES = {
    overview: "Overview",
    projects: "Projects",
    approvals: "Approvals",
    risks: "Risks & Alerts",
    financials: "Financials",
    data: "All Metrics",
} as const;

type ExecutiveSection = keyof typeof SECTION_TITLES;

interface PageProps {
    params: Promise<{ section: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { section } = await params;
    const title = SECTION_TITLES[section as ExecutiveSection] ?? "Executive Dashboard";

    return {
        title: `${title} | Executive Dashboard | Infradyn`,
        description: "Executive analytics by section with chart and table workflows.",
    };
}

export default async function ExecutiveSectionPage({ params }: PageProps) {
    const { section } = await params;

    const session = await auth.api.getSession({ headers: await headers() });
    const userRole = session?.user?.role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
        redirect("/dashboard/access-denied");
    }

    if (!(section in SECTION_TITLES)) {
        notFound();
    }

    return <ExecutiveDashboardClient />;
}
