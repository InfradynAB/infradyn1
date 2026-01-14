"use server";

/**
 * Phase 6I: Logistics Poller
 * 
 * Background job to poll AfterShip for shipment updates.
 * Designed to be called via Vercel Cron or similar scheduler.
 * 
 * Cron schedule: Every 2 hours (configurable via systemConfig)
 * Endpoint: /api/cron/logistics-poll
 * Vercel cron schedule: every 2 hours
 */

import db from "@/db/drizzle";
import { shipment, shipmentEvent } from "@/db/schema";
import { and, eq, isNotNull, lt, notInArray, sql } from "drizzle-orm";
import { getConfigTyped } from "@/lib/actions/config-engine";
import { syncTrackingToShipment } from "@/lib/actions/logistics-api-connector";

// ============================================================================
// Types
// ============================================================================

export interface PollResult {
    success: boolean;
    polled: number;
    updated: number;
    errors: number;
    details: {
        shipmentId: string;
        trackingNumber: string;
        status: "success" | "error";
        error?: string;
    }[];
    duration: number;
}

export interface PollStats {
    lastRunAt: Date | null;
    lastRunResult: PollResult | null;
    totalPolledToday: number;
    totalErrorsToday: number;
}

// ============================================================================
// Main Poller Function
// ============================================================================

/**
 * Poll all active shipments for tracking updates
 */
export async function runLogisticsPoller(): Promise<PollResult> {
    const startTime = Date.now();
    const details: PollResult["details"] = [];
    let polled = 0;
    let updated = 0;
    let errors = 0;

    try {
        // Check if polling is enabled
        const isEnabled = await getConfigTyped<boolean>("aftership_api_enabled");
        if (!isEnabled) {
            return {
                success: true,
                polled: 0,
                updated: 0,
                errors: 0,
                details: [],
                duration: Date.now() - startTime,
            };
        }

        // Get poll frequency (default 2 hours)
        const pollFrequencyHours = await getConfigTyped<number>("logistics_poll_frequency_hours") ?? 2;
        const staleThreshold = new Date(Date.now() - pollFrequencyHours * 60 * 60 * 1000);

        // Find shipments that need polling
        const shipmentsToPolll = await db.query.shipment.findMany({
            where: and(
                isNotNull(shipment.trackingNumber),
                isNotNull(shipment.carrierNormalized),
                eq(shipment.isTrackingLinked, true),
                // Not in terminal states
                notInArray(shipment.status, ["DELIVERED", "FAILED", "EXCEPTION"]),
                // Last sync was before threshold
                sql`(${shipment.lastApiSyncAt} IS NULL OR ${shipment.lastApiSyncAt} < ${staleThreshold})`
            ),
            limit: 50, // Batch size to avoid rate limits
        });

        polled = shipmentsToPolll.length;

        // Poll each shipment
        for (const ship of shipmentsToPolll) {
            if (!ship.trackingNumber || !ship.carrierNormalized) continue;

            try {
                const result = await syncTrackingToShipment(
                    ship.id,
                    ship.trackingNumber,
                    ship.carrierNormalized
                );

                if (result.success) {
                    updated++;
                    details.push({
                        shipmentId: ship.id,
                        trackingNumber: ship.trackingNumber,
                        status: "success",
                    });
                } else {
                    errors++;
                    details.push({
                        shipmentId: ship.id,
                        trackingNumber: ship.trackingNumber,
                        status: "error",
                        error: result.error,
                    });
                }

                // Update last sync timestamp
                await db.update(shipment)
                    .set({ lastApiSyncAt: new Date() })
                    .where(eq(shipment.id, ship.id));

            } catch (error) {
                errors++;
                details.push({
                    shipmentId: ship.id,
                    trackingNumber: ship.trackingNumber,
                    status: "error",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        return {
            success: true,
            polled,
            updated,
            errors,
            details,
            duration: Date.now() - startTime,
        };

    } catch (error) {
        console.error("[LogisticsPoller] Fatal error:", error);
        return {
            success: false,
            polled,
            updated,
            errors: errors + 1,
            details,
            duration: Date.now() - startTime,
        };
    }
}




// ============================================================================
// Manual Sync Functions
// ============================================================================

/**
 * Force sync a specific shipment regardless of timing
 */
export async function forceSyncShipment(shipmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ship = await db.query.shipment.findFirst({
            where: eq(shipment.id, shipmentId),
        });

        if (!ship || !ship.trackingNumber || !ship.carrierNormalized) {
            return { success: false, error: "Shipment not found or missing tracking info" };
        }

        const result = await syncTrackingToShipment(
            ship.id,
            ship.trackingNumber,
            ship.carrierNormalized
        );

        if (result.success) {
            await db.update(shipment)
                .set({ lastApiSyncAt: new Date() })
                .where(eq(shipment.id, shipmentId));
        }

        return result;
    } catch (error) {
        console.error("[forceSyncShipment] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

/**
 * Get shipments that are overdue for sync
 */
export async function getOverdueSyncShipments(): Promise<{ id: string; trackingNumber: string; lastSync: Date | null }[]> {
    const pollFrequencyHours = await getConfigTyped<number>("logistics_poll_frequency_hours") ?? 2;
    const staleThreshold = new Date(Date.now() - pollFrequencyHours * 60 * 60 * 1000);

    const shipments = await db.query.shipment.findMany({
        where: and(
            isNotNull(shipment.trackingNumber),
            eq(shipment.isTrackingLinked, true),
            notInArray(shipment.status, ["DELIVERED", "FAILED", "EXCEPTION"]),
            sql`(${shipment.lastApiSyncAt} IS NULL OR ${shipment.lastApiSyncAt} < ${staleThreshold})`
        ),
        columns: {
            id: true,
            trackingNumber: true,
            lastApiSyncAt: true,
        },
        limit: 100,
    });

    return shipments.map(s => ({
        id: s.id,
        trackingNumber: s.trackingNumber!,
        lastSync: s.lastApiSyncAt,
    }));
}
