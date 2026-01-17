"use server";

/**
 * External Sync Server Actions
 * Manage Smartsheet/Excel sync configurations
 */

import db from "@/db/drizzle";
import { externalSync, syncLog, member } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// Helper to get session and organizationId
async function getAuthContext() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
        return { session: null, organizationId: null };
    }

    // Fetch organizationId from member table
    const membership = await db.query.member.findFirst({
        where: eq(member.userId, session.user.id),
    });

    return { session, organizationId: membership?.organizationId || null };
}

interface CreateSyncConfig {
    provider: "SMARTSHEET" | "EXCEL_SCHEDULED" | "GOOGLE_SHEETS";
    name: string;
    apiKey: string;
    sheetId: string;
    targetProjectId?: string;
    syncFrequency: "MANUAL" | "HOURLY" | "DAILY";
    columnMappings?: Record<string, string>;
}

export async function createExternalSync(config: CreateSyncConfig) {
    const { organizationId } = await getAuthContext();
    if (!organizationId) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const [sync] = await db.insert(externalSync).values({
            organizationId,
            provider: config.provider,
            name: config.name,
            config: {
                apiKey: config.apiKey,
                sheetId: config.sheetId,
                columnMappings: config.columnMappings,
            },
            targetProjectId: config.targetProjectId,
            syncFrequency: config.syncFrequency,
            isActive: true,
        }).returning();

        revalidatePath("/dashboard/settings");
        return { success: true, data: { id: sync.id } };
    } catch (error) {
        console.error("[CREATE SYNC] Error:", error);
        return { success: false, error: "Failed to create sync configuration" };
    }
}

export async function updateExternalSync(
    syncId: string,
    updates: Partial<CreateSyncConfig> & { isActive?: boolean }
) {
    const { organizationId } = await getAuthContext();
    if (!organizationId) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // Verify ownership
        const existing = await db.query.externalSync.findFirst({
            where: and(
                eq(externalSync.id, syncId),
                eq(externalSync.organizationId, organizationId)
            ),
        });

        if (!existing) {
            return { success: false, error: "Sync configuration not found" };
        }

        const updateData: any = { updatedAt: new Date() };

        if (updates.name) updateData.name = updates.name;
        if (updates.syncFrequency) updateData.syncFrequency = updates.syncFrequency;
        if (updates.targetProjectId) updateData.targetProjectId = updates.targetProjectId;
        if (typeof updates.isActive === "boolean") updateData.isActive = updates.isActive;

        if (updates.apiKey || updates.sheetId || updates.columnMappings) {
            updateData.config = {
                ...(existing.config as object),
                ...(updates.apiKey && { apiKey: updates.apiKey }),
                ...(updates.sheetId && { sheetId: updates.sheetId }),
                ...(updates.columnMappings && { columnMappings: updates.columnMappings }),
            };
        }

        await db.update(externalSync)
            .set(updateData)
            .where(eq(externalSync.id, syncId));

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        console.error("[UPDATE SYNC] Error:", error);
        return { success: false, error: "Failed to update sync configuration" };
    }
}

export async function deleteExternalSync(syncId: string) {
    const { organizationId } = await getAuthContext();
    if (!organizationId) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // Verify ownership
        const existing = await db.query.externalSync.findFirst({
            where: and(
                eq(externalSync.id, syncId),
                eq(externalSync.organizationId, organizationId)
            ),
        });

        if (!existing) {
            return { success: false, error: "Sync configuration not found" };
        }

        // Soft delete
        await db.update(externalSync)
            .set({ isDeleted: true, isActive: false, updatedAt: new Date() })
            .where(eq(externalSync.id, syncId));

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        console.error("[DELETE SYNC] Error:", error);
        return { success: false, error: "Failed to delete sync configuration" };
    }
}

export async function listExternalSyncs() {
    const { organizationId } = await getAuthContext();
    if (!organizationId) {
        return { success: false, error: "Unauthorized", data: [] };
    }

    try {
        const syncs = await db.query.externalSync.findMany({
            where: and(
                eq(externalSync.organizationId, organizationId),
                eq(externalSync.isDeleted, false)
            ),
            with: {
                targetProject: true,
            },
            orderBy: [desc(externalSync.createdAt)],
        });

        return {
            success: true,
            data: syncs.map(s => ({
                id: s.id,
                provider: s.provider,
                name: s.name,
                sheetId: (s.config as any)?.sheetId,
                syncFrequency: s.syncFrequency,
                isActive: s.isActive,
                lastSyncAt: s.lastSyncAt?.toISOString(),
                lastSyncStatus: s.lastSyncStatus,
                lastSyncError: s.lastSyncError,
                itemsSynced: s.itemsSynced,
                targetProject: s.targetProject ? {
                    id: s.targetProject.id,
                    name: s.targetProject.name,
                } : null,
            })),
        };
    } catch (error) {
        console.error("[LIST SYNCS] Error:", error);
        return { success: false, error: "Failed to list syncs", data: [] };
    }
}

export async function getSyncLogs(syncId: string, limit: number = 20) {
    const { organizationId } = await getAuthContext();
    if (!organizationId) {
        return { success: false, error: "Unauthorized", data: [] };
    }

    try {
        // Verify ownership
        const existing = await db.query.externalSync.findFirst({
            where: and(
                eq(externalSync.id, syncId),
                eq(externalSync.organizationId, organizationId)
            ),
        });

        if (!existing) {
            return { success: false, error: "Sync configuration not found", data: [] };
        }

        const logs = await db.query.syncLog.findMany({
            where: eq(syncLog.externalSyncId, syncId),
            orderBy: [desc(syncLog.syncedAt)],
            limit,
        });

        return {
            success: true,
            data: logs.map(l => ({
                id: l.id,
                syncedAt: l.syncedAt?.toISOString(),
                status: l.status,
                itemsProcessed: l.itemsProcessed,
                itemsCreated: l.itemsCreated,
                itemsUpdated: l.itemsUpdated,
                itemsFailed: l.itemsFailed,
                durationMs: l.durationMs,
                errors: l.errorDetails as string[] | null,
            })),
        };
    } catch (error) {
        console.error("[GET SYNC LOGS] Error:", error);
        return { success: false, error: "Failed to get sync logs", data: [] };
    }
}

