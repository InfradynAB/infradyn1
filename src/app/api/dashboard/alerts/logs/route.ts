import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { alertLog, auditLog, user, member } from "@/db/schema";
import { eq, and, desc, gte, lte, sql, or } from "drizzle-orm";

/**
 * Alert Logs API
 * GET - Fetch all alert/audit activity for the organization
 * POST - Create a new alert log entry
 */

const ALERT_ACTIONS = ["ACKNOWLEDGED", "RESOLVED", "ESCALATED", "DISMISSED", "SNOOZED"] as const;
const ALERT_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;
const ALERT_TYPES = [
    "OVERDUE_DELIVERY", "NCR_OPEN", "INVOICE_PENDING", "DOCUMENT_EXPIRING",
    "MILESTONE_DUE", "BUDGET_EXCEEDED", "SUPPLIER_COMPLIANCE", "QA_FAILED",
    "PO_APPROVAL_PENDING", "SHIPMENT_DELAYED", "PAYMENT_OVERDUE", "OTHER",
] as const;

type AlertSeverity = typeof ALERT_SEVERITIES[number];

function safeParseMetadata(raw: unknown): Record<string, unknown> | null {
    if (!raw) return null;
    if (typeof raw === "object") return raw as Record<string, unknown>;
    if (typeof raw !== "string") return null;
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function titleFromAuditAction(action: string): string {
    return action
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function deriveAuditSeverity(action: string, metadata: Record<string, unknown> | null): AlertSeverity {
    const actionText = action.toUpperCase();
    const metadataText = JSON.stringify(metadata ?? {}).toUpperCase();
    if (actionText.includes("CRITICAL") || actionText.includes("FAILED") || actionText.includes("ESCALAT") || metadataText.includes("CRITICAL")) {
        return "CRITICAL";
    }
    if (actionText.includes("WARN") || actionText.includes("PENDING") || actionText.includes("OVERDUE") || metadataText.includes("WARNING")) {
        return "WARNING";
    }
    return "INFO";
}

function toActionNotes(metadata: Record<string, unknown> | null): string | null {
    if (!metadata) return null;
    const notesValue = metadata.notes ?? metadata.note ?? metadata.reason ?? metadata.comment;
    if (typeof notesValue === "string" && notesValue.trim().length > 0) {
        return notesValue;
    }
    return null;
}

export async function GET(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organizationId = session.user.organizationId;
        if (!organizationId) {
            return NextResponse.json({
                success: true,
                data: { logs: [], total: 0 },
            });
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const alertType = searchParams.get("alertType");
        const alertSeverity = searchParams.get("severity");
        const action = searchParams.get("action");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Build alert log query conditions
        const conditions = [
            eq(alertLog.organizationId, organizationId),
            eq(alertLog.isDeleted, false),
        ];

        if (alertType && ALERT_TYPES.includes(alertType as typeof ALERT_TYPES[number])) {
            conditions.push(eq(alertLog.alertType, alertType as typeof alertLog.alertType.enumValues[number]));
        }
        if (alertSeverity && ALERT_SEVERITIES.includes(alertSeverity as AlertSeverity)) {
            conditions.push(eq(alertLog.alertSeverity, alertSeverity as typeof alertLog.alertSeverity.enumValues[number]));
        }
        if (action && ALERT_ACTIONS.includes(action as typeof ALERT_ACTIONS[number])) {
            conditions.push(eq(alertLog.action, action as typeof alertLog.action.enumValues[number]));
        }
        if (startDate) {
            conditions.push(gte(alertLog.respondedAt, new Date(startDate)));
        }
        if (endDate) {
            conditions.push(lte(alertLog.respondedAt, new Date(endDate)));
        }

        // Fetch alert logs with responder info
        const alertLogs = await db
            .select({
                id: alertLog.id,
                alertType: alertLog.alertType,
                alertSeverity: alertLog.alertSeverity,
                alertTitle: alertLog.alertTitle,
                alertDescription: alertLog.alertDescription,
                entityType: alertLog.entityType,
                entityId: alertLog.entityId,
                entityReference: alertLog.entityReference,
                action: alertLog.action,
                actionNotes: alertLog.actionNotes,
                alertGeneratedAt: alertLog.alertGeneratedAt,
                respondedAt: alertLog.respondedAt,
                metadata: alertLog.metadata,
                responder: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                },
            })
            .from(alertLog)
            .leftJoin(user, eq(alertLog.respondedBy, user.id))
            .where(and(...conditions))
            .orderBy(desc(alertLog.respondedAt))
            .limit(1000);

        // Fetch organization-scoped audit logs (all org activity)
        const auditRows = await db
            .select({
                id: auditLog.id,
                action: auditLog.action,
                entityType: auditLog.entityType,
                entityId: auditLog.entityId,
                metadata: auditLog.metadata,
                createdAt: auditLog.createdAt,
                actor: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                },
            })
            .from(auditLog)
            .leftJoin(user, eq(auditLog.userId, user.id))
            .leftJoin(member, and(eq(member.userId, auditLog.userId), eq(member.organizationId, organizationId), eq(member.isDeleted, false)))
            .where(and(
                eq(auditLog.isDeleted, false),
                or(
                    eq(user.organizationId, organizationId),
                    eq(member.organizationId, organizationId),
                    sql`${auditLog.entityId}::text = ${organizationId}`,
                    sql`${auditLog.metadata} ILIKE ${`%${organizationId}%`}`,
                )
            ))
            .orderBy(desc(auditLog.createdAt))
            .limit(2000);

        const normalizedAuditLogs = auditRows.map((auditRow) => {
            const metadata = safeParseMetadata(auditRow.metadata);
            const severity = deriveAuditSeverity(auditRow.action, metadata);

            return {
                id: `audit:${auditRow.id}`,
                alertType: (auditRow.entityType || "OTHER").toUpperCase(),
                alertSeverity: severity,
                alertTitle: titleFromAuditAction(auditRow.action),
                alertDescription: null,
                entityType: auditRow.entityType,
                entityId: auditRow.entityId,
                entityReference: auditRow.entityId,
                action: auditRow.action,
                actionNotes: toActionNotes(metadata),
                alertGeneratedAt: auditRow.createdAt,
                respondedAt: auditRow.createdAt,
                metadata: {
                    ...(metadata ?? {}),
                    source: "AUDIT_LOG",
                },
                responder: auditRow.actor?.id
                    ? {
                        id: auditRow.actor.id,
                        name: auditRow.actor.name,
                        email: auditRow.actor.email,
                        image: auditRow.actor.image,
                    }
                    : null,
            };
        });

        const mergedLogs = [...alertLogs, ...normalizedAuditLogs]
            .filter((log) => {
                if (alertType && alertType !== "all") {
                    const matchesAlertType = String(log.alertType).toUpperCase() === alertType.toUpperCase();
                    const matchesEntityType = String(log.entityType || "").toUpperCase() === alertType.toUpperCase();
                    if (!matchesAlertType && !matchesEntityType) return false;
                }

                if (alertSeverity && alertSeverity !== "all") {
                    if (String(log.alertSeverity).toUpperCase() !== alertSeverity.toUpperCase()) return false;
                }

                if (action && action !== "all") {
                    const actionText = String(log.action).toUpperCase();
                    if (!actionText.includes(action.toUpperCase())) return false;
                }

                if (startDate) {
                    const at = new Date(log.respondedAt);
                    if (at < new Date(startDate)) return false;
                }
                if (endDate) {
                    const at = new Date(log.respondedAt);
                    if (at > new Date(endDate)) return false;
                }

                return true;
            })
            .sort((a, b) => new Date(b.respondedAt).getTime() - new Date(a.respondedAt).getTime());

        const totalCount = mergedLogs.length;
        const pagedLogs = mergedLogs.slice((page - 1) * limit, page * limit);

        return NextResponse.json({
            success: true,
            data: {
                logs: pagedLogs,
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("[/api/dashboard/alerts/logs] GET Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch alert logs" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organizationId = session.user.organizationId;
        if (!organizationId) {
            return NextResponse.json(
                { error: "No organization selected" },
                { status: 400 }
            );
        }

        const body = await request.json();
        const {
            alertType,
            alertSeverity,
            alertTitle,
            alertDescription,
            entityType,
            entityId,
            entityReference,
            action,
            actionNotes,
            alertGeneratedAt,
            metadata,
        } = body;

        // Validate required fields
        if (!alertType || !alertSeverity || !alertTitle || !action) {
            return NextResponse.json(
                { error: "Missing required fields: alertType, alertSeverity, alertTitle, action" },
                { status: 400 }
            );
        }

        // Create the alert log entry
        const [newLog] = await db
            .insert(alertLog)
            .values({
                organizationId,
                alertType,
                alertSeverity,
                alertTitle,
                alertDescription,
                entityType,
                entityId,
                entityReference,
                respondedBy: session.user.id,
                action,
                actionNotes,
                alertGeneratedAt: alertGeneratedAt ? new Date(alertGeneratedAt) : null,
                respondedAt: new Date(),
                metadata,
            })
            .returning();

        return NextResponse.json({
            success: true,
            data: newLog,
        });
    } catch (error) {
        console.error("[/api/dashboard/alerts/logs] POST Error:", error);
        return NextResponse.json(
            { error: "Failed to create alert log" },
            { status: 500 }
        );
    }
}
