/**
 * DHL Utilities - Validation and Mapping Functions
 * 
 * These are pure utility functions that don't need "use server" directive.
 * Separated from dhl-api-connector.ts to avoid Server Actions errors.
 */

// ============================================================================
// Types
// ============================================================================

export type DHLStatusCode =
    | 'pre-transit'
    | 'transit'
    | 'out-for-delivery'
    | 'delivered'
    | 'failure'
    | 'unknown';

export type ShipmentStatus = "PENDING" | "DISPATCHED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "PARTIALLY_DELIVERED" | "FAILED" | "EXCEPTION";

export type ShipmentEventType =
    | "GATE_IN" | "LOADED" | "VESSEL_DEPARTURE" | "TRANSSHIPMENT"
    | "DISCHARGE" | "GATE_OUT" | "VESSEL_DELAY"
    | "PRE_TRANSIT" | "PICKUP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY"
    | "DELIVERED" | "EXCEPTION" | "HELD_CUSTOMS" | "RETURNED"
    | "ETA_UPDATE" | "LOCATION_SCAN" | "OTHER";

// DHL API Interfaces (exported for use by webhook handlers)
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

export interface DHLWebhookPayload {
    'event-type': 'shipment';
    shipments: DHLShipment[];
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
// Status Mapping
// ============================================================================

const DHL_STATUS_MAP: Record<DHLStatusCode, ShipmentStatus> = {
    'pre-transit': 'PENDING',
    'transit': 'IN_TRANSIT',
    'out-for-delivery': 'OUT_FOR_DELIVERY',
    'delivered': 'DELIVERED',
    'failure': 'EXCEPTION',
    'unknown': 'PENDING',
};

export function mapDHLStatus(statusCode: DHLStatusCode): ShipmentStatus {
    return DHL_STATUS_MAP[statusCode] || 'PENDING';
}

const DHL_EVENT_TYPE_MAP: Record<DHLStatusCode, ShipmentEventType> = {
    'pre-transit': 'PRE_TRANSIT',
    'transit': 'IN_TRANSIT',
    'out-for-delivery': 'OUT_FOR_DELIVERY',
    'delivered': 'DELIVERED',
    'failure': 'EXCEPTION',
    'unknown': 'OTHER',
};

export function mapDHLEventType(statusCode: DHLStatusCode): ShipmentEventType {
    return DHL_EVENT_TYPE_MAP[statusCode] || 'OTHER';
}
