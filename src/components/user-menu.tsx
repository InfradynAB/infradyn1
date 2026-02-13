"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, SignOut, Gear, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";

interface UserMenuProps {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    } | null;
}

export function UserMenu({ user }: UserMenuProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Get initials for avatar fallback
    const getInitials = (name?: string | null) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

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

    if (!user) {
        return (
            <Button variant="ghost" size="sm" asChild>
                <a href="/sign-in">Sign In</a>
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 min-w-[220px] justify-start gap-2 rounded-xl border border-border/70 bg-muted/20 px-2.5 hover:bg-muted/35">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col items-start">
                        <span className="truncate text-sm font-medium leading-tight">{user.name || "User"}</span>
                        <span className="truncate text-xs leading-tight text-muted-foreground">{user.email || ""}</span>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                    <a href="/dashboard/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                    <a href="/dashboard/settings" className="flex items-center">
                        <Gear className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={handleSignOut}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <SignOut className="mr-2 h-4 w-4" />
                    )}
                    <span>Sign out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
