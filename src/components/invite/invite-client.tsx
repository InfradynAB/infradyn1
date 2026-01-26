"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptInvitation } from "@/lib/actions/invitation";
import Link from "next/link";
import { CheckCircle, CircleNotch, Warning, Rocket, ArrowRight } from "@phosphor-icons/react";
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
    const [isAccepting, setIsAccepting] = useState(false);

    const handleAccept = () => {
        startTransition(async () => {
            try {
                setIsAccepting(true);
                const result = await acceptInvitation(token);
                if (result.success) {
                    toast.success("Welcome aboard! Redirecting to your dashboard...");
                    // Use hard redirect to ensure the new active org cookie is read by the server
                    if (result.role === "SUPPLIER") {
                        window.location.href = "/dashboard/supplier/onboarding";
                    } else {
                        window.location.href = "/dashboard";
                    }
                } else {
                    toast.error(result.error || "Failed to accept invitation.");
                    setIsAccepting(false);
                }
            } catch (error) {
                toast.error("Something went wrong. Please try again.");
                setIsAccepting(false);
            }
        });
    };

    // Callback when auth succeeds in the inline form
    const onAuthSuccess = () => {
        setIsLoggedIn(true);
        // Automatically try to accept the invite
        handleAccept();
    };

    // Warning if logged in with wrong email
    const emailMismatch = isLoggedIn && currentUserEmail && currentUserEmail !== inviteEmail;

    // If already logged in, show simple acceptance card
    if (isLoggedIn) {
        return (
            <Card className="w-full max-w-md border shadow-lg">
                <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                        <div className="h-14 w-14 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
                            <CheckCircle className="h-8 w-8" weight="duotone" />
                        </div>
                    </div>
                    <CardTitle className="text-xl">Ready to Join!</CardTitle>
                    <CardDescription>
                        You&apos;re signed in and ready to accept this invitation.
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                    {emailMismatch && (
                        <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 p-4 rounded-xl text-sm border border-amber-500/20 flex items-start gap-3">
                            <Warning className="h-5 w-5 shrink-0 mt-0.5" weight="fill" />
                            <div>
                                <p className="font-medium">Email Mismatch</p>
                                <p className="text-amber-600 dark:text-amber-500 mt-1">
                                    You&apos;re signed in as <strong>{currentUserEmail}</strong>, but this invite was sent to <strong>{inviteEmail}</strong>.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="text-center bg-muted/40 p-4 rounded-xl border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Signed in as</p>
                        <p className="font-semibold">{currentUserEmail}</p>
                    </div>

                    {/* Invitation Summary */}
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Organization</span>
                            <span className="font-medium">{organizationName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Role</span>
                            <span className="font-medium capitalize">{role.toLowerCase().replace('_', ' ')}</span>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pt-2">
                    <Button
                        className="w-full h-12 text-base font-semibold"
                        onClick={handleAccept}
                        disabled={isPending || isAccepting}
                    >
                        {(isPending || isAccepting) ? (
                            <>
                                <CircleNotch className="mr-2 h-5 w-5 animate-spin" />
                                Setting up your workspace...
                            </>
                        ) : (
                            <>
                                <Rocket className="mr-2 h-5 w-5" weight="duotone" />
                                Accept & Get Started
                            </>
                        )}
                    </Button>
                    <Link href="/dashboard" className="w-full">
                        <Button variant="ghost" className="w-full text-muted-foreground" disabled={isPending}>
                            Decline Invitation
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        );
    }

    // Not logged in - show auth form
    return (
        <Card className="w-full max-w-md border shadow-lg">
            <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl font-bold">Get Started</CardTitle>
                <CardDescription className="text-base">
                    Create an account or sign in to accept your invitation
                </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-4">
                {/* Invitation info badge */}
                <div className="mb-6 p-3 bg-muted/40 rounded-xl border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-primary" weight="fill" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Invitation for</p>
                            <p className="text-sm font-medium truncate max-w-[180px]">{inviteEmail}</p>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <InviteAuthForm email={inviteEmail} onSuccess={onAuthSuccess} />
            </CardContent>
        </Card>
    );
}

