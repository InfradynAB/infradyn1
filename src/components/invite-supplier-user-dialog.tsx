"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { inviteSupplierUser } from "@/lib/actions/supplier-invitation";
import { UserPlusIcon, SpinnerGap } from "@phosphor-icons/react";

interface InviteSupplierUserDialogProps {
    supplierId: string;
    supplierName: string;
    trigger?: React.ReactNode;
}

export function InviteSupplierUserDialog({ supplierId, supplierName, trigger }: InviteSupplierUserDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        formData.append("supplierId", supplierId);

        const result = await inviteSupplierUser(formData);
        setIsLoading(false);

        if (result.success) {
            toast.success(`Invitation sent to ${formData.get("email")} for ${supplierName}`);
            setOpen(false);
        } else {
            toast.error(result.error || "Failed to send invitation");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="gap-2">
                        <UserPlusIcon className="h-4 w-4" />
                        Invite User
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite Supplier User</DialogTitle>
                    <DialogDescription>
                        Send an invitation to a representative of <strong>{supplierName}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" name="email" type="email" required placeholder="representative@supplier.com" />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : "Send Invite"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
