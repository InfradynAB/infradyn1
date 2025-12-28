"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CircleNotch, UserPlus, Buildings } from "@phosphor-icons/react";
import { invitePMToOrganization, listOrganizations } from "@/lib/actions/admin-actions";

const inviteSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    organizationId: z.string().min(1, "Please select an organization"),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface Organization {
    id: string;
    name: string;
}

interface InvitePMDialogProps {
    onSuccess?: () => void;
}

export function InvitePMDialog({ onSuccess }: InvitePMDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);

    const form = useForm<InviteFormData>({
        resolver: zodResolver(inviteSchema),
        defaultValues: {
            email: "",
            organizationId: "",
        },
    });

    // Fetch organizations when dialog opens
    useEffect(() => {
        if (open) {
            setLoadingOrgs(true);
            listOrganizations().then((result) => {
                if (result.success && result.data) {
                    setOrganizations(result.data);
                }
                setLoadingOrgs(false);
            });
        }
    }, [open]);

    async function onSubmit(values: InviteFormData) {
        setIsLoading(true);
        try {
            const org = organizations.find(o => o.id === values.organizationId);
            const result = await invitePMToOrganization({
                email: values.email,
                organizationId: values.organizationId,
                organizationName: org?.name || "Organization",
            });

            if (result.success) {
                toast.success("Invitation sent successfully!");
                form.reset();
                setOpen(false);
                onSuccess?.();
            } else {
                toast.error(result.error || "Failed to send invitation");
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <UserPlus className="h-4 w-4" weight="bold" />
                    Invite PM
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-green-500/10">
                            <UserPlus className="h-6 w-6 text-green-600" weight="duotone" />
                        </div>
                        <div>
                            <DialogTitle>Invite Project Manager</DialogTitle>
                            <DialogDescription>
                                Send an invitation to join an organization.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        {/* Organization */}
                        <FormField
                            control={form.control}
                            name="organizationId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Organization *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={loadingOrgs ? "Loading..." : "Select organization"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {organizations.map((org) => (
                                                <SelectItem key={org.id} value={org.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Buildings className="h-4 w-4 text-muted-foreground" />
                                                        {org.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Email */}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Address *</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="pm@company.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                                Send Invitation
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
