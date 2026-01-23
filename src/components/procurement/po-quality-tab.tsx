"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NCRList, CreateNCRDialog } from "@/components/ncr";

interface POQualityTabProps {
    purchaseOrderId: string;
    organizationId: string;
    projectId: string;
    supplierId: string;
}

export function POQualityTab({
    purchaseOrderId,
    organizationId,
    projectId,
    supplierId,
}: POQualityTabProps) {
    const router = useRouter();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleNCRCreated = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleViewNCR = (ncrId: string) => {
        router.push(`/dashboard/procurement/ncr/${ncrId}`);
    };

    return (
        <div className="space-y-4">
            <NCRList
                key={refreshKey}
                organizationId={organizationId}
                purchaseOrderId={purchaseOrderId}
                onCreateNCR={() => setShowCreateDialog(true)}
                onViewNCR={handleViewNCR}
            />

            <CreateNCRDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                organizationId={organizationId}
                projectId={projectId}
                purchaseOrderId={purchaseOrderId}
                supplierId={supplierId}
                onSuccess={handleNCRCreated}
            />
        </div>
    );
}
