import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AlertsPageClient } from "./alerts-client";

export const metadata = {
    title: "Alerts | Infradyn",
    description: "View and manage all system alerts requiring your attention",
};

export default async function AlertsPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        redirect("/sign-in");
    }

    return <AlertsPageClient />;
}
