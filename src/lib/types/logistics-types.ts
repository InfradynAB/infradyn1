/**
 * Logistics Types - Shared interfaces for logistics operations
 *
 * These are pure type definitions that don't need "use server" directive.
 * Separated from logistics-engine.ts to avoid Server Actions errors.
 */

// ============================================================================
// Shipment Input Types
// ============================================================================

export interface CreateShipmentInput {
    purchaseOrderId: string;
    supplierId: string;
    boqItemId?: string;
    trackingNumber?: string;
    carrier?: string;
    // Multi-provider support
    provider?: 'DHL_EXPRESS' | 'DHL_FREIGHT' | 'MAERSK' | 'OTHER';
    // Maersk container tracking
    containerNumber?: string;
    billOfLading?: string;
    // DHL tracking
    waybillNumber?: string;
    dhlService?: 'express' | 'freight';
    // Common fields
    supplierWeight?: number;
    // Dates
    dispatchDate?: Date;
    supplierAos?: Date; // Supplier-declared Arrival on Site
    destination?: string;
    originLocation?: string;
    declaredQty?: number;
    unit?: string;
    packingListDocId?: string;
    cmrDocId?: string;
}

export interface ShipmentUpdateInput {
    shipmentId: string;
    trackingNumber?: string;
    carrier?: string;
    logisticsEta?: Date;
    status?: "PENDING" | "DISPATCHED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "PARTIALLY_DELIVERED" | "FAILED" | "EXCEPTION";
    lastKnownLocation?: string;
    maerskSubscriptionId?: string;
    actualDeliveryDate?: Date;
}

export interface ShipmentEventInput {
    shipmentId: string;
    eventType:
    // Maersk DCSA codes
    | "GATE_IN" | "LOADED" | "VESSEL_DEPARTURE" | "TRANSSHIPMENT"
    | "DISCHARGE" | "GATE_OUT" | "VESSEL_DELAY"
    // DHL status codes
    | "PRE_TRANSIT" | "PICKUP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY"
    | "DELIVERED" | "EXCEPTION" | "HELD_CUSTOMS" | "RETURNED"
    // Common
    | "ETA_UPDATE" | "LOCATION_SCAN" | "OTHER";
    eventTime: Date;
    location?: string;
    description?: string;
    rawApiData?: object;
    source?: "LOGISTICS_API" | "SUPPLIER" | "MANUAL";
}

export type ConflictSeverity = "LOW" | "MEDIUM" | "HIGH";

// Only Maersk and DHL tracking are supported
