"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CaretUpDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { switchOrganization } from "@/lib/actions/organization";
import { toast } from "sonner";

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

    const activeOrg = organizations.find(org => org.id === activeOrgId) || (organizations.length > 0 ? organizations[0] : null);

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
        // No organizations - user needs to be invited by admin
        return (
            <div className="text-xs text-muted-foreground px-2 py-1">
                No organization yet. Contact your admin for an invite.
            </div>
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
                        {activeOrg && (
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={activeOrg.logo || undefined} alt={activeOrg.name} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                    {activeOrg.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        )}
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
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
