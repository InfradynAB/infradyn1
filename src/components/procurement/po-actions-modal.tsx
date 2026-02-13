"use client";

import Link from "next/link";
import {
    GearSix,
    PencilSimple,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { UploadVersionDialog } from "@/components/procurement/upload-version-dialog";
import { DeletePOButton } from "@/components/procurement/delete-po-button";

interface POActionsModalProps {
    poId: string;
    poNumber: string;
    organizationId: string;
    projectId: string;
    nextVersionNumber: number;
}

export function POActionsModal({
    poId,
    poNumber,
    organizationId,
    projectId,
    nextVersionNumber,
}: POActionsModalProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" aria-label="PO actions">
                    <GearSix className="h-4 w-4" weight="duotone" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>PO Actions</DialogTitle>
                    <DialogDescription>
                        Manage {poNumber} from one place.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <DialogClose asChild>
                        <Button asChild variant="outline" className="w-full justify-start">
                            <Link href={`/dashboard/procurement/${poId}/edit`}>
                                <PencilSimple className="mr-2 h-4 w-4" weight="duotone" />
                                Edit PO
                            </Link>
                        </Button>
                    </DialogClose>

                    <div className="w-full [&>button]:w-full [&>button]:justify-start [&>button]:border [&>button]:border-input [&>button]:bg-background [&>button]:hover:bg-accent [&>button]:hover:text-accent-foreground">
                        <UploadVersionDialog
                            purchaseOrderId={poId}
                            organizationId={organizationId}
                            projectId={projectId}
                            nextVersionNumber={nextVersionNumber}
                        />
                    </div>

                    <div className="w-full [&>button]:w-full [&>button]:justify-start [&>button]:text-red-600 [&>button]:hover:text-red-700">
                        <DeletePOButton poId={poId} poNumber={poNumber} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
