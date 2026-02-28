"use client";

/**
 * Phase 6: Maersk Edition - Container Map Component
 * 
 * Displays vessel/container location on a map using coordinates
 * from Maersk tracking data.
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Ship, Navigation, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContainerMapProps {
    shipmentId: string;
    containerNumber?: string;
    vesselName?: string;
    voyageNumber?: string;
    latitude?: number | string;
    longitude?: number | string;
    lastKnownLocation?: string;
    lastSyncAt?: string | Date;
    status?: string;
    isDelayed?: boolean;
    className?: string;
}

// Simple map visualization using static map image (Mapbox Static API)
// For production, consider using react-map-gl or google-maps-react
export function ContainerMap({
    shipmentId,
    containerNumber,
    vesselName,
    voyageNumber,
    latitude,
    longitude,
    lastKnownLocation,
    lastSyncAt,
    status,
    isDelayed,
    className,
}: ContainerMapProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [mapError, setMapError] = useState(false);

    const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
    const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
    const hasCoordinates = lat && lng && !isNaN(lat) && !isNaN(lng);

    // Generate static map URL (using OpenStreetMap/Leaflet-based tile server)
    const getMapImageUrl = () => {
        if (!hasCoordinates) return null;

        // Using mapbox static API format (requires token)
        // Alternative: Use OpenStreetMap static tiles
        const zoom = 5;
        const width = 600;
        const height = 300;

        // For now, use a placeholder or OpenStreetMap embed
        // In production, configure with Mapbox access token
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

        if (mapboxToken) {
            return `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+0066cc(${lng},${lat})/${lng},${lat},${zoom}/${width}x${height}@2x?access_token=${mapboxToken}`;
        }

        // Fallback to OpenStreetMap embed URL for iframe
        return `https://www.openstreetmap.org/export/embed.html?bbox=${lng! - 5}%2C${lat! - 3}%2C${lng! + 5}%2C${lat! + 3}&layer=mapnik&marker=${lat}%2C${lng}`;
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const response = await fetch("/api/shipments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "syncTracking",
                    shipmentId,
                }),
            });

            if (response.ok) {
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to refresh tracking:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const statusColors: Record<string, string> = {
        PENDING: "bg-gray-100 text-gray-700",
        DISPATCHED: "bg-blue-100 text-blue-700",
        IN_TRANSIT: "bg-emerald-100 text-emerald-700",
        OUT_FOR_DELIVERY: "bg-amber-100 text-amber-700",
        DELIVERED: "bg-green-100 text-green-700",
        EXCEPTION: "bg-red-100 text-red-700",
        FAILED: "bg-red-100 text-red-700",
    };

    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Ship className="h-5 w-5 text-blue-600" />
                        Container Location
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {status && (
                            <Badge className={cn(statusColors[status] || statusColors.PENDING)}>
                                {status.replace('_', ' ')}
                            </Badge>
                        )}
                        {isDelayed && (
                            <Badge variant="destructive" className="animate-pulse">
                                DELAYED
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* Map Display */}
                <div className="relative h-[250px] bg-slate-100">
                    {hasCoordinates ? (
                        <div className="relative w-full h-full">
                            {/* OpenStreetMap Embed */}
                            <iframe
                                src={getMapImageUrl() || ''}
                                className="w-full h-full border-0"
                                style={{ border: 0 }}
                                loading="lazy"
                                onError={() => setMapError(true)}
                            />

                            {/* Overlay with vessel info */}
                            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-sm">
                                <div className="flex items-center gap-2 text-sm">
                                    <Navigation className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium">{lat?.toFixed(4)}, {lng?.toFixed(4)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <MapPin className="h-12 w-12 opacity-20 mb-2" />
                            <p className="text-sm">No location data available</p>
                            <p className="text-xs">Coordinates will appear when container is tracked</p>
                        </div>
                    )}
                </div>

                {/* Container Details */}
                <div className="p-4 border-t bg-muted/30">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {containerNumber && (
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Container</p>
                                <p className="font-sans tabular-nums font-medium">{containerNumber}</p>
                            </div>
                        )}
                        {vesselName && (
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Vessel</p>
                                <p className="font-medium">{vesselName}</p>
                                {voyageNumber && (
                                    <p className="text-xs text-muted-foreground">Voyage: {voyageNumber}</p>
                                )}
                            </div>
                        )}
                        {lastKnownLocation && (
                            <div className="col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Known Position</p>
                                <p className="font-medium">{lastKnownLocation}</p>
                            </div>
                        )}
                        {lastSyncAt && (
                            <div className="col-span-2 text-xs text-muted-foreground">
                                Last updated: {new Date(lastSyncAt).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Loading skeleton
export function ContainerMapSkeleton() {
    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-6 w-20" />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Skeleton className="h-[250px] w-full" />
                <div className="p-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
