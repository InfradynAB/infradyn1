"use server";

import { setSupplierActiveProjectId } from "@/lib/utils/supplier-project-context";

export async function switchSupplierProject(projectId: string | null) {
    const success = await setSupplierActiveProjectId(projectId);
    return { success };
}
