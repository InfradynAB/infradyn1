"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { createSupplier } from "@/lib/actions/supplier";
import { toast } from "sonner";
import { CircleNotchIcon, PlusIcon } from "@phosphor-icons/react";

interface CreateSupplierDialogProps {
    onSuccess?: (supplier: any) => void;
    trigger?: React.ReactNode;
}

export function CreateSupplierDialog({ onSuccess, trigger }: CreateSupplierDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        const name = formData.get("name") as string;
        const contactEmail = formData.get("contactEmail") as string;
        const taxId = formData.get("taxId") as string;

        const result = await createSupplier({
            name,
            contactEmail,
            taxId,
        });

        if (result.success && result.supplier) {
            toast.success("Supplier created successfully!");
            onSuccess?.(result.supplier);
            setOpen(false);
        } else {
            toast.error(result.error || "Failed to create supplier");
        }

        setIsLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Add Supplier
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Supplier</DialogTitle>
                    <DialogDescription>
                        Create a new supplier for your organization.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Supplier Name *</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Acme Corp"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="contactEmail">Contact Email</Label>
                            <Input
                                id="contactEmail"
                                name="contactEmail"
                                type="email"
                                placeholder="contact@acme.com"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="taxId">Tax ID / Registration No.</Label>
                            <Input
                                id="taxId"
                                name="taxId"
                                placeholder="VAT-123456"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
                            Create Supplier
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
