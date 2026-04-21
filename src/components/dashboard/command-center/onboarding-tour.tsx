// Server component — fetches "has seen" state from the DB before rendering
import { hasSeen } from "@/lib/actions/tour-preferences";
import { HomeOnboardingTourClient } from "./onboarding-tour-client";

export async function HomeOnboardingTour() {
    const seen = await hasSeen("infradyn-home-tour-seen-v1");
    return <HomeOnboardingTourClient initialHasSeen={seen} />;
}
