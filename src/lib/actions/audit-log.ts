"use server";

import db from "@/db/drizzle";
import { auditLog, user } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { headers } from "next/headers";

interface AuditLogEntry {
    id: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    metadata: any;
    createdAt: Date;
    userId: string | null;
    userName?: string | null;
}

interface GetAuditLogsInput {
    entityType?: string;
    entityId?: string;
    limit?: number;
}

/**
 * Get audit log entries, optionally filtered by entity
 */
export async function getAuditLogs(input: GetAuditLogsInput = {}): Promise<{
    success: boolean;
    data?: AuditLogEntry[];
    error?: string;
}> {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session) {
            return { success: false, error: "Unauthorized" };
        }

        const whereConditions = [];

        if (input.entityType) {
            whereConditions.push(eq(auditLog.entityType, input.entityType));
        }
        if (input.entityId) {
            whereConditions.push(eq(auditLog.entityId, input.entityId));
        }

        const logs = await db
            .select({
                id: auditLog.id,
                action: auditLog.action,
                entityType: auditLog.entityType,
                entityId: auditLog.entityId,
                metadata: auditLog.metadata,
                createdAt: auditLog.createdAt,
                userId: auditLog.userId,
            })
            .from(auditLog)
            .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
            .orderBy(desc(auditLog.createdAt))
            .limit(input.limit || 50);

        // Enrich with user names
        const enrichedLogs: AuditLogEntry[] = [];
        const userCache: Record<string, string> = {};

        for (const log of logs) {
            let userName: string | null = null;

            if (log.userId) {
                if (userCache[log.userId]) {
                    userName = userCache[log.userId];
                } else {
                    const u = await db.query.user.findFirst({
                        where: eq(user.id, log.userId),
                    });
                    if (u) {
                        userName = u.name;
                        userCache[log.userId] = u.name;
                    }
                }
            }

            enrichedLogs.push({
                ...log,
                metadata: log.metadata ? JSON.parse(log.metadata as string) : null,
                userName,
            });
        }

        return { success: true, data: enrichedLogs };
    } catch (error) {
        console.error("[getAuditLogs] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to get audit logs" };
    }
}

/**
 * Get audit logs for a specific purchase order (all related entities)
 */
export async function getPOAuditLogs(purchaseOrderId: string): Promise<{
    success: boolean;
    data?: AuditLogEntry[];
    error?: string;
}> {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session) {
            return { success: false, error: "Unauthorized" };
        }

        // Get logs that mention this PO in entityId or metadata
        const logs = await db
            .select({
                id: auditLog.id,
                action: auditLog.action,
                entityType: auditLog.entityType,
                entityId: auditLog.entityId,
                metadata: auditLog.metadata,
                createdAt: auditLog.createdAt,
                userId: auditLog.userId,
            })
            .from(auditLog)
            .where(
                sql`${auditLog.entityId} = ${purchaseOrderId} 
                    OR ${auditLog.metadata}::text LIKE ${'%' + purchaseOrderId + '%'}`
            )
            .orderBy(desc(auditLog.createdAt))
            .limit(100);

        // Enrich with user names
        const enrichedLogs: AuditLogEntry[] = [];
        const userCache: Record<string, string> = {};

        for (const log of logs) {
            let userName: string | null = null;

            if (log.userId) {
                if (userCache[log.userId]) {
                    userName = userCache[log.userId];
                } else {
                    const u = await db.query.user.findFirst({
                        where: eq(user.id, log.userId),
                    });
                    if (u) {
                        userName = u.name;
                        userCache[log.userId] = u.name;
                    }
                }
            }

            enrichedLogs.push({
                ...log,
                metadata: log.metadata ? JSON.parse(log.metadata as string) : null,
                userName,
            });
        }

        return { success: true, data: enrichedLogs };
    } catch (error) {
        console.error("[getPOAuditLogs] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to get PO audit logs" };
    }
}
