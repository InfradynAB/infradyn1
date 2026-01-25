"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptInvitation } from "@/lib/actions/invitation";
import Link from "next/link";
import { CheckCircle, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";

import { InviteAuthForm } from "./invite-auth-form";

interface InviteClientProps {
    token: string;
    organizationName: string;
    role: string;
    inviteEmail: string;
    isLoggedIn: boolean;
    currentUserEmail?: string | null;
}

export function InviteClient({
    token,
    organizationName,
    role,
    inviteEmail,
    isLoggedIn: initialIsLoggedIn,
    currentUserEmail
}: InviteClientProps) {
    const [isPending, startTransition] = useTransition();
    const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);

    const handleAccept = () => {
        startTransition(async () => {
            try {
                const result = await acceptInvitation(token);
                if (result.success) {
                    toast.success("Invitation accepted! Redirecting...");
                    // Use hard redirect to ensure the new active org cookie is read by the server
                    // router.push() does client-side navigation which may not pick up the new cookie
                    if (result.role === "SUPPLIER") {
                        window.location.href = "/dashboard/supplier/onboarding";
                    } else {
                        window.location.href = "/dashboard";
                    }
                } else {
                    toast.error(result.error || "Failed to accept invitation.");
                }
            } catch (error) {
                toast.error("Something went wrong. Please try again.");
            }
        });
    };

    // Callback when auth succeeds in the inline form
    const onAuthSuccess = () => {
        setIsLoggedIn(true);
        // Automatically try to accept the invite
        handleAccept();
    };

    // Warning if logged in with wrong email (Optional UX improvement)
    const emailMismatch = isLoggedIn && currentUserEmail && currentUserEmail !== inviteEmail;

    return (
        <Card className="w-[420px]">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <CheckCircle className="h-7 w-7" weight="duotone" />
                    </div>
                </div>
                <CardTitle className="text-xl">Ready to Join?</CardTitle>
                <CardDescription>
                    Activate your account and join the workspace.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {emailMismatch && (
                    <div className="bg-amber-500/10 text-amber-600 p-4 rounded-xl text-sm border border-amber-500/20 flex items-start gap-3">
                        <CircleNotch className="h-5 w-5 rotate-45 shrink-0" weight="bold" />
                        <span>
                            Warning: You are logged in as <strong>{currentUserEmail}</strong>, but this invite was sent to <strong>{inviteEmail}</strong>.
                        </span>
                    </div>
                )}

                {!isLoggedIn ? (
                    <InviteAuthForm email={inviteEmail} onSuccess={onAuthSuccess} />
                ) : (
                    <div className="text-center bg-muted/30 p-4 rounded-lg border border-muted">
                        <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
                        <p className="font-semibold">{currentUserEmail}</p>
                    </div>
                )}
            </CardContent>

            {isLoggedIn && (
                <CardFooter className="flex flex-col gap-2">
                    <Button
                        className="w-full"
                        onClick={handleAccept}
                        disabled={isPending}
                    >
                        {isPending ? (
                            <>
                                <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                                Setting up...
                            </>
                        ) : (
                            "Accept & Start"
                        )}
                    </Button>
                    <Link href="/dashboard" className="w-full">
                        <Button variant="ghost" className="w-full text-muted-foreground" disabled={isPending}>
                            Decline invitation
                        </Button>
                    </Link>
                </CardFooter>
            )}
        </Card>
    );
}

