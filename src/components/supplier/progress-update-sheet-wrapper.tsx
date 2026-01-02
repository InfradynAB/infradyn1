"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UploadSimple } from "@phosphor-icons/react";
import { ProgressUpdateSheet } from "./progress-update-sheet";

interface PurchaseOrderOption {
    id: string;
    poNumber: string;
    organizationId: string;
    projectId: string;
    milestones: {
        id: string;
        title: string;
        paymentPercentage: string;
    }[];
}

interface ProgressUpdateSheetWrapperProps {
    purchaseOrders: PurchaseOrderOption[];
}

/**
 * Wrapper component for ProgressUpdateSheet that handles PO selection
 * when supplier has multiple POs.
 */
export function ProgressUpdateSheetWrapper({ purchaseOrders }: ProgressUpdateSheetWrapperProps) {
    const [selectedPOId, setSelectedPOId] = useState<string>(
        purchaseOrders.length === 1 ? purchaseOrders[0].id : ""
    );

    const selectedPO = purchaseOrders.find((po) => po.id === selectedPOId);

    // If only one PO, show the sheet directly
    if (purchaseOrders.length === 1 && selectedPO) {
        return (
            <ProgressUpdateSheet
                purchaseOrderId={selectedPO.id}
                poNumber={selectedPO.poNumber}
                organizationId={selectedPO.organizationId}
                projectId={selectedPO.projectId}
                milestones={selectedPO.milestones}
                trigger={
                    <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-5 h-auto rounded-xl gap-2">
                        <UploadSimple className="h-4 w-4" />
                        Update Progress
                    </Button>
                }
            />
        );
    }

    // If multiple POs, show a select first
    if (!selectedPOId) {
        return (
            <div className="flex items-center gap-2">
                <Select onValueChange={setSelectedPOId}>
                    <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Select PO..." />
                    </SelectTrigger>
                    <SelectContent>
                        {purchaseOrders.map((po) => (
                            <SelectItem key={po.id} value={po.id}>
                                {po.poNumber}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    }

    // After selection, show the update sheet
    if (selectedPO) {
        return (
            <div className="flex items-center gap-2">
                <Select value={selectedPOId} onValueChange={setSelectedPOId}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {purchaseOrders.map((po) => (
                            <SelectItem key={po.id} value={po.id}>
                                {po.poNumber}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <ProgressUpdateSheet
                    purchaseOrderId={selectedPO.id}
                    poNumber={selectedPO.poNumber}
                    organizationId={selectedPO.organizationId}
                    projectId={selectedPO.projectId}
                    milestones={selectedPO.milestones}
                    trigger={
                        <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-5 h-auto rounded-xl gap-2">
                            <UploadSimple className="h-4 w-4" />
                            Update Progress
                        </Button>
                    }
                />
            </div>
        );
    }

    return null;
}
