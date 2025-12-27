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
import { UserPlusIcon, SpinnerGap, EnvelopeSimpleIcon, BuildingsIcon } from "@phosphor-icons/react";

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
            toast.success(`Invitation sent to ${formData.get("email")}`);
            setOpen(false);
        } else {
            toast.error(result.error || "Failed to send invitation");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="h-8 gap-2 font-bold hover:bg-muted/50 transition-colors">
                        <UserPlusIcon className="h-4 w-4" weight="bold" />
                        Invite User
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-none shadow-2xl bg-card/70 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />

                <DialogHeader className="pt-4">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 mb-4">
                        <BuildingsIcon className="h-10 w-10" weight="duotone" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-center tracking-tight">Expand {supplierName} Team</DialogTitle>
                    <DialogDescription className="text-center text-base font-medium">
                        Send a secure portal access link to a new representative.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-6 pt-4 pb-2 px-2">
                    <div className="space-y-3">
                        <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                            Representative Email Address
                        </Label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-500 transition-colors">
                                <EnvelopeSimpleIcon className="h-5 w-5" weight="bold" />
                            </span>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="name@company.com"
                                className="h-14 pl-12 rounded-2xl bg-muted/30 border-muted/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-lg"
                            />
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-center flex-col gap-2 pt-2">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black text-lg shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <>
                                    <SpinnerGap className="mr-2 h-6 w-6 animate-spin" />
                                    Synchronizing...
                                </>
                            ) : (
                                "Send Access Link"
                            )}
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground uppercase font-black tracking-tighter">
                            Security token will expire in 7 days
                        </p>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
