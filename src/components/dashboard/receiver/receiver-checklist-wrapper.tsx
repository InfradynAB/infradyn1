"use client";

import { FirstTimeChecklist } from "@/components/dashboard/shared/first-time-checklist";

interface ReceiverChecklistWrapperProps {
    confirmedCount: number;
    pendingCount: number;
}

export function ReceiverChecklistWrapper({
    confirmedCount,
    pendingCount,
}: ReceiverChecklistWrapperProps) {
    return (
        <FirstTimeChecklist
            role="SITE_RECEIVER"
            receiverData={{
                confirmedCount,
                hasViewedPos: confirmedCount + pendingCount > 0,
            }}
            storageKey="infradyn-receiver-checklist-dismissed"
            className="mb-6"
        />
    );
}
