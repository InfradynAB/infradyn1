"use client";

/**
 * Phase 6: Delivery Exceptions List
 * 
 * Shows deliveries with issues: variances, damage, or partial deliveries.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertTriangle, Package, Clock, CheckCircle,
    TrendingDown, TrendingUp
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface DeliveryException {
    id: string;
    receivedQty: string;
    declaredQty?: string | null;
    variancePercent?: string | null;
    condition?: string | null;
    isPartial?: boolean;
    receivedAt?: string | Date | null;
    notes?: string | null;
    shipment?: {
        carrier?: string | null;
        trackingNumber?: string | null;
        purchaseOrder?: {
            poNumber: string;
        };
    };
}

interface DeliveryExceptionsListProps {
    purchaseOrderId?: string;
    limit?: number;
}

export function DeliveryExceptionsList({
    purchaseOrderId,
    limit = 10,
}: DeliveryExceptionsListProps) {
    const [exceptions, setExceptions] = useState<DeliveryException[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchExceptions = async () => {
        setLoading(true);
        try {
            // Fetch delivery receipts with variance or condition issues
            const params = new URLSearchParams({
                action: "list",
            });
            if (purchaseOrderId) params.set("purchaseOrderId", purchaseOrderId);

            const response = await fetch(`/api/deliveries?${params}`);
            const data = await response.json();

            if (data.deliveries) {
                // Filter for exceptions (variance > 0 or non-GOOD condition)
                const filtered = data.deliveries.filter((d: DeliveryException) => {
                    const variance = Math.abs(Number(d.variancePercent) || 0);
                    return variance > 0 ||
                        d.condition !== "GOOD" ||
                        d.isPartial;
                });
                setExceptions(filtered.slice(0, limit));
            }
        } catch (error) {
            console.error("Failed to fetch exceptions:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExceptions();
    }, [purchaseOrderId, limit]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Delivery Exceptions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Delivery Exceptions
                </CardTitle>
                <CardDescription>
                    Deliveries with variances, damage, or partial status
                </CardDescription>
            </CardHeader>

            <CardContent>
                {exceptions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                        <p className="font-medium">No exceptions</p>
                        <p className="text-sm">All deliveries are within acceptable variance</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {exceptions.map((exception) => {
                            const variance = Number(exception.variancePercent) || 0;
                            const isPositiveVariance = variance > 0;
                            const isNegativeVariance = variance < 0;
                            const receivedAt = exception.receivedAt
                                ? typeof exception.receivedAt === "string"
                                    ? new Date(exception.receivedAt)
                                    : exception.receivedAt
                                : null;

                            return (
                                <div
                                    key={exception.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">
                                                {exception.shipment?.purchaseOrder?.poNumber || "Delivery"}
                                            </span>
                                            {exception.isPartial && (
                                                <Badge variant="outline" className="text-xs">
                                                    Partial
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span>
                                                Declared: {exception.declaredQty || "—"} |
                                                Received: {exception.receivedQty}
                                            </span>
                                            {receivedAt && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(receivedAt, { addSuffix: true })}
                                                </span>
                                            )}
                                        </div>

                                        {exception.condition && exception.condition !== "GOOD" && (
                                            <Badge variant="destructive" className="text-xs">
                                                {exception.condition.replace(/_/g, " ")}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="text-right">
                                        {variance !== 0 && (
                                            <div className={cn(
                                                "flex items-center gap-1 font-medium",
                                                isNegativeVariance ? "text-red-600" : "text-orange-600"
                                            )}>
                                                {isNegativeVariance ? (
                                                    <TrendingDown className="h-4 w-4" />
                                                ) : (
                                                    <TrendingUp className="h-4 w-4" />
                                                )}
                                                <span>{Math.abs(variance).toFixed(1)}%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
