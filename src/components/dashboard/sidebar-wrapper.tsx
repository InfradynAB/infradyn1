"use client";

import { CommandSidebar } from "./command-sidebar";
import { switchProject } from "@/lib/actions/project-switch";
import { setActiveOrganizationId } from "@/lib/utils/org-context";
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
}

export function SidebarWrapper({
    user,
    organizations = [],
    activeOrgId,
    projects = [],
    activeProjectId,
    alertCount = 0,
}: SidebarWrapperProps) {
    const router = useRouter();

    async function handleOrgChange(orgId: string) {
        const success = await setActiveOrganizationId(orgId);
        if (success) {
            router.refresh();
            toast.success("Organization switched");
        } else {
            toast.error("Failed to switch organization");
        }
    }

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
            organizations={organizations}
            activeOrgId={activeOrgId}
            projects={projects}
            activeProjectId={activeProjectId}
            alertCount={alertCount}
            onOrgChange={handleOrgChange}
            onProjectChange={handleProjectChange}
        />
    );
}
