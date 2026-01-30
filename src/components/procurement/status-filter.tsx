"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type POStatus = "all" | "draft" | "active" | "completed" | "cancelled";

interface StatusFilterProps {
    activeStatus: POStatus;
    onStatusChange: (status: POStatus) => void;
    counts?: {
        all: number;
        draft: number;
        active: number;
        completed: number;
        cancelled: number;
    };
}

const statusConfig = {
    all: { label: "All", color: "bg-gray-100 text-gray-700" },
    draft: { label: "Draft", color: "bg-yellow-100 text-yellow-700" },
    active: { label: "Active", color: "bg-green-100 text-green-700" },
    completed: { label: "Completed", color: "bg-blue-100 text-blue-700" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

export function StatusFilter({ activeStatus, onStatusChange, counts }: StatusFilterProps) {
    return (
        <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg border">
            <span className="text-sm font-medium text-muted-foreground flex items-center">
                Filter:
            </span>
            {(Object.keys(statusConfig) as POStatus[]).map((status) => {
                const config = statusConfig[status];
                const count = counts?.[status];
                const isActive = activeStatus === status;

                return (
                    <Button
                        key={status}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => onStatusChange(status)}
                        className={cn(
                            "gap-2",
                            !isActive && "hover:bg-accent"
                        )}
                    >
                        <span className="capitalize">{config.label}</span>
                        {count !== undefined && count > 0 && (
                            <Badge
                                variant="secondary"
                                className={cn(
                                    "rounded-full px-2 py-0",
                                    isActive ? "bg-white/20 text-white" : config.color
                                )}
                            >
                                {count}
                            </Badge>
                        )}
                    </Button>
                );
            })}
        </div>
    );
}
