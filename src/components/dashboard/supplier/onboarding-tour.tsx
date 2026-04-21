// Server component — fetches "has seen" state from the DB before rendering
import { hasSeen } from "@/lib/actions/tour-preferences";
import { SupplierTourClient } from "./onboarding-tour-client";

export async function OnboardingTourWrapper() {
    const seen = await hasSeen("infradyn-supplier-tour-seen");
    return <SupplierTourClient initialHasSeen={seen} />;
}
