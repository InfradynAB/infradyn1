"use server";

/**
 * Phase 6: DHL Shipment Tracking - Unified API Connector
 * 
 * Integrates with DHL's Shipment Tracking API for Express and Freight
 * with webhook-based push updates and POD integration.
 */

import db from "@/db/drizzle";
import { shipment, shipmentEvent } from "@/db/schema";
import { eq } from "drizzle-orm";

// Import utility functions and types for internal use
// Note: External consumers should import directly from "@/lib/utils/dhl-utils"
import {
    validateWaybillNumber,
    mapDHLStatus,
    mapDHLEventType,
    type DHLStatusCode,
    type DHLShipment,
    type DHLStatus,
    type DHLEvent,
    type DHLWebhookPayload,
} from "@/lib/utils/dhl-utils";

// Note: All DHL interfaces (DHLShipment, DHLStatus, DHLEvent, DHLWebhookPayload, DHLStatusCode)
// are imported from @/lib/utils/dhl-utils

// ============================================================================
// DHL API Configuration
// ============================================================================

const DHL_API_BASE = "https://api-eu.dhl.com";

function getDHLApiKey(): string | null {
    return process.env.DHL_API_KEY || null;
}

async function makeDHLRequest(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: object
): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const apiKey = getDHLApiKey();
    if (!apiKey) {
        return { success: false, error: "DHL API key not configured" };
    }

    try {
        const response = await fetch(`${DHL_API_BASE}${endpoint}`, {
            method,
            headers: {
                'DHL-API-Key': apiKey,
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`DHL API error (${response.status}):`, errorText);

            let errorMessage = `API error: ${response.status}`;
            if (response.status === 401) {
                errorMessage = "DHL API authentication failed - please check your DHL_API_KEY";
            } else if (response.status === 403) {
                errorMessage = "DHL API permission denied - your key may not have tracking access";
            } else if (response.status === 404) {
                // Tracking number not found — this is expected for new or pre-shipped waybills
                return {
                    success: true,
                    data: { shipments: [] },
                };
            } else if (response.status === 429) {
                errorMessage = "DHL API rate limit exceeded - please try again later";
            }

            return {
                success: false,
                error: errorMessage
            };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error("DHL API request failed:", error);
        return { success: false, error: String(error) };
    }
}

// Note: validateWaybillNumber moved to @/lib/utils/dhl-utils.ts

// ============================================================================
// Waybill Verification
// ============================================================================

/**
 * Verify a DHL waybill exists in the DHL system
 * Returns success=true only if the waybill is valid and found in DHL's system
 */
export async function verifyDHLWaybill(
    waybillNumber: string
): Promise<{ success: boolean; valid: boolean; error?: string }> {
    // First validate the format
    const validation = validateWaybillNumber(waybillNumber);
    if (!validation.valid) {
        return { success: true, valid: false, error: validation.error };
    }

    // Check DHL API for this waybill
    const result = await makeDHLRequest(
        `/track/shipments?trackingNumber=${validation.normalized}`
    );

    if (!result.success) {
        // API error (not necessarily invalid waybill)
        return { success: false, valid: false, error: result.error };
    }

    const response = result.data as { shipments?: unknown[] };
    if (!response.shipments || response.shipments.length === 0) {
        return { success: true, valid: false, error: "Waybill not found in DHL system" };
    }

    return { success: true, valid: true };
}

// ============================================================================
// Tracking Operations
// ============================================================================

/**
 * Get shipment tracking status from DHL API
 */
export async function getDHLShipmentStatus(
    waybillNumber: string
): Promise<{ success: boolean; shipment?: DHLShipment; error?: string }> {
    const validation = validateWaybillNumber(waybillNumber);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const result = await makeDHLRequest(
        `/track/shipments?trackingNumber=${validation.normalized}`
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const response = result.data as { shipments?: DHLShipment[] };
    if (!response.shipments || response.shipments.length === 0) {
        return { success: false, error: "Shipment not found" };
    }

    return { success: true, shipment: response.shipments[0] };
}

/**
 * Get Proof of Delivery (signature image) from DHL
 */
export async function getProofOfDelivery(
    waybillNumber: string
): Promise<{
    success: boolean;
    signatureUrl?: string;
    signedBy?: string;
    signedAt?: string;
    error?: string
}> {
    const result = await getDHLShipmentStatus(waybillNumber);

    if (!result.success || !result.shipment) {
        return { success: false, error: result.error };
    }

    const pod = result.shipment.details?.proofOfDelivery;
    if (!pod || !pod.signed) {
        return { success: false, error: "POD not available" };
    }

    return {
        success: true,
        signatureUrl: pod.signatureUrl,
        signedBy: pod.signedBy,
        signedAt: pod.timestamp,
    };
}

// Note: Status mapping functions moved to @/lib/utils/dhl-utils.ts

// ============================================================================
// Sync Operations
// ============================================================================

/**
 * Sync tracking data from DHL API to our shipment
 */
export async function syncDHLToShipment(
    shipmentId: string
): Promise<{ success: boolean; error?: string }> {
    const existingShipment = await db.query.shipment.findFirst({
        where: eq(shipment.id, shipmentId),
    });

    if (!existingShipment?.waybillNumber) {
        return { success: false, error: "No waybill number linked" };
    }

    const result = await getDHLShipmentStatus(existingShipment.waybillNumber);
    if (!result.success || !result.shipment) {
        return { success: false, error: result.error };
    }

    const dhlShipment = result.shipment;

    // Update shipment with latest data
    await db.update(shipment)
        .set({
            status: mapDHLStatus(dhlShipment.status.statusCode),
            dhlService: dhlShipment.service,
            lastKnownLocation: dhlShipment.status.location?.address.addressLocality,
            logisticsEta: dhlShipment.estimatedTimeOfDelivery
                ? new Date(dhlShipment.estimatedTimeOfDelivery)
                : existingShipment.logisticsEta,
            isException: dhlShipment.status.statusCode === 'failure',
            lastApiSyncAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(shipment.id, shipmentId));

    // Create events from tracking history
    if (dhlShipment.events && dhlShipment.events.length > 0) {
        for (const event of dhlShipment.events.slice(0, 10)) {
            await db.insert(shipmentEvent).values({
                shipmentId,
                eventType: mapDHLEventType(event.statusCode),
                eventTime: new Date(event.timestamp),
                location: event.location?.address.addressLocality,
                description: event.description,
                rawApiData: event as unknown as Record<string, unknown>,
                source: 'LOGISTICS_API',
            });
        }
    }

    // Fetch POD if delivered
    if (dhlShipment.status.statusCode === 'delivered') {
        const podResult = await getProofOfDelivery(existingShipment.waybillNumber);
        if (podResult.success) {
            await db.update(shipment)
                .set({
                    podSignatureUrl: podResult.signatureUrl,
                    podSignedBy: podResult.signedBy,
                    podSignedAt: podResult.signedAt ? new Date(podResult.signedAt) : undefined,
                })
                .where(eq(shipment.id, shipmentId));
        }
    }

    return { success: true };
}

// ============================================================================
// Webhook Handler
// ============================================================================

/**
 * Process DHL webhook payload
 */
export async function processDHLWebhook(
    payload: DHLWebhookPayload
): Promise<{ success: boolean; processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    for (const dhlShipment of payload.shipments) {
        try {
            // Find shipment by waybill number
            const existingShipment = await db.query.shipment.findFirst({
                where: eq(shipment.waybillNumber, dhlShipment.id),
            });

            if (!existingShipment) {
                console.warn(`No shipment found for waybill: ${dhlShipment.id}`);
                errors++;
                continue;
            }

            // Update shipment status
            const updateData: Partial<typeof shipment.$inferSelect> = {
                status: mapDHLStatus(dhlShipment.status.statusCode),
                lastKnownLocation: dhlShipment.status.location?.address.addressLocality,
                lastApiSyncAt: new Date(),
                updatedAt: new Date(),
            };

            // Check for exception
            if (dhlShipment.status.statusCode === 'failure') {
                updateData.isException = true;
            }

            // Update POD if delivered
            if (dhlShipment.status.statusCode === 'delivered' && dhlShipment.details?.proofOfDelivery) {
                const pod = dhlShipment.details.proofOfDelivery;
                updateData.podSignatureUrl = pod.signatureUrl;
                updateData.podSignedBy = pod.signedBy;
                updateData.podSignedAt = pod.timestamp ? new Date(pod.timestamp) : undefined;
            }

            await db.update(shipment)
                .set(updateData)
                .where(eq(shipment.id, existingShipment.id));

            // Create event record
            await db.insert(shipmentEvent).values({
                shipmentId: existingShipment.id,
                eventType: mapDHLEventType(dhlShipment.status.statusCode),
                eventTime: new Date(dhlShipment.status.timestamp),
                location: dhlShipment.status.location?.address.addressLocality,
                description: dhlShipment.status.description,
                rawApiData: dhlShipment as unknown as Record<string, unknown>,
                source: 'LOGISTICS_API',
            });

            console.log(`✅ Processed DHL webhook for ${dhlShipment.id}: ${dhlShipment.status.statusCode}`);
            processed++;

        } catch (error) {
            console.error(`Error processing DHL webhook for ${dhlShipment.id}:`, error);
            errors++;
        }
    }

    return { success: errors === 0, processed, errors };
}
