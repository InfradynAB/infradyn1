"use server";

import db from "@/db/drizzle";
import { conflictRecord } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// ============================================================================
// APPROVAL ACTIONS
// ============================================================================

interface PendingApproval {
    id: string;
    milestoneId: string;
    milestoneTitle: string;
    purchaseOrderId: string;
    poNumber: string;
    type: string;
    state: string;
    deviationPercent: number;
    description?: string | null;
    createdAt: Date;
    isCriticalPath: boolean;
    isFinancialMilestone: boolean;
    escalationLevel: number;
}

// Export type for external consumers (type-only export is erased at runtime)
export type { PendingApproval };

/**
 * Get conflicts requiring PM approval
 */
export async function getPendingApprovals(organizationId: string): Promise<{ success: boolean; data: PendingApproval[]; error?: string }> {
    try {
        const conflicts = await db.query.conflictRecord.findMany({
            where: eq(conflictRecord.state, "OPEN"),
            with: {
                milestone: true,
                purchaseOrder: true,
            },
            orderBy: desc(conflictRecord.createdAt),
        });

        const approvals: PendingApproval[] = conflicts.map(c => ({
            id: c.id,
            milestoneId: c.milestoneId || "",
            milestoneTitle: c.milestone?.title || "Unknown",
            purchaseOrderId: c.purchaseOrderId,
            poNumber: c.purchaseOrder?.poNumber || "Unknown",
            type: c.type,
            state: c.state,
            deviationPercent: c.deviationPercent ? Number(c.deviationPercent) : 0,
            description: c.description,
            createdAt: new Date(c.createdAt),
            isCriticalPath: c.isCriticalPath || false,
            isFinancialMilestone: c.isFinancialMilestone || false,
            escalationLevel: c.escalationLevel || 0,
        }));

        return { success: true, data: approvals };
    } catch (error: any) {
        console.error("[GET_PENDING_APPROVALS]", error);
        return { success: false, error: error.message, data: [] };
    }
}

interface ResolveConflictInput {
    conflictId: string;
    resolution: "ACCEPTED" | "REJECTED" | "ESCALATED";
    comment?: string;
}

/**
 * Resolve a conflict
 */
export async function resolveConflict(input: ResolveConflictInput) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" };
        }

        const newState = input.resolution === "ESCALATED" ? "ESCALATED" : "RESOLVED";

        await db.update(conflictRecord)
            .set({
                state: newState,
                assignedTo: session.user.id,
                description: input.comment
                    ? `${input.resolution}: ${input.comment}`
                    : input.resolution,
                escalationLevel: input.resolution === "ESCALATED" ? 2 : 0,
            })
            .where(eq(conflictRecord.id, input.conflictId));

        revalidatePath("/dashboard/procurement");

        return { success: true };
    } catch (error: any) {
        console.error("[RESOLVE_CONFLICT]", error);
        return { success: false, error: error.message };
    }
}

/**
 * Escalate a conflict to higher authority
 */
export async function escalateConflict(conflictId: string, reason: string) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" };
        }

        const conflict = await db.query.conflictRecord.findFirst({
            where: eq(conflictRecord.id, conflictId),
        });

        if (!conflict) {
            return { success: false, error: "Conflict not found" };
        }

        const newLevel = (conflict.escalationLevel || 0) + 1;

        await db.update(conflictRecord)
            .set({
                state: "ESCALATED",
                escalationLevel: newLevel,
                description: `Escalated L${newLevel}: ${reason}`,
                lastReminderAt: new Date(),
            })
            .where(eq(conflictRecord.id, conflictId));

        revalidatePath("/dashboard/procurement");

        return { success: true, data: { newLevel } };
    } catch (error: any) {
        console.error("[ESCALATE_CONFLICT]", error);
        return { success: false, error: error.message };
    }
}
