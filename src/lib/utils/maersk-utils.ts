/**
 * Maersk Utilities - Validation and Mapping Functions
 * 
 * These are pure utility functions that don't need "use server" directive.
 * Separated from maersk-api-connector.ts to avoid Server Actions errors.
 */

// ============================================================================
// Types
// ============================================================================

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

export type ShipmentStatus = "PENDING" | "DISPATCHED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "PARTIALLY_DELIVERED" | "FAILED" | "EXCEPTION";

export type ShipmentEventType =
    | "GATE_IN" | "LOADED" | "VESSEL_DEPARTURE" | "TRANSSHIPMENT"
    | "DISCHARGE" | "GATE_OUT" | "VESSEL_DELAY"
    | "PRE_TRANSIT" | "PICKUP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY"
    | "DELIVERED" | "EXCEPTION" | "HELD_CUSTOMS" | "RETURNED"
    | "ETA_UPDATE" | "LOCATION_SCAN" | "OTHER";

// Maersk API Interfaces (exported for use by webhook handlers)
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

export interface MaerskWebhookPayload {
    subscriptionID: string;
    containerNumber: string;
    transportDocumentReference?: string;
    event: MaerskEvent;
    timestamp: string;
    signature?: string;
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
// Status Mapping (DCSA → Internal)
// ============================================================================

const DCSA_STATUS_MAP: Record<MaerskDCSACode, ShipmentStatus> = {
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

export function mapDCSAStatus(code: MaerskDCSACode): ShipmentStatus {
    return DCSA_STATUS_MAP[code] || 'PENDING';
}

const DCSA_EVENT_TYPE_MAP: Record<MaerskDCSACode, ShipmentEventType> = {
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

export function mapDCSAEventType(code: MaerskDCSACode): ShipmentEventType {
    return DCSA_EVENT_TYPE_MAP[code] || 'OTHER';
}
