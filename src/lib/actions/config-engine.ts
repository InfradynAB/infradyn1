"use server";

/**
 * Phase 6: Configuration Engine
 * 
 * Manages system-wide configurable thresholds and settings.
 * Supports organization-level overrides with fallback to global defaults.
 */

import db from "@/db/drizzle";
import { systemConfig } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { DEFAULT_CONFIGS } from "@/lib/config/config-defaults";

// ============================================================================
// Types
// ============================================================================

interface ConfigValue {
    key: string;
    value: string;
    type: "NUMBER" | "BOOLEAN" | "STRING" | "JSON";
    description?: string;
    organizationId?: string | null;
}

// Note: DEFAULT_CONFIGS is imported from @/lib/config/config-defaults.ts

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get a configuration value with fallback to global default
 */
export async function getConfig(
    key: string,
    organizationId?: string
): Promise<string | null> {
    // First, try organization-specific value
    if (organizationId) {
        const orgConfig = await db.query.systemConfig.findFirst({
            where: and(
                eq(systemConfig.configKey, key),
                eq(systemConfig.organizationId, organizationId)
            ),
        });
        if (orgConfig) {
            return orgConfig.configValue;
        }
    }

    // Then, try global value (null organizationId)
    const globalConfig = await db.query.systemConfig.findFirst({
        where: and(
            eq(systemConfig.configKey, key),
            isNull(systemConfig.organizationId)
        ),
    });
    if (globalConfig) {
        return globalConfig.configValue;
    }

    // Finally, fall back to hardcoded defaults
    const defaultConfig = DEFAULT_CONFIGS[key];
    return defaultConfig?.value ?? null;
}

/**
 * Get a configuration value parsed to the correct type
 */
export async function getConfigTyped<T extends number | boolean | string | object>(
    key: string,
    organizationId?: string
): Promise<T | null> {
    const value = await getConfig(key, organizationId);
    if (value === null) return null;

    const defaultConfig = DEFAULT_CONFIGS[key];
    const type = defaultConfig?.type ?? "STRING";

    switch (type) {
        case "NUMBER":
            return Number(value) as T;
        case "BOOLEAN":
            return (value === "true") as T;
        case "JSON":
            try {
                return JSON.parse(value) as T;
            } catch {
                return null;
            }
        default:
            return value as T;
    }
}

/**
 * Set a configuration value
 */
export async function setConfig(
    key: string,
    value: string,
    organizationId?: string | null,
    description?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const defaultConfig = DEFAULT_CONFIGS[key];
        const configType = defaultConfig?.type ?? "STRING";
        const configDescription = description ?? defaultConfig?.description ?? "";

        // Check if config already exists
        const whereClause = organizationId
            ? and(eq(systemConfig.configKey, key), eq(systemConfig.organizationId, organizationId))
            : and(eq(systemConfig.configKey, key), isNull(systemConfig.organizationId));

        const existing = await db.query.systemConfig.findFirst({
            where: whereClause,
        });

        if (existing) {
            // Update existing
            await db.update(systemConfig)
                .set({
                    configValue: value,
                    description: configDescription,
                })
                .where(eq(systemConfig.id, existing.id));
        } else {
            // Insert new
            await db.insert(systemConfig).values({
                configKey: key,
                configValue: value,
                configType: configType,
                description: configDescription,
                organizationId: organizationId ?? null,
            });
        }

        return { success: true };
    } catch (error) {
        console.error("[setConfig] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

/**
 * Get all configuration values for an organization (with global fallbacks)
 */
export async function getAllConfigs(
    organizationId?: string
): Promise<ConfigValue[]> {
    const result: ConfigValue[] = [];

    // Get all global configs
    const globalConfigs = await db.query.systemConfig.findMany({
        where: isNull(systemConfig.organizationId),
    });

    // Get org-specific configs if applicable
    let orgConfigs: typeof globalConfigs = [];
    if (organizationId) {
        orgConfigs = await db.query.systemConfig.findMany({
            where: eq(systemConfig.organizationId, organizationId),
        });
    }

    // Build result with org overrides
    const orgConfigMap = new Map(orgConfigs.map(c => [c.configKey, c]));
    const globalConfigMap = new Map(globalConfigs.map(c => [c.configKey, c]));

    // Combine all config keys
    const allKeys = new Set([
        ...Object.keys(DEFAULT_CONFIGS),
        ...globalConfigs.map(c => c.configKey),
        ...orgConfigs.map(c => c.configKey),
    ]);

    for (const key of allKeys) {
        const orgConfig = orgConfigMap.get(key);
        const globalConfig = globalConfigMap.get(key);
        const defaultConfig = DEFAULT_CONFIGS[key];

        if (orgConfig) {
            result.push({
                key,
                value: orgConfig.configValue,
                type: (orgConfig.configType as ConfigValue["type"]) ?? "STRING",
                description: orgConfig.description ?? undefined,
                organizationId: orgConfig.organizationId,
            });
        } else if (globalConfig) {
            result.push({
                key,
                value: globalConfig.configValue,
                type: (globalConfig.configType as ConfigValue["type"]) ?? "STRING",
                description: globalConfig.description ?? undefined,
                organizationId: null,
            });
        } else if (defaultConfig) {
            result.push({
                key,
                value: defaultConfig.value,
                type: defaultConfig.type,
                description: defaultConfig.description,
                organizationId: null,
            });
        }
    }

    return result.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Seed default configuration values (run on app init or deployment)
 */
export async function seedDefaultConfigs(): Promise<{ success: boolean; seeded: number }> {
    let seeded = 0;

    for (const [key, config] of Object.entries(DEFAULT_CONFIGS)) {
        const existing = await db.query.systemConfig.findFirst({
            where: and(
                eq(systemConfig.configKey, key),
                isNull(systemConfig.organizationId)
            ),
        });

        if (!existing) {
            await db.insert(systemConfig).values({
                configKey: key,
                configValue: config.value,
                configType: config.type,
                description: config.description,
            });
            seeded++;
        }
    }

    return { success: true, seeded };
}

// ============================================================================
// Convenience Helpers
// ============================================================================

/**
 * Get delay-related thresholds
 */
export async function getDelayThresholds(organizationId?: string) {
    return {
        toleranceDays: await getConfigTyped<number>("delay_tolerance_days", organizationId) ?? 2,
        highDelayDays: await getConfigTyped<number>("high_delay_threshold_days", organizationId) ?? 5,
    };
}

/**
 * Get quantity variance thresholds
 */
export async function getVarianceThresholds(organizationId?: string) {
    return {
        variancePercent: await getConfigTyped<number>("quantity_variance_threshold", organizationId) ?? 5,
        highVariancePercent: await getConfigTyped<number>("high_variance_threshold", organizationId) ?? 10,
    };
}

/**
 * Get invoice thresholds
 */
export async function getInvoiceThresholds(organizationId?: string) {
    return {
        highValueThreshold: await getConfigTyped<number>("high_value_invoice_threshold", organizationId) ?? 10000,
    };
}

/**
 * Get logistics poll settings
 */
export async function getLogisticsSettings(organizationId?: string) {
    return {
        pollFrequencyHours: await getConfigTyped<number>("logistics_poll_frequency_hours", organizationId) ?? 2,
        aftershipEnabled: await getConfigTyped<boolean>("aftership_api_enabled", organizationId) ?? true,
    };
}

/**
 * Check if auto-accept is enabled for the organization
 */
export async function isAutoAcceptEnabled(organizationId?: string) {
    return await getConfigTyped<boolean>("enable_auto_accept_policy", organizationId) ?? false;
}
