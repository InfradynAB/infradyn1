import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import {
    createShipment,
    updateShipment,
    listShipmentsByPO,
    getShipment,
    getShipmentTimeline
} from "@/lib/actions/logistics-engine";
import {
    linkTrackingToShipment,
    syncTrackingToShipment
} from "@/lib/actions/logistics-api-connector";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get("action");
        const shipmentId = searchParams.get("shipmentId");
        const purchaseOrderId = searchParams.get("purchaseOrderId");

        switch (action) {
            case "list": {
                if (!purchaseOrderId) {
                    return NextResponse.json({ error: "purchaseOrderId required" }, { status: 400 });
                }
                const shipments = await listShipmentsByPO(purchaseOrderId);
                return NextResponse.json({ shipments });
            }

            case "get": {
                if (!shipmentId) {
                    return NextResponse.json({ error: "shipmentId required" }, { status: 400 });
                }
                const shipment = await getShipment(shipmentId);
                if (!shipment) {
                    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
                }
                return NextResponse.json({ shipment });
            }

            case "timeline": {
                if (!shipmentId) {
                    return NextResponse.json({ error: "shipmentId required" }, { status: 400 });
                }
                const timeline = await getShipmentTimeline(shipmentId);
                return NextResponse.json({ timeline });
            }

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("[GET /api/shipments] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { action, ...data } = body;

        switch (action) {
            case "create": {
                const result = await createShipment({
                    purchaseOrderId: data.purchaseOrderId,
                    supplierId: data.supplierId,
                    boqItemId: data.boqItemId,
                    trackingNumber: data.trackingNumber,
                    carrier: data.carrier,
                    // Maersk container fields
                    containerNumber: data.containerNumber,
                    billOfLading: data.billOfLading,
                    supplierWeight: data.supplierWeight,
                    // Dates
                    dispatchDate: data.dispatchDate ? new Date(data.dispatchDate) : undefined,
                    supplierAos: data.supplierAos ? new Date(data.supplierAos) : undefined,
                    destination: data.destination,
                    originLocation: data.originLocation,
                    declaredQty: data.declaredQty,
                    unit: data.unit,
                    packingListDocId: data.packingListDocId,
                    cmrDocId: data.cmrDocId,
                });

                // Auto-subscribe to Maersk tracking if container number provided
                if (result.success && result.shipment?.id && data.containerNumber) {
                    try {
                        const { subscribeToContainer } = await import("@/lib/actions/maersk-api-connector");
                        await subscribeToContainer(data.containerNumber, result.shipment.id);
                    } catch (subError) {
                        console.warn("Maersk subscription failed (non-blocking):", subError);
                    }
                }

                return NextResponse.json(result);
            }

            case "update": {
                const result = await updateShipment({
                    shipmentId: data.shipmentId,
                    trackingNumber: data.trackingNumber,
                    carrier: data.carrier,
                    logisticsEta: data.logisticsEta ? new Date(data.logisticsEta) : undefined,
                    status: data.status,
                    lastKnownLocation: data.lastKnownLocation,
                    actualDeliveryDate: data.actualDeliveryDate ? new Date(data.actualDeliveryDate) : undefined,
                });
                return NextResponse.json(result);
            }

            case "linkTracking": {
                const result = await linkTrackingToShipment(
                    data.shipmentId,
                    data.trackingNumber,
                    data.carrier,
                    data.purchaseOrderId
                );
                return NextResponse.json(result);
            }

            case "syncTracking": {
                // Support both AfterShip (legacy) and Maersk sync
                if (data.containerNumber) {
                    const { syncMaerskToShipment } = await import("@/lib/actions/maersk-api-connector");
                    const result = await syncMaerskToShipment(data.shipmentId);
                    return NextResponse.json(result);
                } else {
                    const result = await syncTrackingToShipment(
                        data.shipmentId,
                        data.trackingNumber,
                        data.carrier
                    );
                    return NextResponse.json(result);
                }
            }

            case "subscribeContainer": {
                const { subscribeToContainer, validateContainerNumber } = await import("@/lib/actions/maersk-api-connector");

                const validation = validateContainerNumber(data.containerNumber);
                if (!validation.valid) {
                    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
                }

                const result = await subscribeToContainer(validation.normalized!, data.shipmentId);
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("[POST /api/shipments] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
