"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Buildings, CaretUpDown } from "@phosphor-icons/react";

interface Organization {
    id: string;
    name: string;
    logo?: string | null;
}

interface OrganizationSwitcherProps {
    organizations: Organization[];
    currentOrgId: string;
    onOrgChange: (orgId: string) => void;
}

export function OrganizationSwitcher({
    organizations,
    currentOrgId,
    onOrgChange,
}: OrganizationSwitcherProps) {
    if (organizations.length <= 1) {
        // Single org - just show the name, no dropdown
        const org = organizations[0];
        return (
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Buildings className="h-4 w-4" />
                <span>{org?.name || "Organization"}</span>
            </div>
        );
    }

    return (
        <Select value={currentOrgId} onValueChange={onOrgChange}>
            <SelectTrigger className="w-auto min-w-[200px] border-none bg-white/10 text-white hover:bg-white/20 focus:ring-0 focus:ring-offset-0">
                <div className="flex items-center gap-2">
                    <Buildings className="h-4 w-4" />
                    <SelectValue placeholder="Select organization" />
                </div>
            </SelectTrigger>
            <SelectContent>
                {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                        <div className="flex items-center gap-2">
                            {org.logo ? (
                                <img
                                    src={org.logo}
                                    alt={org.name}
                                    className="h-5 w-5 rounded object-cover"
                                />
                            ) : (
                                <Buildings className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span>{org.name}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
