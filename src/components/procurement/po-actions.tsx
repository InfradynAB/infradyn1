"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    PencilSimpleIcon,
    TrashIcon,
    DotsThreeVerticalIcon,
    WarningCircleIcon,
    ChartLineUpIcon,
} from "@phosphor-icons/react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface POActionsProps {
    poId: string;
    poNumber: string;
}

export function POActions({ poId, poNumber }: POActionsProps) {
    const router = useRouter();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        const deleteToast = toast.loading(`Deleting PO ${poNumber}...`);
        try {
            const result = await deletePurchaseOrder(poId);
            if (result.success) {
                toast.success(`PO ${poNumber} deleted`, { id: deleteToast });
                router.refresh();
            } else {
                toast.error(result.error || "Failed to delete PO", { id: deleteToast });
            }
        } catch (error) {
            toast.error("Failed to delete PO", { id: deleteToast });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <DotsThreeVerticalIcon className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={`/dashboard/procurement/${poId}/analytics`} className="flex items-center">
                            <ChartLineUpIcon className="mr-2 h-4 w-4" />
                            Analytics
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href={`/dashboard/procurement/${poId}/edit`} className="flex items-center">
                            <PencilSimpleIcon className="mr-2 h-4 w-4" />
                            Edit PO
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setIsDeleteDialogOpen(true)}
                    >
                        <TrashIcon className="mr-2 h-4 w-4" />
                        Delete PO
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
