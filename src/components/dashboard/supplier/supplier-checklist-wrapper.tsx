"use client";

import { FirstTimeChecklist } from "@/components/dashboard/shared/first-time-checklist";

interface SupplierChecklistWrapperProps {
    readinessScore: number;
    poCount: number;
    openNcrs: number;
    ncrRespondedCount?: number;
}

export function SupplierChecklistWrapper({
    readinessScore,
    poCount,
    openNcrs,
    ncrRespondedCount = 0,
}: SupplierChecklistWrapperProps) {
    return (
        <FirstTimeChecklist
            role="SUPPLIER"
            supplierData={{
                readinessScore,
                poCount,
                ncrRespondedCount,
                openNcrs,
            }}
            storageKey="infradyn-supplier-checklist-dismissed"
            className="mb-6"
        />
    );
}
