"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UsersThreeIcon, CircleNotchIcon } from "@phosphor-icons/react";
import { bulkInviteSuppliers } from "@/lib/actions/supplier";

interface BulkInviteButtonProps {
    pendingCount: number;
}

export function BulkInviteButton({ pendingCount }: BulkInviteButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    if (pendingCount === 0) {
        return null; // Don't show if no pending suppliers
    }

    const handleBulkInvite = async () => {
        setIsLoading(true);
        try {
            const result = await bulkInviteSuppliers();

            if (result.success) {
                toast.success(`Invited ${result.invited} supplier${result.invited !== 1 ? 's' : ''}!`);
                if (result.failed && result.failed > 0) {
                    toast.warning(`${result.failed} invitation${result.failed !== 1 ? 's' : ''} failed.`);
                }
            } else {
                toast.error(result.error || "Failed to send invitations");
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="default"
            className="gap-2"
            onClick={handleBulkInvite}
            disabled={isLoading}
        >
            {isLoading ? (
                <CircleNotchIcon className="h-4 w-4 animate-spin" />
            ) : (
                <UsersThreeIcon className="h-4 w-4" />
            )}
            Invite All ({pendingCount})
        </Button>
    );
}
