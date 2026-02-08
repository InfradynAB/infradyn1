import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { alertLog, user, organization } from "@/db/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

/**
 * Alert Logs API
 * GET - Fetch all alert logs for the organization
 * POST - Create a new alert log entry
 */

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

        // Build query conditions
        const conditions = [
            eq(alertLog.organizationId, organizationId),
            eq(alertLog.isDeleted, false),
        ];

        if (alertType) {
            conditions.push(eq(alertLog.alertType, alertType as typeof alertLog.alertType.enumValues[number]));
        }
        if (alertSeverity) {
            conditions.push(eq(alertLog.alertSeverity, alertSeverity as typeof alertLog.alertSeverity.enumValues[number]));
        }
        if (action) {
            conditions.push(eq(alertLog.action, action as typeof alertLog.action.enumValues[number]));
        }
        if (startDate) {
            conditions.push(gte(alertLog.respondedAt, new Date(startDate)));
        }
        if (endDate) {
            conditions.push(lte(alertLog.respondedAt, new Date(endDate)));
        }

        // Get total count
        const [{ count: totalCount }] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(alertLog)
            .where(and(...conditions));

        // Fetch logs with responder info
        const logs = await db
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
            .limit(limit)
            .offset((page - 1) * limit);

        return NextResponse.json({
            success: true,
            data: {
                logs,
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
