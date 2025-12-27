"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);

    const handleAccept = () => {
        startTransition(async () => {
            try {
                const result = await acceptInvitation(token);
                if (result.success) {
                    toast.success("Invitation accepted! Redirecting...");
                    if (result.role === "SUPPLIER") {
                        router.push("/dashboard/supplier/onboarding");
                    } else {
                        router.push("/dashboard");
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
        <Card className="w-full max-w-md border-none shadow-2xl bg-card/60 backdrop-blur-xl overflow-hidden ring-1 ring-white/10">
            <CardHeader className="text-center pt-8">
                <div className="flex justify-center mb-6">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <CheckCircle className="h-10 w-10" weight="duotone" />
                    </div>
                </div>
                <CardTitle className="text-2xl font-black">Ready to Join?</CardTitle>
                <CardDescription className="text-base font-medium">
                    Activate your account and join the workspace.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-8">
                {emailMismatch && (
                    <div className="bg-amber-500/10 text-amber-600 p-4 rounded-xl text-sm border border-amber-500/20 flex items-start gap-3">
                        <CircleNotch className="h-5 w-5 rotate-45 shrink-0" weight="bold" />
                        <span>
                            Warning: You are logged in as <strong>{currentUserEmail}</strong>, but this invite was sent to <strong>{inviteEmail}</strong>.
                        </span>
                    </div>
                )}

                {!isLoggedIn ? (
                    <div className="bg-muted/30 p-6 rounded-2xl border border-muted/50">
                        <InviteAuthForm email={inviteEmail} onSuccess={onAuthSuccess} />
                    </div>
                ) : (
                    <div className="text-center bg-blue-500/5 p-6 rounded-2xl border border-blue-500/10">
                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Authenticated</p>
                        <p className="font-bold text-lg">{currentUserEmail}</p>
                    </div>
                )}
            </CardContent>

            {isLoggedIn && (
                <CardFooter className="flex flex-col gap-3 px-8 pb-8">
                    <Button
                        className="w-full h-14 rounded-xl font-black text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        onClick={handleAccept}
                        disabled={isPending}
                    >
                        {isPending ? (
                            <>
                                <CircleNotch className="mr-2 h-6 w-6 animate-spin" />
                                Setting up...
                            </>
                        ) : (
                            "Accept & Start"
                        )}
                    </Button>
                    <Link href="/dashboard" className="w-full">
                        <Button variant="ghost" className="w-full h-12 rounded-xl text-muted-foreground font-bold hover:bg-transparent hover:text-foreground" disabled={isPending}>
                            Decline invitation
                        </Button>
                    </Link>
                </CardFooter>
            )}
        </Card>
    );
}

