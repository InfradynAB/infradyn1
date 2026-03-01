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
import { createOrganization } from "@/lib/actions/organization";
import { toast } from "sonner";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr";

export function CreateOrgDialog() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        const result = await createOrganization(formData);

        if (result?.error) {
            toast.error(result.error);
            console.log(result.error);
            if (result.details) {
                Object.values(result.details).flat().forEach((msg) => toast.error(String(msg)));
            }
        } else if (result?.success) {
            toast.success("Organization created!");
            setOpen(false); // Close dialog on success
        }

        setIsLoading(false);
    }

    // Simple script to auto-fill slug from name
    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        const name = e.target.value;
        const slugInput = document.getElementById("org-slug") as HTMLInputElement; // ID updated to avoid conflicts
        if (slugInput && !slugInput.dataset.touched) {
            slugInput.value = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    New Organization
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Organization</DialogTitle>
                    <DialogDescription>
                        Create a new organization to manage your projects.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="org-name">Name</Label>
                            <Input
                                id="org-name"
                                name="name"
                                placeholder="Name"
                                required
                                onChange={handleNameChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="org-slug">Slug</Label>
                            <Input
                                id="org-slug"
                                name="slug"
                                placeholder="name"
                                required
                                onFocus={(e) => e.target.dataset.touched = "true"}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
                            Create Organization
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
