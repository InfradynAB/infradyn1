import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import db from "@/db/drizzle";
import { invitation } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { XCircle } from "@phosphor-icons/react/dist/ssr";
import { InviteClient } from "@/components/invite/invite-client";
import { auth } from "@/auth";
import { headers } from "next/headers";

// This is a public page, but validation happens in server action
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {

    const { token } = await params;
    const session = await auth.api.getSession({
        headers: await headers()
    });


    // Fetch basic invite info to show context *before* accepting
    const invite = await db.query.invitation.findFirst({
        where: eq(invitation.token, token),
        with: {
            organization: true
        }
    });

    // Explicit check for undefined organization to satisfy Typescript if inference fails
    const isInvalid = !invite || invite.status !== "PENDING" || new Date() > invite.expiresAt || !invite.organization;

    if (isInvalid) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/50">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <XCircle className="h-12 w-12 text-destructive" />
                        </div>
                        <CardTitle>Invalid Invitation</CardTitle>
                        <CardDescription>
                            This link is invalid, expired, or has already been used.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Link href="/dashboard">
                            <Button variant="secondary">Go to Dashboard</Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Pass serializable data to client component
    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/50">
            <InviteClient
                token={token}
                organizationName={invite.organization.name}
                role={invite.role}
                inviteEmail={invite.email}
                isLoggedIn={!!session?.user}
                currentUserEmail={session?.user?.email}
            />
        </div>
    );
}

