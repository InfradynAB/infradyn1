"use client";

/**
 * Phase 6: Shipment Status Card
 * 
 * Displays shipment summary with status, tracking, and ETA information.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Package, Truck, MapPin, Calendar, Clock,
    ExternalLink, AlertTriangle, Check, Info
} from "lucide-react";
import { format, formatDistanceToNow, isAfter, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

interface ShipmentStatusCardProps {
    shipment: {
        id: string;
        trackingNumber?: string | null;
        carrier?: string | null;
        status: string;
        dispatchDate?: Date | string | null;
        supplierAos?: Date | string | null;
        logisticsEta?: Date | string | null;
        actualDeliveryDate?: Date | string | null;
        etaConfidence?: string | null;
        lastKnownLocation?: string | null;
        originLocation?: string | null;
        destination?: string | null;
        rosDate?: Date | string | null;
        declaredQty?: string | null;
        unit?: string | null;
    };
    showActions?: boolean;
    onViewTimeline?: (shipmentId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: "Pending", color: "bg-gray-500", icon: <Clock className="h-3 w-3" /> },
    DISPATCHED: { label: "Dispatched", color: "bg-blue-500", icon: <Package className="h-3 w-3" /> },
    IN_TRANSIT: { label: "In Transit", color: "bg-yellow-500", icon: <Truck className="h-3 w-3" /> },
    OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "bg-purple-500", icon: <Truck className="h-3 w-3" /> },
    DELIVERED: { label: "Delivered", color: "bg-green-500", icon: <Check className="h-3 w-3" /> },
    PARTIALLY_DELIVERED: { label: "Partial", color: "bg-orange-500", icon: <AlertTriangle className="h-3 w-3" /> },
    FAILED: { label: "Failed", color: "bg-red-500", icon: <AlertTriangle className="h-3 w-3" /> },
    EXCEPTION: { label: "Exception", color: "bg-red-500", icon: <AlertTriangle className="h-3 w-3" /> },
};

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string }> = {
    HIGH: { label: "High", color: "text-green-600" },
    MEDIUM: { label: "Medium", color: "text-yellow-600" },
    LOW: { label: "Low", color: "text-red-600" },
};

export function ShipmentStatusCard({
    shipment,
    showActions = true,
    onViewTimeline,
}: ShipmentStatusCardProps) {
    const statusConfig = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.PENDING;
    const confidenceConfig = shipment.etaConfidence ? CONFIDENCE_CONFIG[shipment.etaConfidence] : null;

    const parseDate = (date: Date | string | null | undefined): Date | null => {
        if (!date) return null;
        return typeof date === "string" ? new Date(date) : date;
    };

    const effectiveEta = parseDate(shipment.logisticsEta) || parseDate(shipment.supplierAos);
    const rosDate = parseDate(shipment.rosDate);
    const actualDelivery = parseDate(shipment.actualDeliveryDate);
    const dispatchDate = parseDate(shipment.dispatchDate);

    const isDelayed = effectiveEta && rosDate && isAfter(effectiveEta, rosDate);
    const isDelivered = shipment.status === "DELIVERED" || shipment.status === "PARTIALLY_DELIVERED";

    return (
        <Card className={cn(
            "transition-all hover:shadow-md",
            isDelayed && !isDelivered && "border-red-300 bg-red-50/50"
        )}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        {shipment.carrier ? shipment.carrier.toUpperCase() : "Shipment"}
                    </CardTitle>
                    <Badge className={cn("text-white", statusConfig.color)}>
                        <span className="flex items-center gap-1">
                            {statusConfig.icon}
                            {statusConfig.label}
                        </span>
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Tracking Number */}
                {shipment.trackingNumber && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Tracking:</span>
                        <span className="font-mono font-medium">{shipment.trackingNumber}</span>
                    </div>
                )}

                {/* ETA Section */}
                <div className="space-y-2">
                    {effectiveEta && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Expected:
                            </span>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "font-medium",
                                    isDelayed && !isDelivered && "text-red-600"
                                )}>
                                    {format(effectiveEta, "MMM d, yyyy")}
                                </span>
                                {confidenceConfig && (
                                    <span className={cn("text-xs", confidenceConfig.color)}>
                                        ({confidenceConfig.label})
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {rosDate && !isDelivered && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Required:</span>
                            <span className="font-medium">{format(rosDate, "MMM d, yyyy")}</span>
                        </div>
                    )}

                    {actualDelivery && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Check className="h-3 w-3 text-green-600" />
                                Delivered:
                            </span>
                            <span className="font-medium text-green-600">
                                {format(actualDelivery, "MMM d, yyyy")}
                            </span>
                        </div>
                    )}

                    {isDelayed && !isDelivered && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-100 px-2 py-1 rounded">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Delayed - ETA is after required date</span>
                        </div>
                    )}
                </div>

                {/* Location */}
                {shipment.lastKnownLocation && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Last Location:
                        </span>
                        <span className="font-medium">{shipment.lastKnownLocation}</span>
                    </div>
                )}

                {/* Route */}
                {(shipment.originLocation || shipment.destination) && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Route:</span>
                        <span>
                            {shipment.originLocation || "—"} → {shipment.destination || "—"}
                        </span>
                    </div>
                )}

                {/* Quantity */}
                {shipment.declaredQty && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="font-medium">
                            {shipment.declaredQty} {shipment.unit || "units"}
                        </span>
                    </div>
                )}

                {/* Actions */}
                {showActions && (
                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => onViewTimeline?.(shipment.id)}
                        >
                            View Timeline
                        </Button>
                        {shipment.trackingNumber && (
                            <Button
                                variant="ghost"
                                size="sm"
                                asChild
                            >
                                <a
                                    href={`https://track.aftership.com/${shipment.trackingNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
