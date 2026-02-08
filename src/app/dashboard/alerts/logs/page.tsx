import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AlertLogsClient } from "./logs-client";
import { auth } from "@/auth";

export const metadata = {
    title: "Alert Logs | InfraDyn",
    description: "History of alert responses and actions taken",
};

export default async function AlertLogsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        redirect("/sign-in");
    }

    return (
        <div className="container py-6">
            <AlertLogsClient />
        </div>
    );
}
