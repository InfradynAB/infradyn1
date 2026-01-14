"use client";

/**
 * Phase 6: Shipment Timeline
 * 
 * Visual timeline showing shipment events and tracking history.
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Package, Truck, MapPin, Clock, Check,
    AlertTriangle, Plane, Ship, RefreshCw
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ShipmentEvent {
    id: string;
    eventType: string;
    eventTime: string | Date;
    location?: string | null;
    description?: string | null;
    source?: string | null;
}

interface ShipmentTimelineProps {
    shipmentId: string;
    shipment?: {
        trackingNumber?: string | null;
        carrier?: string | null;
        status?: string | null;
    };
    showSyncButton?: boolean;
}

const EVENT_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
    PICKUP: { icon: <Package className="h-4 w-4" />, color: "bg-blue-500" },
    LOCATION_SCAN: { icon: <MapPin className="h-4 w-4" />, color: "bg-gray-500" },
    IN_TRANSIT: { icon: <Truck className="h-4 w-4" />, color: "bg-yellow-500" },
    CUSTOMS: { icon: <Clock className="h-4 w-4" />, color: "bg-purple-500" },
    ETA_UPDATE: { icon: <Clock className="h-4 w-4" />, color: "bg-orange-500" },
    DELIVERED: { icon: <Check className="h-4 w-4" />, color: "bg-green-500" },
    EXCEPTION: { icon: <AlertTriangle className="h-4 w-4" />, color: "bg-red-500" },
    OTHER: { icon: <Package className="h-4 w-4" />, color: "bg-gray-400" },
};

export function ShipmentTimeline({
    shipmentId,
    shipment,
    showSyncButton = true,
}: ShipmentTimelineProps) {
    const [events, setEvents] = useState<ShipmentEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const fetchTimeline = async () => {
        try {
            const response = await fetch(
                `/api/shipments?action=timeline&shipmentId=${shipmentId}`
            );
            const data = await response.json();
            if (data.timeline) {
                setEvents(data.timeline);
            }
        } catch (error) {
            console.error("Failed to fetch timeline:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!shipment?.trackingNumber || !shipment?.carrier) return;

        setSyncing(true);
        try {
            const response = await fetch("/api/shipments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "syncTracking",
                    shipmentId,
                    trackingNumber: shipment.trackingNumber,
                    carrier: shipment.carrier,
                }),
            });
            const data = await response.json();
            if (data.success) {
                await fetchTimeline();
            }
        } catch (error) {
            console.error("Failed to sync:", error);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchTimeline();
    }, [shipmentId]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Tracking History
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-4">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Tracking History
                    </CardTitle>
                    {showSyncButton && shipment?.trackingNumber && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSync}
                            disabled={syncing}
                        >
                            <RefreshCw className={cn("h-4 w-4 mr-1", syncing && "animate-spin")} />
                            {syncing ? "Syncing..." : "Refresh"}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {events.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>No tracking events yet</p>
                        <p className="text-sm">
                            Events will appear here once the shipment is in transit
                        </p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />

                        <div className="space-y-6">
                            {events.map((event, index) => {
                                const config = EVENT_CONFIG[event.eventType] || EVENT_CONFIG.OTHER;
                                const eventTime = typeof event.eventTime === "string"
                                    ? new Date(event.eventTime)
                                    : event.eventTime;

                                return (
                                    <div key={event.id} className="relative flex gap-4 pl-2">
                                        {/* Icon */}
                                        <div className={cn(
                                            "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-white",
                                            config.color
                                        )}>
                                            {config.icon}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 pb-2">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium text-sm">
                                                    {event.description || event.eventType.replace(/_/g, " ")}
                                                </p>
                                                <Badge variant="outline" className="text-xs">
                                                    {event.source === "LOGISTICS_API" ? "API" : event.source || "Manual"}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                                <span>
                                                    {format(eventTime, "MMM d, h:mm a")}
                                                </span>
                                                <span>
                                                    ({formatDistanceToNow(eventTime, { addSuffix: true })})
                                                </span>
                                                {event.location && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {event.location}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
