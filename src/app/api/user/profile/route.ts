import { NextRequest, NextResponse } from "next/server";
import { ensureActiveOrgForApi } from "@/lib/server/org-access";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAuditEvent } from "@/lib/audit/log-audit-event";

/**
 * PATCH /api/user/profile
 * Update user profile (name)
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgGate = await ensureActiveOrgForApi(session);
        if (!orgGate.ok) return orgGate.response;


        const body = await request.json();
        const { name } = body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const existingUser = await db.query.user.findFirst({
            where: eq(user.id, session.user.id),
            columns: {
                name: true,
                organizationId: true,
            },
        });
        const auditEntityId = existingUser?.organizationId ?? session.user.organizationId ?? null;

        await db.transaction(async (tx) => {
            await tx
                .update(user)
                .set({ name: name.trim(), updatedAt: new Date() })
                .where(eq(user.id, session.user.id));

            if (auditEntityId) {
                await logAuditEvent({
                    executor: tx,
                    action: "profile.updated",
                    entityType: "organization",
                    entityId: auditEntityId,
                    organizationId: auditEntityId,
                    actor: {
                        id: session.user.id,
                        name: session.user.name,
                        email: session.user.email,
                        role: session.user.role,
                    },
                    target: {
                        entityType: "user_profile",
                        entityId: auditEntityId,
                        label: name.trim(),
                        userId: session.user.id,
                    },
                    sourceModule: "api/user/profile",
                    metadata: {
                        previousName: existingUser?.name ?? null,
                        newName: name.trim(),
                        targetUserId: session.user.id,
                    },
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[/api/user/profile PATCH]", error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
