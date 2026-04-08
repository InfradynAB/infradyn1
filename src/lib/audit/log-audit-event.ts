"use server";

import { headers } from "next/headers";
import db from "@/db/drizzle";
import { auditLog } from "@/db/schema";

interface AuditExecutor {
    insert: typeof db.insert;
}

interface AuditActor {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    role?: string | null;
}

interface AuditTarget {
    entityType: string;
    entityId: string;
    label?: string | null;
    userId?: string | null;
}

interface LogAuditEventInput {
    action: string;
    entityType: string;
    entityId: string;
    organizationId?: string | null;
    actor?: AuditActor | null;
    target?: AuditTarget | null;
    sourceModule: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    executor?: AuditExecutor;
}

function extractIpAddress(forwardedFor: string | null, realIp: string | null) {
    if (forwardedFor) {
        return forwardedFor.split(",")[0]?.trim() || null;
    }

    return realIp?.trim() || null;
}

export async function logAuditEvent({
    action,
    entityType,
    entityId,
    organizationId = null,
    actor,
    target,
    sourceModule,
    metadata = {},
    ipAddress,
    executor = db,
}: LogAuditEventInput) {
    const requestHeaders = await headers();
    const resolvedIp =
        ipAddress ??
        extractIpAddress(
            requestHeaders.get("x-forwarded-for"),
            requestHeaders.get("x-real-ip")
        );

    const occurredAt = new Date();

    await executor.insert(auditLog).values({
        userId: actor?.id ?? null,
        action,
        entityType,
        entityId,
        ipAddress: resolvedIp,
        metadata: JSON.stringify({
            sourceApp: "main_app",
            sourceModule,
            organizationId,
            occurredAt: occurredAt.toISOString(),
            actor: actor
                ? {
                    id: actor.id ?? null,
                    name: actor.name ?? null,
                    email: actor.email ?? null,
                    role: actor.role ?? null,
                }
                : null,
            target: target
                ? {
                    entityType: target.entityType,
                    entityId: target.entityId,
                    label: target.label ?? null,
                    userId: target.userId ?? null,
                }
                : null,
            ...metadata,
        }),
    });
}
