import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CommandCenterClient } from "@/components/dashboard/command-center";
import { HomeOnboardingTour } from "@/components/dashboard/command-center/onboarding-tour";

export const metadata = {
    title: "Home | Infradyn",
    description: "Your project overview - all active projects, alerts, and activities",
};

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        redirect("/sign-in");
    }

    // Redirect suppliers and site receivers to dedicated dashboards
    if (session.user.role === "SUPPLIER") {
        redirect("/dashboard/supplier");
    }
    if (session.user.role === "SITE_RECEIVER") {
        redirect("/dashboard/receiver");
    }

    return (
        <CommandCenterClient
            userName={session.user.name || undefined}
            userRole={session.user.role}
        >
            <HomeOnboardingTour />
        </CommandCenterClient>
    );
}
