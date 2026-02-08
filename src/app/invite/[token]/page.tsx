import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import db from "@/db/drizzle";
import { invitation } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { XCircle, Buildings, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
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

    // If invitation was already accepted, redirect to dashboard (prevents flash of "expired" message)
    if (invite && invite.status === "ACCEPTED") {
        const redirectUrl = invite.role === "SUPPLIER" 
            ? "/dashboard/supplier" 
            : "/dashboard";
        redirect(redirectUrl);
    }

    // Explicit check for undefined organization to satisfy Typescript if inference fails
    const isInvalid = !invite || invite.status !== "PENDING" || new Date() > invite.expiresAt || !invite.organization;

    if (isInvalid) {
        return (
            <div className="flex min-h-screen">
                {/* Left Panel - Branding */}
                <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-destructive/5 via-background to-destructive/10 flex-col justify-center items-center p-12">
                    <div className="max-w-md text-center space-y-6">
                        <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto">
                            <XCircle className="h-12 w-12" weight="duotone" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Invitation Expired
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            This link is no longer valid. Please contact your organization administrator to request a new invitation.
                        </p>
                    </div>
                </div>

                {/* Right Panel - Error Card */}
                <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-background">
                    <Card className="w-full max-w-md border shadow-lg">
                        <CardHeader className="text-center pt-8">
                            <div className="flex justify-center mb-4 lg:hidden">
                                <div className="h-16 w-16 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                                    <XCircle className="h-10 w-10" weight="duotone" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold">Link Expired</CardTitle>
                            <CardDescription className="text-base pt-2">
                                This invitation link is invalid, has expired, or has already been used.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex flex-col gap-3 pb-8">
                            <Link href="/sign-in" className="w-full">
                                <Button className="w-full h-11">Sign In</Button>
                            </Link>
                            <Link href="/dashboard" className="w-full">
                                <Button variant="outline" className="w-full h-11">Go to Dashboard</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }

    // Pass serializable data to client component
    return (
        <div className="flex min-h-screen">
            {/* Left Panel - Branding & Welcome */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-background to-primary/10 flex-col justify-center items-center p-12 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                
                <div className="max-w-md text-center space-y-8 relative z-10">
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                        <Buildings className="h-12 w-12" weight="duotone" />
                    </div>
                    
                    <div className="space-y-4">
                        <h1 className="text-4xl font-bold tracking-tight">
                            Welcome to <span className="text-primary">{invite.organization.name}</span>
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            You&apos;ve been invited to join as a{" "}
                            <span className="font-semibold text-foreground">
                                {invite.role.replace('_', ' ')}
                            </span>
                        </p>
                    </div>

                    {/* Trust indicators */}
                    <div className="pt-8 space-y-4">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <ShieldCheck className="h-5 w-5 text-green-500" weight="fill" />
                            <span>Secure, encrypted platform</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <ShieldCheck className="h-5 w-5 text-green-500" weight="fill" />
                            <span>Real-time collaboration tools</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <ShieldCheck className="h-5 w-5 text-green-500" weight="fill" />
                            <span>Professional project management</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Auth Form */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8 bg-background">
                {/* Mobile header - shown only on small screens */}
                <div className="lg:hidden text-center mb-6 space-y-2">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                        <Buildings className="h-8 w-8" weight="duotone" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Join <span className="text-primary">{invite.organization.name}</span>
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Invited as <span className="font-medium">{invite.role.replace('_', ' ')}</span>
                    </p>
                </div>

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

