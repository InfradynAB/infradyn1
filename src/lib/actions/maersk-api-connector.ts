"use server";

/**
 * Phase 6: Maersk Ocean Track & Trace API Connector
 * 
 * Integrates with Maersk's Ocean Transport Document Tracking API
 * for container and vessel tracking with webhook-based updates.
 */

import db from "@/db/drizzle";
import { shipment, shipmentEvent } from "@/db/schema";
import { eq } from "drizzle-orm";

// Import utility functions and types for internal use
// Note: External consumers should import directly from "@/lib/utils/maersk-utils"
import {
    validateContainerNumber,
    mapDCSAStatus,
    mapDCSAEventType,
    type MaerskDCSACode,
    type MaerskEvent,
    type MaerskWebhookPayload,
} from "@/lib/utils/maersk-utils";

// ============================================================================
// Types
// ============================================================================

interface MaerskContainerTracking {
    containerNumber: string;
    equipmentTypeISOCode?: string;
    transportDocumentReference?: string; // Bill of Lading
    carrierBookingReference?: string;
    latestEvent?: MaerskEvent;
    events: MaerskEvent[];
    eta?: string;
    vessel?: {
        name: string;
        voyageNumber: string;
        IMONumber?: string;
    };
    location?: {
        latitude: number;
        longitude: number;
        city?: string;
        country?: string;
    };
    sealNumber?: string;
    grossWeight?: {
        value: number;
        unit: string;
    };
}

// Note: MaerskEvent and MaerskWebhookPayload are imported from @/lib/utils/maersk-utils

interface MaerskSubscriptionResponse {
    subscriptionID: string;
    callbackUrl: string;
    containerNumber: string;
    status: 'ACTIVE' | 'PENDING' | 'EXPIRED';
}

// ============================================================================
// Maersk API Configuration
// ============================================================================

const MAERSK_API_BASE = "https://api.maersk.com";
const TRACK_TRACE_ENDPOINT = "/ocean/transport-document-tracking/v2";

async function getMaerskCredentials() {
    return {
        consumerKey: process.env.MAERSK_CONSUMER_KEY || "",
        clientSecret: process.env.MAERSK_CLIENT_SECRET || "",
        businessCode: process.env.MAERSK_BUSINESS_CODE || "",
    };
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getMaerskAccessToken(): Promise<string | null> {
    // Check cache
    if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
        return cachedAccessToken.token;
    }

    const creds = await getMaerskCredentials();
    if (!creds.consumerKey || !creds.clientSecret) {
        console.warn("Maersk credentials not configured");
        return null;
    }

    try {
        const response = await fetch(`${MAERSK_API_BASE}/oauth2/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: creds.consumerKey,
                client_secret: creds.clientSecret,
            }),
        });

        if (!response.ok) {
            console.error("Failed to get Maersk access token:", await response.text());
            return null;
        }

        const data = await response.json();
        cachedAccessToken = {
            token: data.access_token,
            expiresAt: Date.now() + (data.expires_in * 1000) - 60000, // Buffer of 1 minute
        };

        return cachedAccessToken.token;
    } catch (error) {
        console.error("Error getting Maersk access token:", error);
        return null;
    }
}

async function makeMaerskRequest(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: object
): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const token = await getMaerskAccessToken();
    if (!token) {
        return { success: false, error: "Maersk API credentials not configured or invalid" };
    }

    const creds = await getMaerskCredentials();

    try {
        const response = await fetch(`${MAERSK_API_BASE}${endpoint}`, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Consumer-Key': creds.consumerKey,
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Maersk API error (${response.status}):`, errorText);
            return {
                success: false,
                error: `API error: ${response.status} - ${errorText}`
            };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error("Maersk API request failed:", error);
        return { success: false, error: String(error) };
    }
}

// Note: validateContainerNumber, validateISO6346CheckDigit moved to @/lib/utils/maersk-utils.ts

// ============================================================================
// Tracking Operations
// ============================================================================

/**
 * Subscribe to container tracking updates via Maersk webhooks
 */
export async function subscribeToContainer(
    containerNumber: string,
    shipmentId: string,
    callbackUrl?: string
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    const validation = validateContainerNumber(containerNumber);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const webhookUrl = callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/maersk`;

    const result = await makeMaerskRequest(
        `${TRACK_TRACE_ENDPOINT}/subscriptions`,
        'POST',
        {
            containerNumber: validation.normalized,
            callbackUrl: webhookUrl,
            events: ['ALL'], // Subscribe to all event types
            metadata: {
                shipmentId,
            },
        }
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const response = result.data as MaerskSubscriptionResponse;

    // Update shipment with subscription ID
    await db.update(shipment)
        .set({
            maerskSubscriptionId: response.subscriptionID,
            containerNumber: validation.normalized,
            isTrackingLinked: true,
            updatedAt: new Date(),
        })
        .where(eq(shipment.id, shipmentId));

    console.log(`✅ Maersk subscription created: ${response.subscriptionID}`);

    return { success: true, subscriptionId: response.subscriptionID };
}

/**
 * Get container tracking status from Maersk API
 */
export async function getContainerStatus(
    containerNumber: string
): Promise<{ success: boolean; tracking?: MaerskContainerTracking; error?: string }> {
    const validation = validateContainerNumber(containerNumber);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const result = await makeMaerskRequest(
        `${TRACK_TRACE_ENDPOINT}/containers/${validation.normalized}`,
        'GET'
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return { success: true, tracking: result.data as MaerskContainerTracking };
}

/**
 * Get container tracking by Bill of Lading
 */
export async function getContainerByBillOfLading(
    billOfLading: string
): Promise<{ success: boolean; tracking?: MaerskContainerTracking; error?: string }> {
    const result = await makeMaerskRequest(
        `${TRACK_TRACE_ENDPOINT}/documents/${encodeURIComponent(billOfLading)}`,
        'GET'
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return { success: true, tracking: result.data as MaerskContainerTracking };
}

// Note: Status mapping functions moved to @/lib/utils/maersk-utils.ts

// ============================================================================
// Sync Operations
// ============================================================================

/**
 * Sync tracking data from Maersk API to shipment
 */
export async function syncMaerskToShipment(
    shipmentId: string
): Promise<{ success: boolean; error?: string }> {
    const existingShipment = await db.query.shipment.findFirst({
        where: eq(shipment.id, shipmentId),
    });

    if (!existingShipment?.containerNumber) {
        return { success: false, error: "No container number linked" };
    }

    const result = await getContainerStatus(existingShipment.containerNumber);
    if (!result.success || !result.tracking) {
        return { success: false, error: result.error };
    }

    const tracking = result.tracking;

    // Update shipment with latest data
    await db.update(shipment)
        .set({
            status: tracking.latestEvent ? mapDCSAStatus(tracking.latestEvent.eventType) : existingShipment.status,
            vesselName: tracking.vessel?.name || existingShipment.vesselName,
            voyageNumber: tracking.vessel?.voyageNumber || existingShipment.voyageNumber,
            lastLatitude: tracking.location?.latitude?.toString(),
            lastLongitude: tracking.location?.longitude?.toString(),
            lastKnownLocation: tracking.location ?
                `${tracking.location.city || ''}, ${tracking.location.country || ''}`.trim() :
                existingShipment.lastKnownLocation,
            logisticsEta: tracking.eta ? new Date(tracking.eta) : existingShipment.logisticsEta,
            sealNumber: tracking.sealNumber || existingShipment.sealNumber,
            maerskWeight: tracking.grossWeight?.value?.toString(),
            lastApiSyncAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(shipment.id, shipmentId));

    // Create events for new tracking data
    if (tracking.events && tracking.events.length > 0) {
        for (const event of tracking.events) {
            await db.insert(shipmentEvent).values({
                shipmentId,
                eventType: mapDCSAEventType(event.eventType),
                eventTime: new Date(event.eventDateTime),
                location: event.location?.locationName,
                description: event.description || `${event.eventType} at ${event.location?.locationName || 'Unknown'}`,
                rawApiData: event as unknown as Record<string, unknown>,
                source: 'LOGISTICS_API',
            });
        }
    }

    return { success: true };
}

// ============================================================================
// Webhook Handler
// ============================================================================

/**
 * Process Maersk webhook payload
 */
export async function processMaerskWebhook(
    payload: MaerskWebhookPayload
): Promise<{ success: boolean; shipmentId?: string; error?: string }> {
    // Find shipment by subscription ID or container number
    const existingShipment = await db.query.shipment.findFirst({
        where: payload.subscriptionID
            ? eq(shipment.maerskSubscriptionId, payload.subscriptionID)
            : eq(shipment.containerNumber, payload.containerNumber),
    });

    if (!existingShipment) {
        console.warn(`No shipment found for container: ${payload.containerNumber}`);
        return { success: false, error: "Shipment not found" };
    }

    const event = payload.event;

    // Update shipment status
    const updateData: Partial<typeof shipment.$inferSelect> = {
        status: mapDCSAStatus(event.eventType),
        lastApiSyncAt: new Date(),
        updatedAt: new Date(),
    };

    // Update coordinates if available
    if (event.location?.latitude && event.location?.longitude) {
        updateData.lastLatitude = event.location.latitude.toString();
        updateData.lastLongitude = event.location.longitude.toString();
        updateData.lastKnownLocation = event.location.locationName;
    }

    // Update vessel info if available
    if (event.vessel) {
        updateData.vesselName = event.vessel.vesselName;
        updateData.voyageNumber = event.vessel.carrierVoyageNumber;
    }

    // Check for Vessel Delay (VSD)
    if (event.eventType === 'VSD') {
        updateData.isVesselDelayed = true;
    }

    await db.update(shipment)
        .set(updateData)
        .where(eq(shipment.id, existingShipment.id));

    // Create shipment event record
    await db.insert(shipmentEvent).values({
        shipmentId: existingShipment.id,
        eventType: mapDCSAEventType(event.eventType),
        eventTime: new Date(event.eventDateTime),
        location: event.location?.locationName,
        description: event.description || `${event.eventType}`,
        rawApiData: payload as unknown as Record<string, unknown>,
        source: 'LOGISTICS_API',
    });

    console.log(`✅ Processed Maersk webhook for ${payload.containerNumber}: ${event.eventType}`);

    return { success: true, shipmentId: existingShipment.id };
}

// ============================================================================
// Delay Detection
// ============================================================================

/**
 * Check if ETA has drifted significantly from ROS date
 * Creates HIGH severity conflict if drift > 48 hours
 */
export async function checkEtaDrift(
    shipmentId: string,
    newEta: Date
): Promise<{ driftHours: number; shouldAlert: boolean }> {
    const existingShipment = await db.query.shipment.findFirst({
        where: eq(shipment.id, shipmentId),
    });

    if (!existingShipment?.rosDate) {
        return { driftHours: 0, shouldAlert: false };
    }

    const rosDate = new Date(existingShipment.rosDate);
    const driftMs = newEta.getTime() - rosDate.getTime();
    const driftHours = driftMs / (1000 * 60 * 60);

    // Alert if ETA is more than 48 hours after ROS
    const shouldAlert = driftHours > 48;

    return { driftHours, shouldAlert };
}
