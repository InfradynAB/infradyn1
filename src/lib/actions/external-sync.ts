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
import { logAuditEvent } from "@/lib/audit/log-audit-event";

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

interface StoredSyncConfig {
    apiKey?: string;
    sheetId?: string;
    columnMappings?: Record<string, string>;
}

export async function createExternalSync(config: CreateSyncConfig) {
    const { organizationId, session } = await getAuthContext();
    if (!organizationId) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const [sync] = await db.transaction(async (tx) => {
            const [createdSync] = await tx.insert(externalSync).values({
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

            await logAuditEvent({
                executor: tx,
                action: "external_sync.created",
                entityType: "external_sync",
                entityId: createdSync.id,
                organizationId,
                actor: session?.user
                    ? {
                        id: session.user.id,
                        name: session.user.name,
                        email: session.user.email,
                        role: session.user.role,
                    }
                    : null,
                target: {
                    entityType: "external_sync",
                    entityId: createdSync.id,
                    label: createdSync.name,
                },
                sourceModule: "external-sync",
                metadata: {
                    provider: config.provider,
                    targetProjectId: config.targetProjectId ?? null,
                    syncFrequency: config.syncFrequency,
                    hasColumnMappings: Boolean(config.columnMappings),
                    sheetId: config.sheetId,
                    isActive: true,
                },
            });

            return [createdSync];
        });

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
    const { organizationId, session } = await getAuthContext();
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

        const updateData: Partial<typeof externalSync.$inferInsert> = { updatedAt: new Date() };

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

        await db.transaction(async (tx) => {
            await tx.update(externalSync)
                .set(updateData)
                .where(eq(externalSync.id, syncId));

            await logAuditEvent({
                executor: tx,
                action: typeof updates.isActive === "boolean"
                    ? (updates.isActive ? "external_sync.enabled" : "external_sync.disabled")
                    : "external_sync.updated",
                entityType: "external_sync",
                entityId: syncId,
                organizationId,
                actor: session?.user
                    ? {
                        id: session.user.id,
                        name: session.user.name,
                        email: session.user.email,
                        role: session.user.role,
                    }
                    : null,
                target: {
                    entityType: "external_sync",
                    entityId: syncId,
                    label: existing.name,
                },
                sourceModule: "external-sync",
                metadata: {
                    previousValues: {
                        name: existing.name,
                        syncFrequency: existing.syncFrequency,
                        targetProjectId: existing.targetProjectId,
                        isActive: existing.isActive,
                    },
                    nextValues: {
                        name: updates.name ?? existing.name,
                        syncFrequency: updates.syncFrequency ?? existing.syncFrequency,
                        targetProjectId: updates.targetProjectId ?? existing.targetProjectId,
                        isActive: typeof updates.isActive === "boolean" ? updates.isActive : existing.isActive,
                    },
                    configFieldsUpdated: {
                        apiKey: Boolean(updates.apiKey),
                        sheetId: Boolean(updates.sheetId),
                        columnMappings: Boolean(updates.columnMappings),
                    },
                },
            });
        });

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        console.error("[UPDATE SYNC] Error:", error);
        return { success: false, error: "Failed to update sync configuration" };
    }
}

export async function deleteExternalSync(syncId: string) {
    const { organizationId, session } = await getAuthContext();
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
        await db.transaction(async (tx) => {
            await tx.update(externalSync)
                .set({ isDeleted: true, isActive: false, updatedAt: new Date() })
                .where(eq(externalSync.id, syncId));

            await logAuditEvent({
                executor: tx,
                action: "external_sync.deleted",
                entityType: "external_sync",
                entityId: syncId,
                organizationId,
                actor: session?.user
                    ? {
                        id: session.user.id,
                        name: session.user.name,
                        email: session.user.email,
                        role: session.user.role,
                    }
                    : null,
                target: {
                    entityType: "external_sync",
                    entityId: syncId,
                    label: existing.name,
                },
                sourceModule: "external-sync",
                metadata: {
                    provider: existing.provider,
                    targetProjectId: existing.targetProjectId ?? null,
                },
            });
        });

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
                sheetId: (s.config as StoredSyncConfig | null)?.sheetId,
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

