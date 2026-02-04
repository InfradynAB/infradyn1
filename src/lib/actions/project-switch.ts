"use server";

import { setActiveProjectId, getActiveProjectId } from "@/lib/utils/project-context";
import { revalidatePath } from "next/cache";

/**
 * Server action to switch the active project
 * Called from the sidebar when user selects a different project
 */
export async function switchProject(projectId: string | null) {
    // If empty string or null, switch to "All Projects"
    const targetId = projectId === "" ? null : projectId;

    const success = await setActiveProjectId(targetId);

    if (success) {
        // Revalidate dashboard pages to reflect new project context
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/procurement");
        revalidatePath("/dashboard/alerts");
        revalidatePath("/dashboard/analytics");
    }

    return { success };
}

/**
 * Get the current active project ID
 */
export async function getCurrentProjectId() {
    return await getActiveProjectId();
}
