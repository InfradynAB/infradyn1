"use client";

import { useMemo, useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { POCommandCenter, type SectionTab } from "@/components/procurement/po-command-center";

interface POCommandCenterSheetProps {
    children: React.ReactNode;
    defaultTab?: string;
    openOnLoad?: boolean;
    commandCenterProps: Omit<React.ComponentProps<typeof POCommandCenter>, "onOpenSection">;
}

const SECTION_LABELS: Record<SectionTab, string> = {
    overview: "Overview",
    financials: "Invoices",
    progress: "Deliveries",
    boq: "BOQ / Scope",
    "change-orders": "Change Orders",
    gallery: "Documents",
    quality: "Quality",
    history: "History",
    conflicts: "Conflicts",
};

function sanitizeTab(tab?: string): SectionTab {
    if (!tab) return "overview";
    if (tab in SECTION_LABELS) return tab as SectionTab;
    return "overview";
}

const WIDTH_BY_TAB: Record<SectionTab, string> = {
    overview: "w-full sm:max-w-[540px]",
    financials: "w-full sm:max-w-[55vw]",
    progress: "w-full sm:max-w-[55vw]",
    boq: "w-full sm:max-w-[55vw]",
    "change-orders": "w-full sm:max-w-[55vw]",
    gallery: "w-full sm:max-w-[55vw]",
    quality: "w-full sm:max-w-[55vw]",
    history: "w-full sm:max-w-[55vw]",
    conflicts: "w-full sm:max-w-[55vw]",
};

export function POCommandCenterSheet({
    children,
    defaultTab = "overview",
    openOnLoad = false,
    commandCenterProps,
}: POCommandCenterSheetProps) {
    const [activeTab, setActiveTab] = useState<SectionTab>(sanitizeTab(defaultTab));
    const [open, setOpen] = useState(openOnLoad);

    const activeLabel = useMemo(() => SECTION_LABELS[activeTab], [activeTab]);

    const handleOpenSection = (section: SectionTab) => {
        setActiveTab(section);
        setOpen(true);
    };

    return (
        <>
            <POCommandCenter
                {...commandCenterProps}
                onOpenSection={handleOpenSection}
            />

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="right" className={`${WIDTH_BY_TAB[activeTab]} p-0 transition-all duration-300 ease-in-out`}>
                    <SheetHeader className="border-b border-border/60 px-5 py-4">
                        <SheetTitle>{activeLabel}</SheetTitle>
                        <SheetDescription>
                            Review and act on this section without leaving the command center.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="h-[calc(100vh-88px)] overflow-y-auto px-5 py-4">
                        <Tabs value={activeTab}>
                            {children}
                        </Tabs>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
