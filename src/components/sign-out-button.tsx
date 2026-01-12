"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { SignOut, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";

interface SignOutButtonProps {
    className?: string;
    variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
    fullWidth?: boolean;
}

export function SignOutButton({ className, variant = "default", fullWidth = false }: SignOutButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    async function handleSignOut() {
        setIsLoading(true);
        try {
            await authClient.signOut();
            toast.success("Signed out successfully");
            router.push("/sign-in");
        } catch (error) {
            console.error("Sign out error:", error);
            toast.error("Failed to sign out");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Button
            variant={variant}
            onClick={handleSignOut}
            disabled={isLoading}
            className={`${fullWidth ? "w-full" : ""} ${className || ""}`}
        >
            {isLoading ? (
                <>
                    <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                    Signing out...
                </>
            ) : (
                <>
                    <SignOut className="mr-2 h-4 w-4" />
                    Sign Out
                </>
            )}
        </Button>
    );
}
