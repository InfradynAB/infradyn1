"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CaretUpDown, Buildings, Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { switchOrganization } from "@/lib/actions/organization";
import { toast } from "sonner";
import Link from "next/link";

interface Organization {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    role: string;
}

interface OrgSwitcherProps {
    organizations: Organization[];
    activeOrgId: string | null;
}

export function OrgSwitcher({ organizations, activeOrgId }: OrgSwitcherProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const activeOrg = organizations.find(org => org.id === activeOrgId) || organizations[0];

    const handleSwitch = (orgId: string) => {
        if (orgId === activeOrgId) {
            setOpen(false);
            return;
        }

        startTransition(async () => {
            const result = await switchOrganization(orgId);
            if (result.success) {
                toast.success("Switched organization");
                setOpen(false);
                router.refresh();
            } else {
                toast.error(result.error || "Failed to switch organization");
            }
        });
    };

    if (organizations.length === 0) {
        return (
            <Link href="/dashboard/org">
                <Button variant="outline" className="w-full justify-start gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Create Organization</span>
                </Button>
            </Link>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Select organization"
                    className="w-full justify-between"
                    disabled={isPending}
                >
                    <div className="flex items-center gap-2 truncate">
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={activeOrg?.logo || undefined} alt={activeOrg?.name} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {activeOrg?.name?.slice(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{activeOrg?.name || "Select organization"}</span>
                    </div>
                    <CaretUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search organization..." />
                    <CommandList>
                        <CommandEmpty>No organization found.</CommandEmpty>
                        <CommandGroup heading="Organizations">
                            {organizations.map((org) => (
                                <CommandItem
                                    key={org.id}
                                    onSelect={() => handleSwitch(org.id)}
                                    className="cursor-pointer"
                                >
                                    <Avatar className="mr-2 h-5 w-5">
                                        <AvatarImage src={org.logo || undefined} alt={org.name} />
                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                            {org.name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="truncate">{org.name}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase">
                                            {org.role}
                                        </span>
                                    </div>
                                    <Check
                                        className={cn(
                                            "ml-auto h-4 w-4",
                                            activeOrgId === org.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                            <CommandItem asChild>
                                <Link
                                    href="/dashboard/org"
                                    className="flex items-center cursor-pointer"
                                    onClick={() => setOpen(false)}
                                >
                                    <Buildings className="mr-2 h-4 w-4" />
                                    Manage Organizations
                                </Link>
                            </CommandItem>
                            <CommandItem asChild>
                                <Link
                                    href="/dashboard/org?new=true"
                                    className="flex items-center cursor-pointer"
                                    onClick={() => setOpen(false)}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Organization
                                </Link>
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
