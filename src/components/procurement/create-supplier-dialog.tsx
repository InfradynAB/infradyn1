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
            if (result.warning) {
                toast.warning(result.warning);
            } else if (result.invited) {
                toast.success("Supplier created & invitation sent!");
            } else {
                toast.success("Supplier created successfully!");
            }
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
            <DialogContent className="sm:max-w-md border-none shadow-2xl bg-card/70 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500" />

                <DialogHeader className="pt-4">
                    <DialogTitle className="text-2xl font-black tracking-tight">Add & Invite Supplier</DialogTitle>
                    <DialogDescription className="text-base font-medium">
                        Register this supplier in your organization. If an email is provided, an invite will be sent.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4 pb-2">
                    <div className="grid gap-5 px-1">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Supplier Business Name *</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Supplier Name"
                                required
                                className="h-12 rounded-xl bg-muted/30 border-muted/50 focus:ring-2 focus:ring-blue-500/20 font-bold"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="contactEmail" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Representative Email</Label>
                            <Input
                                id="contactEmail"
                                name="contactEmail"
                                type="email"
                                placeholder="contact@name.com"
                                className="h-12 rounded-xl bg-muted/30 border-muted/50 focus:ring-2 focus:ring-blue-500/20 font-bold"
                            />
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">
                                Triggers automatic portal invitation
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="taxId" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Tax ID / Reg No. (Optional)</Label>
                            <Input
                                id="taxId"
                                name="taxId"
                                placeholder="VAT-123456"
                                className="h-12 rounded-xl bg-muted/30 border-muted/50 focus:ring-2 focus:ring-blue-500/20 font-bold"
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-black text-lg shadow-lg shadow-blue-500/10 transition-all active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <>
                                    <CircleNotchIcon className="mr-2 h-5 w-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                "Create & Send Invite"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
