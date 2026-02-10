"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CaretUpDown, FolderSimple, SquaresFour } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { switchSupplierProject } from "@/lib/actions/supplier-project";
import { toast } from "sonner";

interface SupplierProject {
    id: string;
    name: string;
    code: string | null;
}

interface SupplierProjectSwitcherProps {
    projects: SupplierProject[];
    activeProjectId: string | null;
}

export function SupplierProjectSwitcher({ projects, activeProjectId }: SupplierProjectSwitcherProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const activeProject = projects.find(p => p.id === activeProjectId) || null;
    const isAllProjects = !activeProjectId;

    const handleSwitch = (projectId: string | null) => {
        if (projectId === activeProjectId) {
            setOpen(false);
            return;
        }

        startTransition(async () => {
            const result = await switchSupplierProject(projectId);
            if (result.success) {
                toast.success(projectId ? `Switched to ${projects.find(p => p.id === projectId)?.name}` : "Showing all projects");
                setOpen(false);
                router.refresh();
            } else {
                toast.error("Failed to switch project");
            }
        });
    };

    if (projects.length === 0) {
        return null;
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Select project"
                    className="w-full justify-between"
                    disabled={isPending}
                >
                    <div className="flex items-center gap-2 truncate">
                        {isAllProjects ? (
                            <SquaresFour className="h-4 w-4 shrink-0 text-primary" weight="duotone" />
                        ) : (
                            <FolderSimple className="h-4 w-4 shrink-0 text-primary" weight="duotone" />
                        )}
                        <span className="truncate text-sm">
                            {isAllProjects ? "All Projects" : activeProject?.name || "Select project"}
                        </span>
                    </div>
                    <CaretUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                    <CommandList>
                        <CommandEmpty>No projects found.</CommandEmpty>
                        <CommandGroup heading="Projects">
                            {/* All Projects option */}
                            <CommandItem
                                onSelect={() => handleSwitch(null)}
                                className="cursor-pointer"
                            >
                                <SquaresFour className="mr-2 h-4 w-4 text-primary" weight="duotone" />
                                <div className="flex flex-col">
                                    <span>All Projects</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        View combined data
                                    </span>
                                </div>
                                <Check
                                    className={cn(
                                        "ml-auto h-4 w-4",
                                        isAllProjects ? "opacity-100" : "opacity-0"
                                    )}
                                />
                            </CommandItem>

                            {/* Individual projects */}
                            {projects.map((proj) => (
                                <CommandItem
                                    key={proj.id}
                                    onSelect={() => handleSwitch(proj.id)}
                                    className="cursor-pointer"
                                >
                                    <FolderSimple className="mr-2 h-4 w-4 text-muted-foreground" weight="duotone" />
                                    <div className="flex flex-col">
                                        <span className="truncate">{proj.name}</span>
                                        {proj.code && (
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                                {proj.code}
                                            </span>
                                        )}
                                    </div>
                                    <Check
                                        className={cn(
                                            "ml-auto h-4 w-4",
                                            activeProjectId === proj.id ? "opacity-100" : "opacity-0"
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
