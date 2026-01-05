import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getQuotaStatus } from "@/lib/services/usage-quota";
import { listExternalSyncs } from "@/lib/actions/external-sync";
import { listEmailIngestions } from "@/lib/actions/email-ingestion";
import { IntegrationsClient } from "./integrations-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import db from "@/db/drizzle";
import { member } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function IntegrationsPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    // Must be signed in
    if (!session?.user) {
        redirect("/sign-in");
    }

    // Fetch user's organization membership from member table
    const membership = await db.query.member.findFirst({
        where: eq(member.userId, session.user.id),
        with: {
            organization: true,
        },
    });

    const organizationId = membership?.organizationId;

    // If no organization, show a helpful message instead of redirecting
    if (!organizationId) {
        return (
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-bold">Integrations</h1>
                    <p className="text-muted-foreground">
                        Connect external services and manage AI usage quotas.
                    </p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Organization Required</CardTitle>
                        <CardDescription>
                            You need to create or join an organization to use integrations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard/org">
                            <Button>Go to Organizations</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Fetch quota, sync, and email data
    const [quotaStatus, syncsResult, emailsResult] = await Promise.all([
        getQuotaStatus(organizationId),
        listExternalSyncs(),
        listEmailIngestions(10),
    ]);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold">Integrations</h1>
                <p className="text-muted-foreground">
                    Connect external services and manage AI usage quotas.
                </p>
            </div>

            <IntegrationsClient
                quotaStatus={quotaStatus}
                syncs={syncsResult.data || []}
                emails={emailsResult.data || []}
                organizationId={organizationId}
            />
        </div>
    );
}


