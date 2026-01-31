import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CommandCenterClient } from "@/components/dashboard/command-center";

export const metadata = {
    title: "Command Center | Infradyn",
    description: "Your project command center - overview of all active projects, alerts, and activities",
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
