import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { systemConfig } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { logAuditEvent } from "@/lib/audit/log-audit-event";

/**
 * GET /api/config - List all configs for the organization
 */
export async function GET() {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get org configs with global defaults
        const configs = await db.query.systemConfig.findMany({
            where: and(
                eq(systemConfig.organizationId, session.user.organizationId)
            ),
        });

        // Also get global defaults for any missing keys
        const globalConfigs = await db.query.systemConfig.findMany({
            where: isNull(systemConfig.organizationId),
        });

        // Merge - org configs override global
        const configMap = new Map<string, typeof globalConfigs[0]>();
        for (const config of globalConfigs) {
            configMap.set(config.configKey, config);
        }
        for (const config of configs) {
            configMap.set(config.configKey, config);
        }

        return NextResponse.json({
            configs: Array.from(configMap.values()),
        });
    } catch (error) {
        console.error("[Config GET] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch configs" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/config - Set a config value
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { key, value, type = "STRING" } = body;

        if (!key || value === undefined) {
            return NextResponse.json(
                { error: "Missing key or value" },
                { status: 400 }
            );
        }

        // Check if org config exists
        const existing = await db.query.systemConfig.findFirst({
            where: and(
                eq(systemConfig.organizationId, session.user.organizationId),
                eq(systemConfig.configKey, key)
            ),
        });

        await db.transaction(async (tx) => {
            let configId = existing?.id ?? null;
            const previousValue = existing?.configValue ?? null;

            if (existing) {
                await tx.update(systemConfig)
                    .set({ configValue: String(value), updatedAt: new Date() })
                    .where(eq(systemConfig.id, existing.id));
            } else {
                const [createdConfig] = await tx.insert(systemConfig).values({
                    organizationId: session.user.organizationId,
                    configKey: key,
                    configValue: String(value),
                    configType: type,
                }).returning({ id: systemConfig.id });
                configId = createdConfig.id;
            }

            if (configId) {
                const normalizedKey = String(key).toLowerCase();
                const stringValue = String(value);
                const isToggle =
                    type === "BOOLEAN" ||
                    normalizedKey.includes("enable") ||
                    normalizedKey.includes("disable") ||
                    normalizedKey.includes("feature") ||
                    normalizedKey.includes("ai");

                await logAuditEvent({
                    executor: tx,
                    action: isToggle
                        ? (stringValue === "true" ? "feature.enabled" : "feature.disabled")
                        : "settings.config_updated",
                    entityType: "system_config",
                    entityId: configId,
                    organizationId: session.user.organizationId,
                    actor: {
                        id: session.user.id,
                        name: session.user.name,
                        email: session.user.email,
                        role: session.user.role,
                    },
                    target: {
                        entityType: "system_config",
                        entityId: configId,
                        label: key,
                        userId: session.user.id,
                    },
                    sourceModule: "api/config",
                    metadata: {
                        configKey: key,
                        configType: type,
                        previousValue,
                        newValue: stringValue,
                    },
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Config POST] Error:", error);
        return NextResponse.json(
            { error: "Failed to save config" },
            { status: 500 }
        );
    }
}
