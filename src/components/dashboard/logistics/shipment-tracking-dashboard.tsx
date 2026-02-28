"use client";

/**
 * Phase 6: Shipment Tracking Dashboard
 * 
 * Overview of all active shipments for PM visibility.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
    Truck, Package, Clock, Check, AlertTriangle,
    MapPin, RefreshCw, ArrowRight
} from "lucide-react";
import { format, formatDistanceToNow, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

interface Shipment {
    id: string;
    trackingNumber?: string | null;
    carrier?: string | null;
    status: string;
    supplierAos?: string | Date | null;
    logisticsEta?: string | Date | null;
    rosDate?: string | Date | null;
    actualDeliveryDate?: string | Date | null;
    etaConfidence?: string | null;
    lastKnownLocation?: string | null;
    originLocation?: string | null;
    destination?: string | null;
    declaredQty?: string | null;
    unit?: string | null;
    purchaseOrder?: {
        poNumber: string;
    };
    supplier?: {
        name: string;
    };
}

interface ShipmentTrackingDashboardProps {
    projectId?: string;
    purchaseOrderId?: string;
}

const STATUS_ORDER = ["PENDING", "DISPATCHED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

const STATUS_CONFIG: Record<string, { label: string; color: string; step: number }> = {
    PENDING: { label: "Pending", color: "bg-gray-400", step: 0 },
    DISPATCHED: { label: "Dispatched", color: "bg-blue-500", step: 1 },
    IN_TRANSIT: { label: "In Transit", color: "bg-yellow-500", step: 2 },
    OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "bg-purple-500", step: 3 },
    DELIVERED: { label: "Delivered", color: "bg-green-500", step: 4 },
    PARTIALLY_DELIVERED: { label: "Partial", color: "bg-orange-500", step: 4 },
    FAILED: { label: "Failed", color: "bg-red-500", step: -1 },
    EXCEPTION: { label: "Exception", color: "bg-red-500", step: -1 },
};

export function ShipmentTrackingDashboard({
    projectId,
    purchaseOrderId,
}: ShipmentTrackingDashboardProps) {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchShipments = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (purchaseOrderId) params.set("purchaseOrderId", purchaseOrderId);
            params.set("action", "list");

            const response = await fetch(`/api/shipments?${params}`);
            const data = await response.json();
            if (data.shipments) {
                setShipments(data.shipments);
            }
        } catch (error) {
            console.error("Failed to fetch shipments:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (purchaseOrderId) {
            fetchShipments();
        }
    }, [purchaseOrderId]);

    const parseDate = (date: Date | string | null | undefined): Date | null => {
        if (!date) return null;
        return typeof date === "string" ? new Date(date) : date;
    };

    // Summary stats
    const stats = {
        total: shipments.length,
        inTransit: shipments.filter((s) => s.status === "IN_TRANSIT").length,
        delivered: shipments.filter((s) => s.status === "DELIVERED" || s.status === "PARTIALLY_DELIVERED").length,
        delayed: shipments.filter((s) => {
            const eta = parseDate(s.logisticsEta) || parseDate(s.supplierAos);
            const ros = parseDate(s.rosDate);
            return eta && ros && isAfter(eta, ros) && s.status !== "DELIVERED";
        }).length,
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Shipment Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-24 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            Shipment Tracking
                        </CardTitle>
                        <CardDescription>
                            {stats.total} shipment{stats.total !== 1 ? "s" : ""}
                            {stats.delayed > 0 && (
                                <span className="text-red-500 ml-2">
                                    ({stats.delayed} delayed)
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchShipments}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh
                    </Button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">{stats.inTransit}</p>
                        <p className="text-xs text-muted-foreground">In Transit</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
                        <p className="text-xs text-muted-foreground">Delivered</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{stats.delayed}</p>
                        <p className="text-xs text-muted-foreground">Delayed</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {shipments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No shipments found</p>
                        <p className="text-sm">Shipments will appear here once created</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {shipments.map((shipment) => {
                            const statusConfig = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.PENDING;
                            const effectiveEta = parseDate(shipment.logisticsEta) || parseDate(shipment.supplierAos);
                            const rosDate = parseDate(shipment.rosDate);
                            const isDelayed = effectiveEta && rosDate && isAfter(effectiveEta, rosDate) && shipment.status !== "DELIVERED";
                            const progressPercent = ((statusConfig.step + 1) / 5) * 100;

                            return (
                                <div
                                    key={shipment.id}
                                    className={cn(
                                        "border rounded-lg p-4 space-y-3",
                                        isDelayed && "border-red-300 bg-red-50/50"
                                    )}
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Truck className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">
                                                    {shipment.carrier?.toUpperCase() || "Shipment"}
                                                </p>
                                                {shipment.trackingNumber && (
                                                    <p className="text-sm text-muted-foreground font-sans tabular-nums">
                                                        {shipment.trackingNumber}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Badge className={cn("text-white", statusConfig.color)}>
                                            {statusConfig.label}
                                        </Badge>
                                    </div>

                                    {/* Progress */}
                                    {statusConfig.step >= 0 && (
                                        <div className="space-y-1">
                                            <Progress value={progressPercent} className="h-2" />
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                {STATUS_ORDER.map((status, idx) => (
                                                    <span
                                                        key={status}
                                                        className={cn(
                                                            idx <= statusConfig.step && "text-primary font-medium"
                                                        )}
                                                    >
                                                        {STATUS_CONFIG[status].label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Details */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="h-4 w-4" />
                                            <span>
                                                {shipment.originLocation || "—"}
                                                <ArrowRight className="h-3 w-3 inline mx-1" />
                                                {shipment.destination || "—"}
                                            </span>
                                        </div>

                                        {effectiveEta && (
                                            <div className={cn(
                                                "flex items-center gap-2",
                                                isDelayed ? "text-red-600" : "text-muted-foreground"
                                            )}>
                                                <Clock className="h-4 w-4" />
                                                <span>
                                                    ETA: {format(effectiveEta, "MMM d, yyyy")}
                                                    {isDelayed && (
                                                        <AlertTriangle className="h-3 w-3 inline ml-1" />
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Last location */}
                                    {shipment.lastKnownLocation && (
                                        <p className="text-xs text-muted-foreground">
                                            Last seen: {shipment.lastKnownLocation}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
