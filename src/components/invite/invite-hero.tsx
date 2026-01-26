"use client";

import { ShieldCheck, Buildings, UsersThree } from "@phosphor-icons/react";

interface InviteHeroProps {
    organizationName: string;
    role: string;
}

/**
 * @deprecated This component is no longer used. 
 * The invite page now uses a split-screen layout with the hero content integrated directly.
 */
export function InviteHero({ organizationName, role }: InviteHeroProps) {
    return (
        <div className="flex flex-col items-center text-center space-y-4 mb-8 px-4 max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Buildings className="h-10 w-10" weight="duotone" />
            </div>
            
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Join{" "}
                    <span className="text-primary">{organizationName}</span>
                </h1>
                <p className="text-muted-foreground flex items-center justify-center gap-2">
                    <UsersThree className="h-4 w-4" />
                    You&apos;ve been invited as a{" "}
                    <span className="text-foreground font-semibold capitalize">
                        {role.toLowerCase().replace('_', ' ')}
                    </span>
                </p>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                <ShieldCheck className="h-4 w-4 text-green-500" weight="fill" />
                <span>Secure & encrypted platform</span>
            </div>
        </div>
    );
}
