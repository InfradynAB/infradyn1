import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveOrganization } from "@/lib/auth-utils";
import { NCRListPageClient } from "./ncr-list-client";

export const metadata = {
    title: "NCR Management | InfraDyn",
    description: "View and manage Non-Conformance Reports",
};

export default async function NCRPage({
    searchParams,
}: {
    searchParams: Promise<{ filter?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        redirect("/sign-in");
    }

    const activeOrg = await getActiveOrganization();
    if (!activeOrg) {
        redirect("/dashboard?error=no-organization");
    }

    const params = await searchParams;
    const filter = params.filter || "all";

    return (
        <div className="container py-6">
            <NCRListPageClient 
                organizationId={activeOrg.id} 
                initialFilter={filter}
            />
        </div>
    );
}
