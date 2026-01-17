"use server";

/**
 * Phase 6: AfterShip Logistics API Connector
 * 
 * Integrates with AfterShip tracking API for real-time shipment updates.
 * Supports both webhook-based and polling-based updates.
 */

import { updateShipment, createShipmentEvent, checkEtaConflict, updateEtaConfidence } from "./logistics-engine";
import { getConfigTyped } from "./config-engine";

// ============================================================================
// Types
// ============================================================================

export interface AfterShipTracking {
    id: string;
    tracking_number: string;
    slug: string; // carrier code
    active: boolean;
    expected_delivery: string | null;
    origin_state: string | null;
    origin_city: string | null;
    origin_country_iso3: string | null;
    destination_state: string | null;
    destination_city: string | null;
    destination_country_iso3: string | null;
    tag: AfterShipStatus;
    subtag: string;
    subtag_message: string;
    checkpoints: AfterShipCheckpoint[];
}

export interface AfterShipCheckpoint {
    slug: string;
    city: string | null;
    created_at: string;
    location: string | null;
    country_name: string | null;
    message: string;
    country_iso3: string | null;
    tag: string;
    subtag: string;
    subtag_message: string;
    checkpoint_time: string;
    coordinates: [number, number] | null;
    state: string | null;
    zip: string | null;
    raw_tag: string;
}

export type AfterShipStatus =
    | "Pending"
    | "InfoReceived"
    | "InTransit"
    | "OutForDelivery"
    | "AttemptFail"
    | "Delivered"
    | "AvailableForPickup"
    | "Exception"
    | "Expired";

export interface AfterShipWebhookPayload {
    event: string;
    msg: {
        id: string;
        tracking_number: string;
        slug: string;
        tag: AfterShipStatus;
        subtag: string;
        subtag_message: string;
        expected_delivery: string | null;
        checkpoints: AfterShipCheckpoint[];
    };
}

// ============================================================================
// AfterShip API Configuration
// ============================================================================

const AFTERSHIP_API_BASE = "https://api.aftership.com/v4";

async function getAfterShipApiKey(): Promise<string | null> {
    // This would typically come from environment or encrypted storage
    return process.env.AFTERSHIP_API_KEY || null;
}

async function makeAfterShipRequest(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: object
): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const apiKey = await getAfterShipApiKey();
    if (!apiKey) {
        return { success: false, error: "AfterShip API key not configured" };
    }

    try {
        const response = await fetch(`${AFTERSHIP_API_BASE}${endpoint}`, {
            method,
            headers: {
                "aftership-api-key": apiKey,
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.meta?.message || "AfterShip API error" };
        }

        return { success: true, data: data.data };
    } catch (error) {
        console.error("[AfterShip API] Request error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

// ============================================================================
// Tracking Operations
// ============================================================================

/**
 * Register a tracking number with AfterShip
 */
export async function createAfterShipTracking(
    trackingNumber: string,
    carrierSlug: string,
    metadata?: {
        shipmentId?: string;
        purchaseOrderId?: string;
        customFields?: Record<string, string>;
    }
): Promise<{ success: boolean; aftershipId?: string; error?: string }> {
    const isEnabled = await getConfigTyped<boolean>("aftership_api_enabled");
    if (!isEnabled) {
        return { success: false, error: "AfterShip integration disabled" };
    }

    const result = await makeAfterShipRequest("/trackings", "POST", {
        tracking: {
            tracking_number: trackingNumber,
            slug: carrierSlug,
            custom_fields: metadata?.customFields,
            title: metadata?.purchaseOrderId ? `PO: ${metadata.purchaseOrderId}` : undefined,
        },
    });

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const tracking = result.data as { tracking: AfterShipTracking };
    return { success: true, aftershipId: tracking.tracking.id };
}

/**
 * Get tracking info from AfterShip
 */
export async function getAfterShipTracking(
    trackingNumber: string,
    carrierSlug: string
): Promise<{ success: boolean; tracking?: AfterShipTracking; error?: string }> {
    const result = await makeAfterShipRequest(`/trackings/${carrierSlug}/${trackingNumber}`);

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const data = result.data as { tracking: AfterShipTracking };
    return { success: true, tracking: data.tracking };
}

/**
 * Delete tracking from AfterShip
 */
export async function deleteAfterShipTracking(
    trackingNumber: string,
    carrierSlug: string
): Promise<{ success: boolean; error?: string }> {
    const result = await makeAfterShipRequest(`/trackings/${carrierSlug}/${trackingNumber}`, "DELETE");
    return { success: result.success, error: result.error };
}

// ============================================================================
// Status Mapping
// ============================================================================

const STATUS_MAP: Record<AfterShipStatus, "PENDING" | "DISPATCHED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "PARTIALLY_DELIVERED" | "FAILED" | "EXCEPTION"> = {
    "Pending": "PENDING",
    "InfoReceived": "DISPATCHED",
    "InTransit": "IN_TRANSIT",
    "OutForDelivery": "OUT_FOR_DELIVERY",
    "Delivered": "DELIVERED",
    "AvailableForPickup": "OUT_FOR_DELIVERY",
    "AttemptFail": "FAILED",
    "Exception": "EXCEPTION",
    "Expired": "EXCEPTION",
};

function mapAfterShipStatus(tag: AfterShipStatus): "PENDING" | "DISPATCHED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "PARTIALLY_DELIVERED" | "FAILED" | "EXCEPTION" {
    return STATUS_MAP[tag] || "IN_TRANSIT";
}

function mapCheckpointToEventType(tag: string): "LOCATION_SCAN" | "ETA_UPDATE" | "EXCEPTION" | "DELIVERED" | "PICKUP" | "HELD_CUSTOMS" | "OTHER" {
    const lowerTag = tag.toLowerCase();
    if (lowerTag.includes("deliver")) return "DELIVERED";
    if (lowerTag.includes("pickup") || lowerTag.includes("collected")) return "PICKUP";
    if (lowerTag.includes("customs")) return "HELD_CUSTOMS";
    if (lowerTag.includes("exception") || lowerTag.includes("fail")) return "EXCEPTION";
    return "LOCATION_SCAN";
}

// ============================================================================
// Sync Operations
// ============================================================================

/**
 * Sync tracking data from AfterShip to our shipment
 */
export async function syncTrackingToShipment(
    shipmentId: string,
    trackingNumber: string,
    carrierSlug: string
): Promise<{ success: boolean; error?: string }> {
    // Fetch latest from AfterShip
    const trackingResult = await getAfterShipTracking(trackingNumber, carrierSlug);
    if (!trackingResult.success || !trackingResult.tracking) {
        return { success: false, error: trackingResult.error };
    }

    const tracking = trackingResult.tracking;

    // Update shipment status
    await updateShipment({
        shipmentId,
        status: mapAfterShipStatus(tracking.tag),
        logisticsEta: tracking.expected_delivery ? new Date(tracking.expected_delivery) : undefined,
        lastKnownLocation: tracking.checkpoints[0]?.location || undefined,
    });

    // Import checkpoints as events
    for (const checkpoint of tracking.checkpoints.slice(0, 10)) { // Last 10 checkpoints
        await createShipmentEvent({
            shipmentId,
            eventType: mapCheckpointToEventType(checkpoint.tag),
            eventTime: new Date(checkpoint.checkpoint_time),
            location: checkpoint.location || checkpoint.city || undefined,
            description: checkpoint.message,
            rawApiData: checkpoint,
            source: "LOGISTICS_API",
        });
    }

    // Update ETA confidence and check for conflicts
    await updateEtaConfidence(shipmentId);
    await checkEtaConflict(shipmentId);

    return { success: true };
}

/**
 * Link a tracking number to a shipment and register with AfterShip
 */
export async function linkTrackingToShipment(
    shipmentId: string,
    trackingNumber: string,
    carrierSlug: string,
    purchaseOrderId?: string
): Promise<{ success: boolean; error?: string }> {
    // Register with AfterShip
    const createResult = await createAfterShipTracking(trackingNumber, carrierSlug, {
        shipmentId,
        purchaseOrderId,
    });

    // Even if AfterShip fails, update our record
    const updateResult = await updateShipment({
        shipmentId,
        trackingNumber,
        carrier: carrierSlug,
    });

    if (!updateResult.success) {
        return { success: false, error: updateResult.error };
    }

    // Initial sync
    if (createResult.success) {
        await syncTrackingToShipment(shipmentId, trackingNumber, carrierSlug);
    }

    return { success: true };
}

// ============================================================================
// Webhook Handler
// ============================================================================

/**
 * Process AfterShip webhook payload
 */
export async function processAfterShipWebhook(
    payload: AfterShipWebhookPayload
): Promise<{ success: boolean; shipmentId?: string; error?: string }> {
    try {
        // Find shipment by AfterShip ID
        const { msg } = payload;

        // TODO: Look up shipment by aftershipId
        // For now, we need to query by tracking number
        const db = await import("@/db/drizzle").then(m => m.default);
        const { shipment } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");

        const existingShipment = await db.query.shipment.findFirst({
            where: eq(shipment.trackingNumber, msg.tracking_number),
        });

        if (!existingShipment) {
            return { success: false, error: "Shipment not found for tracking number" };
        }

        // Update status
        await updateShipment({
            shipmentId: existingShipment.id,
            status: mapAfterShipStatus(msg.tag),
            logisticsEta: msg.expected_delivery ? new Date(msg.expected_delivery) : undefined,
        });

        // Add latest checkpoint as event
        if (msg.checkpoints.length > 0) {
            const latestCheckpoint = msg.checkpoints[0];
            await createShipmentEvent({
                shipmentId: existingShipment.id,
                eventType: mapCheckpointToEventType(latestCheckpoint.tag),
                eventTime: new Date(latestCheckpoint.checkpoint_time),
                location: latestCheckpoint.location || latestCheckpoint.city || undefined,
                description: latestCheckpoint.message,
                rawApiData: latestCheckpoint,
                source: "LOGISTICS_API",
            });
        }

        // Update confidence and check conflicts
        await updateEtaConfidence(existingShipment.id);
        await checkEtaConflict(existingShipment.id);

        return { success: true, shipmentId: existingShipment.id };
    } catch (error) {
        console.error("[AfterShip Webhook] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

// ============================================================================
// Batch Polling (for shipments without webhook updates)
// ============================================================================

/**
 * Poll all active shipments that haven't been updated recently
 */
export async function pollActiveShipments(): Promise<{ polled: number; updated: number; errors: number }> {
    const db = await import("@/db/drizzle").then(m => m.default);
    const { shipment } = await import("@/db/schema");
    const { and, eq, isNotNull, lt, notInArray } = await import("drizzle-orm");

    const pollFrequencyHours = await getConfigTyped<number>("logistics_poll_frequency_hours") ?? 2;
    const staleThreshold = new Date(Date.now() - pollFrequencyHours * 60 * 60 * 1000);

    // Find shipments that need polling
    const shipmentsToPolll = await db.query.shipment.findMany({
        where: and(
            isNotNull(shipment.trackingNumber),
            isNotNull(shipment.carrierNormalized),
            eq(shipment.isTrackingLinked, true),
            // Not delivered or failed
            notInArray(shipment.status, ["DELIVERED", "FAILED", "EXCEPTION"]),
            // Last sync was before threshold (or never)
            lt(shipment.lastApiSyncAt, staleThreshold)
        ),
        limit: 50, // Batch size
    });

    let updated = 0;
    let errors = 0;

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
            } else {
                errors++;
            }
        } catch (error) {
            console.error(`[pollActiveShipments] Error polling ${ship.id}:`, error);
            errors++;
        }
    }

    return { polled: shipmentsToPolll.length, updated, errors };
}
