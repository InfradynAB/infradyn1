"use client";

import { ShieldCheckIcon, BuildingsIcon, UserCircleGearIcon } from "@phosphor-icons/react";

interface InviteHeroProps {
    organizationName: string;
    role: string;
}

export function InviteHero({ organizationName, role }: InviteHeroProps) {
    return (
        <div className="flex flex-col items-center text-center space-y-6 mb-8 mt-12 px-6">
            <div className="relative">
                <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-2xl animate-in zoom-in-50 duration-500">
                    <BuildingsIcon className="h-12 w-12" weight="duotone" />
                </div>
                <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 shadow-lg flex items-center justify-center text-blue-500 border-2 border-slate-100 dark:border-slate-800">
                    <ShieldCheckIcon className="h-6 w-6" weight="bold" />
                </div>
            </div>

            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
                    Welcome to <br />
                    <span className="text-blue-600 dark:text-blue-400">{organizationName}</span>
                </h1>
                <p className="text-muted-foreground text-lg font-medium flex items-center justify-center gap-2">
                    <UserCircleGearIcon className="h-5 w-5" />
                    You&apos;ve been invited as a <span className="text-foreground font-bold uppercase tracking-wider text-sm">{role.replace('_', ' ')}</span>
                </p>
            </div>

            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent rounded-full" />
        </div>
    );
}
