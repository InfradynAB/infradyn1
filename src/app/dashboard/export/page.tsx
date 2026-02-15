import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ExportBuilderClient } from "@/components/dashboard/export/export-builder-client";

export const metadata = {
    title: "Export Center | Infradyn",
    description: "Build custom exports for sharing with executives, clients, and teams",
};

export default async function ExportPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect("/sign-in");
    }

    return <ExportBuilderClient userRole={session.user.role || "PM"} />;
}
