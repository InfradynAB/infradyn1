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

// ============================================================================
// Types
// ============================================================================

export interface DHLShipment {
    id: string;
    service: 'express' | 'freight';
    origin: {
        address: {
            addressLocality: string;
            countryCode: string;
        };
    };
    destination: {
        address: {
            addressLocality: string;
            countryCode: string;
        };
    };
    status: DHLStatus;
    estimatedTimeOfDelivery?: string;
    events: DHLEvent[];
    details?: {
        proofOfDelivery?: {
            signed: boolean;
            signatureUrl?: string;
            signedBy?: string;
            timestamp?: string;
        };
        weight?: {
            value: number;
            unitText: string;
        };
    };
}

export interface DHLStatus {
    timestamp: string;
    location?: {
        address: {
            addressLocality: string;
        };
    };
    statusCode: DHLStatusCode;
    description: string;
}

export interface DHLEvent {
    timestamp: string;
    location?: {
        address: {
            addressLocality: string;
        };
    };
    statusCode: DHLStatusCode;
    description: string;
}

export type DHLStatusCode =
    | 'pre-transit'
    | 'transit'
    | 'out-for-delivery'
    | 'delivered'
    | 'failure'
    | 'unknown';

export interface DHLWebhookPayload {
    'event-type': 'shipment';
    shipments: DHLShipment[];
}

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
            return {
                success: false,
                error: `API error: ${response.status}`
            };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error("DHL API request failed:", error);
        return { success: false, error: String(error) };
    }
}

// ============================================================================
// Waybill Validation
// ============================================================================

/**
 * Validate DHL waybill number and determine service type
 * Express: 10 digits
 * Freight: Alphanumeric (various formats)
 */
export function validateWaybillNumber(waybill: string): {
    valid: boolean;
    service?: 'express' | 'freight';
    error?: string;
    normalized?: string;
} {
    if (!waybill) {
        return { valid: false, error: "Waybill number is required" };
    }

    // Normalize: uppercase and remove spaces/dashes
    const normalized = waybill.toUpperCase().replace(/[\s-]/g, '');

    // DHL Express: 10 digits
    const expressRegex = /^\d{10}$/;
    if (expressRegex.test(normalized)) {
        return { valid: true, service: 'express', normalized };
    }

    // DHL Freight: 7-10 alphanumeric characters
    const freightRegex = /^[A-Z0-9]{7,15}$/;
    if (freightRegex.test(normalized)) {
        return { valid: true, service: 'freight', normalized };
    }

    return {
        valid: false,
        error: "Invalid format. Express: 10 digits. Freight: 7-15 alphanumeric."
    };
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

// ============================================================================
// Status Mapping
// ============================================================================

const DHL_STATUS_MAP: Record<DHLStatusCode, typeof shipment.$inferSelect.status> = {
    'pre-transit': 'PENDING',
    'transit': 'IN_TRANSIT',
    'out-for-delivery': 'OUT_FOR_DELIVERY',
    'delivered': 'DELIVERED',
    'failure': 'EXCEPTION',
    'unknown': 'PENDING',
};

export function mapDHLStatus(
    statusCode: DHLStatusCode
): "PENDING" | "DISPATCHED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "PARTIALLY_DELIVERED" | "FAILED" | "EXCEPTION" {
    return DHL_STATUS_MAP[statusCode] || 'PENDING';
}

const DHL_EVENT_TYPE_MAP: Record<DHLStatusCode, typeof shipmentEvent.$inferSelect.eventType> = {
    'pre-transit': 'PRE_TRANSIT',
    'transit': 'IN_TRANSIT',
    'out-for-delivery': 'OUT_FOR_DELIVERY',
    'delivered': 'DELIVERED',
    'failure': 'EXCEPTION',
    'unknown': 'OTHER',
};

export function mapDHLEventType(
    statusCode: DHLStatusCode
): typeof shipmentEvent.$inferSelect.eventType {
    return DHL_EVENT_TYPE_MAP[statusCode] || 'OTHER';
}

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
