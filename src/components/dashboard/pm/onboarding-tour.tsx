// Server component — fetches "has seen" state from the DB before rendering
import { hasSeen } from "@/lib/actions/tour-preferences";
import { PMOnboardingTourClient } from "./onboarding-tour-client";

export async function PMOnboardingTour() {
    const seen = await hasSeen("infradyn-pm-analytics-tour-seen-v1");
    return <PMOnboardingTourClient initialHasSeen={seen} />;
}
