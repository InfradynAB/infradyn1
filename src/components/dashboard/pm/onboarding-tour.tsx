"use client";

import { OnboardingTour, TourStep } from "../shared/onboarding-tour";

const PM_TOUR_STEPS: TourStep[] = [
    {
        id: "header",
        targetId: "tour-pm-header",
        title: "Command Center",
        content: "Filter your view by project and timeframe. All charts and tables will sync instantly to your selection.",
        position: "bottom",
    },
    {
        id: "nav",
        targetId: "tour-pm-nav",
        title: "Quick Navigation",
        content: "Jump directly to specific areas like Overview, Deliveries, and Financials. We'll track your scroll position automatically.",
        position: "bottom",
    },
    {
        id: "content",
        targetId: "tour-pm-content",
        title: "Section Workspace",
        content: "This area changes by tab and holds charts and tables for the selected PM section.",
        position: "top",
    }
];

export function PMOnboardingTour() {
    return (
        <OnboardingTour
            steps={PM_TOUR_STEPS}
            storageKey="infradyn-pm-analytics-tour-seen-v1"
            welcomeTitle="Welcome, Project Manager."
            welcomeSubtitle="A short walkthrough of your analytics workspace."
            accentColor="teal-600"
            role="pm"
        />
    );
}
