"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupplier } from "@/lib/actions/supplier";
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
import { PlusIcon, SpinnerGap } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";

interface AddSupplierDialogProps {
    trigger?: React.ReactNode;
}

export function AddSupplierDialog({ trigger }: AddSupplierDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [taxId, setTaxId] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const result = await createSupplier({
                name: name.trim(),
                contactEmail: email.trim() || undefined,
                taxId: taxId.trim() || undefined,
            });

            if (result.success) {
                if (result.warning) {
                    toast.warning(result.warning);
                } else if (result.invited) {
                    toast.success("Supplier created & invitation sent!");
                } else {
                    toast.success("Supplier created successfully");
                }
                setOpen(false);
                setName("");
                setEmail("");
                setTaxId("");
                router.refresh();
            } else {
                setError(result.error || "An error occurred");
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Add Supplier
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add & Invite Supplier</DialogTitle>
                        <DialogDescription>
                            Create this supplier in your registry. If you provide an email, an invitation will be sent automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Supplier Name *</Label>
                            <Input
                                id="name"
                                placeholder="Supplier Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Representative Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="e.g. contact@name.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                Required to trigger auto-invitation
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="taxId">Tax ID (Optional)</Label>
                            <Input
                                id="taxId"
                                placeholder="e.g. KRA1234567A"
                                value={taxId}
                                onChange={(e) => setTaxId(e.target.value)}
                            />
                        </div>
                        {error && (
                            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded text-sm font-medium">
                                {error}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !name.trim()}>
                            {isSubmitting ? (
                                <>
                                    <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create & Invite"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
