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
                    router.push("/dashboard");
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
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <CheckCircle className="h-12 w-12 text-primary" weight="fill" />
                </div>
                <CardTitle>Join {organizationName}</CardTitle>
                <CardDescription>
                    You have been invited to join <strong>{organizationName}</strong> as a <strong>{role}</strong>.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {emailMismatch && (
                    <div className="bg-yellow-500/15 text-yellow-600 p-3 rounded-md text-sm mb-4 border border-yellow-200">
                        Warning: You are logged in as <strong>{currentUserEmail}</strong>, but this invite was sent to <strong>{inviteEmail}</strong>.
                    </div>
                )}

                {!isLoggedIn ? (
                    <InviteAuthForm email={inviteEmail} onSuccess={onAuthSuccess} />
                ) : (
                    <p className="text-center text-sm text-muted-foreground">
                        Click below to accept this invitation.
                    </p>
                )}
            </CardContent>

            {isLoggedIn && (
                <CardFooter className="flex flex-col gap-2">
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleAccept}
                        disabled={isPending}
                    >
                        {isPending ? (
                            <>
                                <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                                Joining...
                            </>
                        ) : (
                            "Accept Invitation"
                        )}
                    </Button>
                    <Link href="/dashboard" className="w-full">
                        <Button variant="ghost" className="w-full" disabled={isPending}>Cancel</Button>
                    </Link>
                </CardFooter>
            )}
        </Card>
    );
}

