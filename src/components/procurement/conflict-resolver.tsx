"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ApprovalModal } from "@/components/procurement/approval-modal";
import { resolveConflict, type PendingApproval } from "@/lib/actions/approvals";

interface ConflictResolverProps {
    conflicts: PendingApproval[];
}

/**
 * Client component to handle conflict resolution from URL params
 * When `?conflict=<id>` is in URL, auto-opens the approval modal
 */
export function ConflictResolver({ conflicts }: ConflictResolverProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [selectedConflict, setSelectedConflict] = useState<PendingApproval | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    // Check for conflict param on mount and whenever it changes
    useEffect(() => {
        const conflictId = searchParams.get("conflict");
        if (conflictId) {
            const conflict = conflicts.find(c => c.id === conflictId);
            if (conflict) {
                setSelectedConflict(conflict);
                setIsOpen(true);
            }
        }
    }, [searchParams, conflicts]);

    const handleClose = () => {
        setIsOpen(false);
        setSelectedConflict(null);
        // Remove the conflict param from URL
        const params = new URLSearchParams(searchParams.toString());
        params.delete("conflict");
        const newPath = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;
        router.replace(newPath);
    };

    const handleResolve = async (
        conflictId: string,
        resolution: "ACCEPTED" | "REJECTED" | "ESCALATED",
        comment?: string
    ) => {
        const result = await resolveConflict({ conflictId, resolution, comment });
        if (!result.success) {
            throw new Error(result.error);
        }
    };

    return (
        <ApprovalModal
            approval={selectedConflict}
            isOpen={isOpen}
            onClose={handleClose}
            onResolve={handleResolve}
        />
    );
}
