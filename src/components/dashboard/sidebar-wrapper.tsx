"use client";

import { CommandSidebar } from "./command-sidebar";
import { switchProject } from "@/lib/actions/project-switch";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SidebarWrapperProps {
    user?: { role: string; name?: string } | null;
    organizations?: Array<{
        id: string;
        name: string;
        slug: string;
        logo: string | null;
        role: string;
    }>;
    activeOrgId?: string | null;
    projects?: Array<{
        id: string;
        name: string;
        code: string;
        health: "healthy" | "at-risk" | "critical";
        progress: number;
    }>;
    activeProjectId?: string | null;
    alertCount?: number;
    supplierProjects?: Array<{
        id: string;
        name: string;
        code: string | null;
    }>;
    activeSupplierProjectId?: string | null;
}

export function SidebarWrapper({
    user,
    projects = [],
    activeProjectId,
    alertCount = 0,
    supplierProjects = [],
    activeSupplierProjectId,
}: SidebarWrapperProps) {
    const router = useRouter();

    async function handleProjectChange(projectId: string) {
        // Empty string means "All Projects"
        const result = await switchProject(projectId || null);
        if (result.success) {
            router.refresh();
            toast.success(projectId ? "Project switched" : "Viewing all projects");
        } else {
            toast.error("Failed to switch project");
        }
    }

    return (
        <CommandSidebar
            user={user}
            projects={projects}
            activeProjectId={activeProjectId}
            alertCount={alertCount}
            onProjectChange={handleProjectChange}
            supplierProjects={supplierProjects}
            activeSupplierProjectId={activeSupplierProjectId}
        />
    );
}
