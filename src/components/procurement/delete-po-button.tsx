"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    TrashIcon,
    WarningCircleIcon,
} from "@phosphor-icons/react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deletePurchaseOrder } from "@/lib/actions/procurement";
import { toast } from "sonner";

interface DeletePOButtonProps {
    poId: string;
    poNumber: string;
}

export function DeletePOButton({ poId, poNumber }: DeletePOButtonProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        const deleteToast = toast.loading(`Deleting PO ${poNumber}...`);
        try {
            const result = await deletePurchaseOrder(poId);
            if (result.success) {
                toast.success(`PO ${poNumber} deleted`, { id: deleteToast });
                router.push("/dashboard/procurement");
                router.refresh();
            } else {
                toast.error(result.error || "Failed to delete PO", { id: deleteToast });
            }
        } catch (error) {
            toast.error("Failed to delete PO", { id: deleteToast });
        } finally {
            setIsDeleting(false);
            setIsOpen(false);
        }
    };

    return (
        <>
            <Button
                variant="ghost"
                onClick={() => setIsOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete PO
            </Button>

            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <WarningCircleIcon className="h-5 w-5 text-destructive" />
                            Delete Purchase Order?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete PO <strong>{poNumber}</strong>? This action cannot be undone, and the PO will immediately disappear from all dashboards.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete PO"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
