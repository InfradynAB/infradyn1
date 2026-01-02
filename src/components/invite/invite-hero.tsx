"use client";

import { ShieldCheckIcon, BuildingsIcon, UserCircleGearIcon } from "@phosphor-icons/react";

interface InviteHeroProps {
    organizationName: string;
    role: string;
}

export function InviteHero({ organizationName, role }: InviteHeroProps) {
    return (
        <div className="flex flex-col items-center text-center space-y-3 mb-6 px-4">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Welcome to{" "}
                    <span className="text-primary">{organizationName}</span>
                </h1>
                <p className="text-muted-foreground text-sm flex items-center justify-center gap-1.5">
                    <UserCircleGearIcon className="h-4 w-4" />
                    You&apos;ve been invited as a <span className="text-foreground font-semibold uppercase text-xs">{role.replace('_', ' ')}</span>
                </p>
            </div>

            <div className="w-12 h-0.5 bg-muted-foreground/20 rounded-full" />
        </div>
    );
}
