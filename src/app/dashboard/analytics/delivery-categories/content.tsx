"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
    const pathname = usePathname();
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

    // Default to the first project to avoid an empty/invalid state and reduce UI errors.
    useEffect(() => {
        if (loadingProjects) return;
        if (projectId) return;
        const firstProjectId = projects[0]?.id;
        if (!firstProjectId) return;

        const params = new URLSearchParams(searchParams.toString());
        params.set("projectId", firstProjectId);
        router.replace(`${pathname}?${params.toString()}`);
    }, [loadingProjects, projectId, projects, pathname, router, searchParams]);

    function handleProjectChange(id: string) {
        if (!id) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("projectId", id);
        router.replace(`${pathname}?${params.toString()}`);
    }

    return (
        <div className="w-full py-6 space-y-6">
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
                    disabled={loadingProjects || projects.length === 0}
                >
                    <SelectTrigger className="w-[220px]">
                        <SelectValue
                            placeholder={
                                loadingProjects
                                    ? "Loading…"
                                    : projects.length === 0
                                        ? "No projects"
                                        : "Select a project"
                            }
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
