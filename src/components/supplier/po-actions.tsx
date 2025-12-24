"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updatePOStatus } from "@/lib/actions/procurement";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, XCircleIcon, CircleNotchIcon } from "@phosphor-icons/react";

interface SupplierPOActionsProps {
    poId: string;
    currentStatus: string;
}

export function SupplierPOActions({ poId, currentStatus }: SupplierPOActionsProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    async function handleStatusChange(newStatus: string) {
        setIsLoading(true);
        // Note: updatePOStatus might need refactoring if it restricts suppliers strictly.
        // Assuming suppliers are members of the org (as implemented), they might pass generic permission checks depending on logic.
        // If not, we will need to create `acknowledgePurchaseOrder` in supplier actions.

        try {
            const result = await updatePOStatus(poId, newStatus as any);
            if (result.success) {
                toast.success(`Order ${newStatus.toLowerCase()} successfully.`);
                router.refresh();
            } else {
                toast.error(result.error || "Failed to update status.");
            }
        } catch (error) {
            toast.error("An error occurred.");
        }
        setIsLoading(false);
    }

    if (currentStatus !== "PENDING_RESPONSE" && currentStatus !== "ISSUED") {
        return null; // Already acted upon 
    }

    return (
        <div className="flex gap-2">
            <Button
                variant="destructive"
                onClick={() => handleStatusChange("REJECTED")} // Or REQUEST_CHANGES
                disabled={isLoading}
            >
                {isLoading ? <CircleNotchIcon className="animate-spin" /> : "Request Changes"}
                {/* Simplified flow for now */}
            </Button>
            <Button
                onClick={() => handleStatusChange("ACCEPTED")}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
            >
                {isLoading ? <CircleNotchIcon className="animate-spin" /> : <><CheckCircleIcon className="mr-2" /> Accept Order</>}
            </Button>
        </div>
    );
}
