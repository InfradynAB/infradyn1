"use server";

/**
 * Phase 6: Maersk Ocean Track & Trace API Connector
 * 
 * Integrates with Maersk's Ocean Transport Document Tracking API
 * for container and vessel tracking with webhook-based updates.
 */

import db from "@/db/drizzle";
import { shipment, shipmentEvent } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export interface MaerskContainerTracking {
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

export interface MaerskEvent {
    eventType: MaerskDCSACode;
    eventDateTime: string;
    eventClassifierCode?: string;
    transportCallID?: string;
    location?: {
        locationName: string;
        latitude?: number;
        longitude?: number;
        UNLocationCode?: string;
    };
    vessel?: {
        vesselName: string;
        vesselIMONumber?: string;
        carrierVoyageNumber?: string;
    };
    description?: string;
}

// DCSA Standard Codes (Digital Container Shipping Association)
export type MaerskDCSACode =
    | 'RECE' // Received
    | 'LOAD' // Loaded (LOD equivalent)
    | 'DISC' // Discharged (DCH equivalent)
    | 'GATE' // Gate In/Out
    | 'ARRI' // Arrival
    | 'DEPA' // Departure
    | 'TRAN' // Transshipment
    | 'DLVR' // Delivered (DLV equivalent)
    | 'VSD'  // Vessel Delay (custom)
    | 'OTHER';

export interface MaerskSubscriptionResponse {
    subscriptionID: string;
    callbackUrl: string;
    containerNumber: string;
    status: 'ACTIVE' | 'PENDING' | 'EXPIRED';
}

export interface MaerskWebhookPayload {
    subscriptionID: string;
    containerNumber: string;
    transportDocumentReference?: string;
    event: MaerskEvent;
    timestamp: string;
    signature?: string;
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

// ============================================================================
// Container Validation
// ============================================================================

/**
 * Validate container number format: 4 uppercase letters + 7 digits
 * Example: MSKU1234567
 */
export function validateContainerNumber(containerNumber: string): {
    valid: boolean;
    error?: string;
    normalized?: string;
} {
    if (!containerNumber) {
        return { valid: false, error: "Container number is required" };
    }

    // Normalize: uppercase and remove spaces/dashes
    const normalized = containerNumber.toUpperCase().replace(/[\s-]/g, '');

    // Check format: 4 letters + 7 digits
    const regex = /^[A-Z]{4}[0-9]{7}$/;
    if (!regex.test(normalized)) {
        return {
            valid: false,
            error: "Invalid format. Must be 4 letters + 7 digits (e.g., MSKU1234567)"
        };
    }

    // ISO 6346 check digit validation (optional but recommended)
    const checkDigitValid = validateISO6346CheckDigit(normalized);
    if (!checkDigitValid) {
        return {
            valid: false,
            error: "Invalid check digit. Please verify the container number."
        };
    }

    return { valid: true, normalized };
}

/**
 * ISO 6346 check digit validation
 */
function validateISO6346CheckDigit(containerNumber: string): boolean {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letterValues: Record<string, number> = {};
    let value = 10;
    for (const letter of letters) {
        letterValues[letter] = value;
        value++;
        // Skip multiples of 11 as per ISO 6346
        if (value % 11 === 0) value++;
    }

    let sum = 0;
    for (let i = 0; i < 10; i++) {
        const char = containerNumber[i];
        const charValue = i < 4 ? letterValues[char] : parseInt(char, 10);
        sum += charValue * Math.pow(2, i);
    }

    const checkDigit = sum % 11;
    const expectedCheckDigit = checkDigit === 10 ? 0 : checkDigit;
    const actualCheckDigit = parseInt(containerNumber[10], 10);

    return expectedCheckDigit === actualCheckDigit;
}

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

// ============================================================================
// Status Mapping (DCSA → Internal)
// ============================================================================

const DCSA_STATUS_MAP: Record<MaerskDCSACode, typeof shipment.$inferSelect.status> = {
    'RECE': 'PENDING',
    'LOAD': 'IN_TRANSIT',
    'DISC': 'IN_TRANSIT', // Discharged but not delivered yet
    'GATE': 'IN_TRANSIT',
    'ARRI': 'IN_TRANSIT',
    'DEPA': 'IN_TRANSIT',
    'TRAN': 'IN_TRANSIT',
    'DLVR': 'DELIVERED',
    'VSD': 'EXCEPTION', // Vessel Delay
    'OTHER': 'PENDING',
};

export function mapDCSAStatus(
    code: MaerskDCSACode
): "PENDING" | "DISPATCHED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "PARTIALLY_DELIVERED" | "FAILED" | "EXCEPTION" {
    return DCSA_STATUS_MAP[code] || 'PENDING';
}

const DCSA_EVENT_TYPE_MAP: Record<MaerskDCSACode, typeof shipmentEvent.$inferSelect.eventType> = {
    'RECE': 'GATE_IN',
    'LOAD': 'LOADED',
    'DISC': 'DISCHARGE',
    'GATE': 'GATE_OUT',
    'ARRI': 'LOCATION_SCAN',
    'DEPA': 'VESSEL_DEPARTURE',
    'TRAN': 'TRANSSHIPMENT',
    'DLVR': 'DELIVERED',
    'VSD': 'VESSEL_DELAY',
    'OTHER': 'OTHER',
};

export function mapDCSAEventType(
    code: MaerskDCSACode
): typeof shipmentEvent.$inferSelect.eventType {
    return DCSA_EVENT_TYPE_MAP[code] || 'OTHER';
}

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
