"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Sparkle, CaretRight } from "@phosphor-icons/react";
import { CHANGELOG_ENTRIES, CURRENT_VERSION } from "@/lib/changelog";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "infradyn-whats-new-last-seen";

export function WhatsNewButton({ className }: { className?: string }) {
    const [open, setOpen] = useState(false);
    const [hasNew, setHasNew] = useState(false);

    useEffect(() => {
        try {
            const lastSeen = localStorage.getItem(STORAGE_KEY);
            setHasNew(lastSeen !== CURRENT_VERSION);
        } catch {
            setHasNew(true);
        }
    }, []);

    const handleOpen = () => {
        setOpen(true);
        try {
            localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
            setHasNew(false);
        } catch {}
    };

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className={cn("relative hover:bg-muted", className)}
                onClick={handleOpen}
                aria-label="What's new"
            >
                <Sparkle className="h-5 w-5" weight="duotone" />
                {hasNew && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
                )}
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Sparkle className="h-5 w-5 text-primary" weight="fill" />
                            What&apos;s new
                        </SheetTitle>
                        <SheetDescription>
                            Recent updates and improvements to Infradyn
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                        {CHANGELOG_ENTRIES.map((entry) => (
                            <div
                                key={entry.version}
                                className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-foreground">
                                        {entry.title}
                                    </span>
                                    <Badge variant="secondary" className="text-[10px] shrink-0">
                                        {entry.date}
                                    </Badge>
                                </div>
                                <ul className="space-y-1.5 text-sm text-muted-foreground">
                                    {entry.items.map((item, i) => (
                                        <li
                                            key={i}
                                            className="flex items-start gap-2"
                                        >
                                            <CaretRight className="h-4 w-4 shrink-0 text-primary/60 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
