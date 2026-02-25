import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PMDashboardClient } from "@/components/dashboard/pm/pm-dashboard-client";

const SECTION_TITLES = {
    overview: "Overview",
    deliveries: "Deliveries",
    materials: "Materials",
    quality: "Quality & NCRs",
    milestones: "Milestones",
    suppliers: "Suppliers",
    financials: "Cost & Budget",
    inspections: "Inspections",
} as const;

type PMSection = keyof typeof SECTION_TITLES;

interface PageProps {
    params: Promise<{ section: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { section } = await params;
    const title = SECTION_TITLES[section as PMSection] ?? "Project Manager Dashboard";

    return {
        title: `${title} | Project Manager Dashboard | Infradyn`,
        description: "Project manager analytics by section with shared filters and controls.",
    };
}

export default async function PMSectionPage({ params }: PageProps) {
    const { section } = await params;

    if (!(section in SECTION_TITLES)) {
        notFound();
    }

    return (
        <div className="w-full py-6">
            <PMDashboardClient />
        </div>
    );
}
