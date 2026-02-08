import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CommandCenterClient } from "@/components/dashboard/command-center";

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

    return (
        <CommandCenterClient userName={session.user.name || undefined} />
    );
}
