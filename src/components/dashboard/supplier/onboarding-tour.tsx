"use client";

import { OnboardingTour, TourStep } from "@/components/dashboard/shared/onboarding-tour";

const TOUR_STEPS: TourStep[] = [
    {
        id: "readiness",
        targetId: "tour-readiness",
        title: "Your Readiness Score",
        content: "This score shows how complete your profile is. A higher score builds more trust with buyers and unlocks full portal access.",
        position: "bottom",
    },
    {
        id: "stats",
        targetId: "tour-stats",
        title: "Actionable Insights",
        content: "Track your open NCRs, pending POs, and shipments at a glance. Elements with a red dot require your immediate attention.",
        position: "bottom",
    },
    {
        id: "performance",
        targetId: "tour-performance",
        title: "Performance Tracking",
        content: "We monitor your response rate, reporting accuracy, and reliability. Staying on top of these metrics improves your standing.",
        position: "left",
    },
    {
        id: "milestones",
        targetId: "tour-milestones",
        title: "Upcoming Deadlines",
        content: "Check here for upcoming project milestones. Stay ahead of your schedule and never miss a delivery date.",
        position: "top",
    },
    {
        id: "onboarding",
        targetId: "tour-onboarding",
        title: "Profile & Documents",
        content: "Manage your certifications, company records, and certifications here to stay compliant.",
        position: "top",
    }
];

export function OnboardingTourWrapper() {
    return (
        <OnboardingTour
            steps={TOUR_STEPS}
            storageKey="infradyn-supplier-tour-seen"
            welcomeTitle="Welcome to your Portal"
            welcomeSubtitle="Let’s get you settled into your new supplier dashboard."
            accentColor="indigo-600"
            role="supplier"
        />
    );
}
