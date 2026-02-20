"use client";

import { OnboardingTour, type TourStep } from "@/components/dashboard/shared/onboarding-tour";

const HOME_TOUR_STEPS: TourStep[] = [
    {
        id: "home-header",
        targetId: "tour-home-header",
        title: "Home Overview",
        content: "This is your command center summary with quick actions and current portfolio health.",
        position: "bottom",
    },
    {
        id: "home-search",
        targetId: "tour-global-search",
        title: "Global Search",
        content: "Search POs, suppliers, and invoices from one place.",
        position: "bottom",
    },
    {
        id: "home-stats",
        targetId: "tour-home-stats",
        title: "Quick Stats",
        content: "Track committed value, progress, milestones, and active contracts at a glance.",
        position: "top",
    },
    {
        id: "home-priorities",
        targetId: "tour-home-priorities",
        title: "Top Priorities",
        content: "Use this queue to focus on urgent items first.",
        position: "left",
    },
    {
        id: "home-projects",
        targetId: "tour-home-projects",
        title: "Active Projects",
        content: "See all active projects, their health, and jump into any project detail quickly.",
        position: "top",
    },
    {
        id: "home-activity",
        targetId: "tour-home-activity",
        title: "Recent Activity",
        content: "Track the latest updates, approvals, and events happening across your portfolio.",
        position: "top",
    },
    {
        id: "home-actions",
        targetId: "tour-home-actions",
        title: "Quick Actions",
        content: "Create a PO, download reports, or add suppliers without leaving Home.",
        position: "left",
    },
];

export function HomeOnboardingTour() {
    return (
        <OnboardingTour
            steps={HOME_TOUR_STEPS}
            storageKey="infradyn-home-tour-seen-v1"
            welcomeTitle="Welcome to Home"
            welcomeSubtitle="A short walkthrough to get you started quickly."
            accentColor="teal-600"
            role="pm"
        />
    );
}
