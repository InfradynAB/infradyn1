"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DeliveryCategoriesShell } from "@/components/dashboard/analytics/delivery-categories/delivery-categories-shell";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Project {
    id: string;
    name: string;
}

export default function DeliveryCategoriesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get("projectId");

    const [projects, setProjects] = useState<Project[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);

    useEffect(() => {
        fetch("/api/projects/list")
            .then((r) => r.json())
            .then((json) => {
                if (json.success) setProjects(json.data.projects ?? []);
            })
            .finally(() => setLoadingProjects(false));
    }, []);

    function handleProjectChange(id: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("projectId", id);
        router.replace(`?${params.toString()}`);
    }

    return (
        <div className="container mx-auto py-6 px-4 max-w-7xl space-y-6">
            {/* Header + project picker */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Delivery Categories
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Discipline &amp; material class breakdown · ROS-based status
                    </p>
                </div>

                <Select
                    value={projectId ?? ""}
                    onValueChange={handleProjectChange}
                    disabled={loadingProjects}
                >
                    <SelectTrigger className="w-[220px]">
                        <SelectValue
                            placeholder={loadingProjects ? "Loading…" : "Select a project"}
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Shell reads projectId from URL automatically */}
            <DeliveryCategoriesShell />
        </div>
    );
}
