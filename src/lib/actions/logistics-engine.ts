"use server";

/**
 * Phase 6: Logistics Engine
 * 
 * Core business logic for shipment tracking, ETA management,
 * delay detection, and conflict creation.
 */

import db from "@/db/drizzle";
import {
    shipment, shipmentEvent, deliveryReceipt, deliveryItem,
    boqItem, purchaseOrder, milestone, conflictRecord, supplier, delivery
} from "@/db/schema";
import { eq, and, desc, sql, lt, gt, isNull, isNotNull } from "drizzle-orm";
import { getDelayThresholds, getVarianceThresholds } from "./config-engine";

// ============================================================================
// Types
// ============================================================================

export interface CreateShipmentInput {
    purchaseOrderId: string;
    supplierId: string;
    boqItemId?: string;
    trackingNumber?: string;
    carrier?: string;
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
    aftershipId?: string;
    actualDeliveryDate?: Date;
}

export interface ShipmentEventInput {
    shipmentId: string;
    eventType: "LOCATION_SCAN" | "ETA_UPDATE" | "EXCEPTION" | "DELIVERED" | "PICKUP" | "CUSTOMS" | "OTHER";
    eventTime: Date;
    location?: string;
    description?: string;
    rawApiData?: object;
    source?: "LOGISTICS_API" | "SUPPLIER" | "MANUAL";
}

export type ConflictSeverity = "LOW" | "MEDIUM" | "HIGH";

// ============================================================================
// Shipment CRUD Operations
// ============================================================================

/**
 * Create a new shipment record
 */
export async function createShipment(input: CreateShipmentInput) {
    try {
        // Get ROS date from BOQ item if linked
        let rosDate: Date | null = null;
        if (input.boqItemId) {
            const item = await db.query.boqItem.findFirst({
                where: eq(boqItem.id, input.boqItemId),
            });
            if (item?.rosDate) {
                rosDate = item.rosDate;
            }
        }

        const [newShipment] = await db.insert(shipment).values({
            purchaseOrderId: input.purchaseOrderId,
            supplierId: input.supplierId,
            boqItemId: input.boqItemId,
            trackingNumber: input.trackingNumber,
            carrier: input.carrier,
            carrierNormalized: input.carrier ? normalizeCarrierCode(input.carrier) : null,
            dispatchDate: input.dispatchDate,
            supplierAos: input.supplierAos,
            rosDate,
            destination: input.destination,
            originLocation: input.originLocation,
            declaredQty: input.declaredQty ? String(input.declaredQty) : null,
            unit: input.unit,
            packingListDocId: input.packingListDocId,
            cmrDocId: input.cmrDocId,
            status: input.dispatchDate ? "DISPATCHED" : "PENDING",
            etaConfidence: input.trackingNumber ? null : "MEDIUM", // Will be calculated
        }).returning();

        // Create initial event
        await createShipmentEvent({
            shipmentId: newShipment.id,
            eventType: input.dispatchDate ? "PICKUP" : "OTHER",
            eventTime: input.dispatchDate || new Date(),
            description: "Shipment created",
            source: "SUPPLIER",
        });

        // Check for delays if we have dates
        if (newShipment.id) {
            await checkAndCreateDelayConflict(newShipment.id);
        }

        return { success: true, shipment: newShipment };
    } catch (error) {
        console.error("[createShipment] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

/**
 * Update shipment with tracking or status changes
 */
export async function updateShipment(input: ShipmentUpdateInput) {
    try {
        const updateData: Partial<typeof shipment.$inferInsert> = {};

        if (input.trackingNumber !== undefined) updateData.trackingNumber = input.trackingNumber;
        if (input.carrier !== undefined) {
            updateData.carrier = input.carrier;
            updateData.carrierNormalized = normalizeCarrierCode(input.carrier);
        }
        if (input.logisticsEta !== undefined) updateData.logisticsEta = input.logisticsEta;
        if (input.status !== undefined) updateData.status = input.status;
        if (input.lastKnownLocation !== undefined) updateData.lastKnownLocation = input.lastKnownLocation;
        if (input.aftershipId !== undefined) {
            updateData.aftershipId = input.aftershipId;
            updateData.isTrackingLinked = true;
        }
        if (input.actualDeliveryDate !== undefined) updateData.actualDeliveryDate = input.actualDeliveryDate;

        updateData.lastApiSyncAt = new Date();

        const [updated] = await db.update(shipment)
            .set(updateData)
            .where(eq(shipment.id, input.shipmentId))
            .returning();

        if (!updated) {
            return { success: false, error: "Shipment not found" };
        }

        // Re-check for conflicts after update
        await checkAndCreateDelayConflict(input.shipmentId);

        return { success: true, shipment: updated };
    } catch (error) {
        console.error("[updateShipment] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

/**
 * Get shipment by ID with related data
 */
export async function getShipment(shipmentId: string) {
    return db.query.shipment.findFirst({
        where: eq(shipment.id, shipmentId),
        with: {
            purchaseOrder: true,
            supplier: true,
            boqItem: true,
            events: {
                orderBy: desc(shipmentEvent.eventTime),
            },
            deliveryReceipts: true,
        },
    });
}

/**
 * List shipments for a PO
 */
export async function listShipmentsByPO(purchaseOrderId: string) {
    return db.query.shipment.findMany({
        where: eq(shipment.purchaseOrderId, purchaseOrderId),
        with: {
            supplier: true,
            events: {
                orderBy: desc(shipmentEvent.eventTime),
                limit: 1, // Last event only for list view
            },
        },
        orderBy: desc(shipment.createdAt),
    });
}

// ============================================================================
// Shipment Events
// ============================================================================

/**
 * Create a shipment event (tracking update)
 */
export async function createShipmentEvent(input: ShipmentEventInput) {
    try {
        const [event] = await db.insert(shipmentEvent).values({
            shipmentId: input.shipmentId,
            eventType: input.eventType,
            eventTime: input.eventTime,
            location: input.location,
            description: input.description,
            rawApiData: input.rawApiData,
            source: input.source || "LOGISTICS_API",
        }).returning();

        // Update shipment's lastKnownLocation if this is a location scan
        if (input.eventType === "LOCATION_SCAN" && input.location) {
            await db.update(shipment)
                .set({ lastKnownLocation: input.location })
                .where(eq(shipment.id, input.shipmentId));
        }

        // If delivered, update shipment status
        if (input.eventType === "DELIVERED") {
            await db.update(shipment)
                .set({
                    status: "DELIVERED",
                    actualDeliveryDate: input.eventTime,
                })
                .where(eq(shipment.id, input.shipmentId));
        }

        return { success: true, event };
    } catch (error) {
        console.error("[createShipmentEvent] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

/**
 * Get timeline of events for a shipment
 */
export async function getShipmentTimeline(shipmentId: string) {
    return db.query.shipmentEvent.findMany({
        where: eq(shipmentEvent.shipmentId, shipmentId),
        orderBy: desc(shipmentEvent.eventTime),
    });
}

// ============================================================================
// ETA Confidence Engine
// ============================================================================

/**
 * Calculate ETA confidence score based on supplier history and available data
 */
export async function calculateEtaConfidence(shipmentId: string): Promise<"HIGH" | "MEDIUM" | "LOW"> {
    const ship = await db.query.shipment.findFirst({
        where: eq(shipment.id, shipmentId),
        with: { supplier: true },
    });

    if (!ship) return "LOW";

    // If we have tracking linked, higher confidence
    if (ship.isTrackingLinked && ship.logisticsEta) {
        return "HIGH";
    }

    // Check supplier accuracy history
    if (ship.supplierId) {
        const history = await db.query.supplierAccuracy.findFirst({
            where: eq(supplier.id, ship.supplierId),
        });

        if (history && Number(history.accuracyScore) >= 80) {
            return "MEDIUM";
        }
    }

    // Default to low without tracking
    return ship.supplierAos ? "MEDIUM" : "LOW";
}

/**
 * Update ETA confidence on a shipment
 */
export async function updateEtaConfidence(shipmentId: string) {
    const confidence = await calculateEtaConfidence(shipmentId);
    await db.update(shipment)
        .set({ etaConfidence: confidence })
        .where(eq(shipment.id, shipmentId));
    return confidence;
}

// ============================================================================
// Delay Detection Engine
// ============================================================================

/**
 * Check if shipment ETA exceeds ROS and create conflict if needed
 */
export async function checkAndCreateDelayConflict(shipmentId: string) {
    const ship = await db.query.shipment.findFirst({
        where: eq(shipment.id, shipmentId),
        with: {
            purchaseOrder: {
                with: { project: true }
            }
        },
    });

    if (!ship || !ship.rosDate) return null;

    // Get the organizational thresholds
    const thresholds = await getDelayThresholds(ship.purchaseOrder?.organizationId);

    // Determine effective ETA (logistics > supplier)
    const effectiveEta = ship.logisticsEta || ship.supplierAos;
    if (!effectiveEta) return null;

    // Calculate delay in days
    const rosTime = ship.rosDate.getTime();
    const etaTime = effectiveEta.getTime();
    const delayDays = Math.floor((etaTime - rosTime) / (1000 * 60 * 60 * 24));

    // No delay
    if (delayDays <= 0) {
        // Auto-resolve any existing delay conflicts
        await autoResolveDelayConflicts(shipmentId);
        return null;
    }

    // Determine severity
    let severity: ConflictSeverity = "LOW";
    if (delayDays > thresholds.highDelayDays) {
        severity = "HIGH";
    } else if (delayDays > thresholds.toleranceDays) {
        severity = "MEDIUM";
    } else {
        // Within tolerance, no conflict
        return null;
    }

    // Check if conflict already exists
    const existingConflict = await db.query.conflictRecord.findFirst({
        where: and(
            eq(conflictRecord.shipmentId, shipmentId),
            eq(conflictRecord.type, "DATE_VARIANCE"),
            eq(conflictRecord.state, "OPEN")
        ),
    });

    if (existingConflict) {
        // Update existing conflict
        await db.update(conflictRecord)
            .set({
                severity,
                deviationPercent: String(delayDays),
                description: `ETA delayed by ${delayDays} days (ROS: ${ship.rosDate.toDateString()}, ETA: ${effectiveEta.toDateString()})`,
                supplierValue: ship.supplierAos?.toISOString(),
                logisticsValue: ship.logisticsEta?.toISOString(),
            })
            .where(eq(conflictRecord.id, existingConflict.id));
        return existingConflict.id;
    }

    // Create new conflict
    const [newConflict] = await db.insert(conflictRecord).values({
        projectId: ship.purchaseOrder?.projectId!,
        purchaseOrderId: ship.purchaseOrderId,
        shipmentId: ship.id,
        type: "DATE_VARIANCE",
        state: "OPEN",
        severity,
        deviationPercent: String(delayDays),
        description: `ETA delayed by ${delayDays} days (ROS: ${ship.rosDate.toDateString()}, ETA: ${effectiveEta.toDateString()})`,
        supplierValue: ship.supplierAos?.toISOString(),
        logisticsValue: ship.logisticsEta?.toISOString(),
    }).returning();

    return newConflict.id;
}

/**
 * Auto-resolve delay conflicts when ETA is now on time
 */
async function autoResolveDelayConflicts(shipmentId: string) {
    await db.update(conflictRecord)
        .set({
            state: "RESOLVED",
            autoResolved: true,
            autoResolvedAt: new Date(),
            autoResolvedReason: "ETA now within acceptable range",
        })
        .where(and(
            eq(conflictRecord.shipmentId, shipmentId),
            eq(conflictRecord.type, "DATE_VARIANCE"),
            eq(conflictRecord.state, "OPEN")
        ));
}

// ============================================================================
// Carrier Normalization
// ============================================================================

const CARRIER_MAPPINGS: Record<string, string> = {
    "fedex": "fedex",
    "fed ex": "fedex",
    "federal express": "fedex",
    "ups": "ups",
    "united parcel service": "ups",
    "dhl": "dhl",
    "dhl express": "dhl-express",
    "usps": "usps",
    "maersk": "maersk",
    "msc": "msc",
    "hapag": "hapag-lloyd",
    "hapag-lloyd": "hapag-lloyd",
    "cosco": "cosco",
    "evergreen": "evergreen",
    "cma cgm": "cma-cgm",
    "one": "one",
    "yang ming": "yang-ming",
    "zim": "zim",
};

/**
 * Normalize carrier name to AfterShip-compatible slug
 */
function normalizeCarrierCode(carrier: string): string {
    const normalized = carrier.toLowerCase().trim();
    return CARRIER_MAPPINGS[normalized] || normalized.replace(/\s+/g, "-");
}

// ============================================================================
// ETA Conflict Detection (Supplier vs Logistics)
// ============================================================================

/**
 * Check if logistics ETA contradicts supplier AOS
 */
export async function checkEtaConflict(shipmentId: string) {
    const ship = await db.query.shipment.findFirst({
        where: eq(shipment.id, shipmentId),
        with: { purchaseOrder: true },
    });

    if (!ship || !ship.supplierAos || !ship.logisticsEta) return null;

    const thresholds = await getDelayThresholds(ship.purchaseOrder?.organizationId);

    // Calculate difference in days
    const diffMs = Math.abs(ship.logisticsEta.getTime() - ship.supplierAos.getTime());
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= thresholds.toleranceDays) {
        // Within tolerance - auto-resolve if conflict exists
        await db.update(conflictRecord)
            .set({
                state: "RESOLVED",
                autoResolved: true,
                autoResolvedAt: new Date(),
                autoResolvedReason: `Logistics ETA within ${thresholds.toleranceDays} days of supplier AOS`,
            })
            .where(and(
                eq(conflictRecord.shipmentId, shipmentId),
                eq(conflictRecord.type, "DATE_VARIANCE"),
                eq(conflictRecord.state, "OPEN"),
                isNotNull(conflictRecord.supplierValue),
                isNotNull(conflictRecord.logisticsValue)
            ));
        return null;
    }

    // Create conflict if outside tolerance
    const severity: ConflictSeverity = diffDays > thresholds.highDelayDays ? "HIGH" : "MEDIUM";

    // Check for existing conflict
    const existing = await db.query.conflictRecord.findFirst({
        where: and(
            eq(conflictRecord.shipmentId, shipmentId),
            eq(conflictRecord.type, "DATE_VARIANCE"),
            isNotNull(conflictRecord.supplierValue),
            isNotNull(conflictRecord.logisticsValue)
        ),
    });

    if (existing) {
        await db.update(conflictRecord)
            .set({
                severity,
                state: "OPEN",
                description: `Logistics ETA differs from supplier AOS by ${diffDays} days`,
                supplierValue: ship.supplierAos.toISOString(),
                logisticsValue: ship.logisticsEta.toISOString(),
            })
            .where(eq(conflictRecord.id, existing.id));
        return existing.id;
    }

    const [newConflict] = await db.insert(conflictRecord).values({
        projectId: ship.purchaseOrder?.projectId!,
        purchaseOrderId: ship.purchaseOrderId,
        shipmentId: ship.id,
        type: "DATE_VARIANCE",
        state: "OPEN",
        severity,
        description: `Logistics ETA differs from supplier AOS by ${diffDays} days`,
        supplierValue: ship.supplierAos.toISOString(),
        logisticsValue: ship.logisticsEta.toISOString(),
    }).returning();

    return newConflict.id;
}
