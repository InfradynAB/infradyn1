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

import { InviteHero } from "@/components/invite/invite-hero";

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
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
                <Card className="w-full max-w-md border-none shadow-2xl bg-card/60 backdrop-blur-md overflow-hidden">
                    <CardHeader className="text-center pt-10">
                        <div className="flex justify-center mb-6">
                            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                                <XCircle className="h-12 w-12" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-black">Link Expired</CardTitle>
                        <CardDescription className="text-base pt-2">
                            This invitation link is invalid, reached its expiry, or has already been used to activate an account.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center pb-10">
                        <Link href="/dashboard">
                            <Button variant="secondary" className="h-12 px-8 rounded-xl font-bold">Return to Dashboard</Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Pass serializable data to client component
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden py-20 px-6">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
            </div>

            <InviteHero
                organizationName={invite.organization.name}
                role={invite.role}
            />

            <div className="w-full max-w-md animate-in slide-in-from-bottom-8 duration-700 delay-150">
                <InviteClient
                    token={token}
                    organizationName={invite.organization.name}
                    role={invite.role}
                    inviteEmail={invite.email}
                    isLoggedIn={!!session?.user}
                    currentUserEmail={session?.user?.email}
                />
            </div>
        </div>
    );
}

