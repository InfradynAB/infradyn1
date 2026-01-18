"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Truck,
    Wrench,
    SealCheck,
    CircleNotch,
    Lock,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuantityProgressCardProps {
    boqItemId: string;
    itemNumber: string;
    description: string;
    unit: string;
    quantity: number;
    quantityDelivered: number;
    quantityInstalled: number;
    quantityCertified: number;
    isVariation?: boolean;
    variationOrderNumber?: string;
    onUpdate?: () => void;
}

export function QuantityProgressCard({
    boqItemId,
    itemNumber,
    description,
    unit,
    quantity,
    quantityDelivered,
    quantityInstalled,
    quantityCertified,
    isVariation,
    variationOrderNumber,
    onUpdate,
}: QuantityProgressCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [installedInput, setInstalledInput] = useState(quantityInstalled.toString());
    const [certifiedInput, setCertifiedInput] = useState(quantityCertified.toString());

    const deliveredPercent = quantity > 0 ? (quantityDelivered / quantity) * 100 : 0;
    const installedPercent = quantity > 0 ? (quantityInstalled / quantity) * 100 : 0;
    const certifiedPercent = quantity > 0 ? (quantityCertified / quantity) * 100 : 0;

    const handleUpdateInstalled = async () => {
        const value = parseFloat(installedInput);
        if (isNaN(value) || value < 0) {
            toast.error("Invalid value");
            return;
        }

        if (value > quantityDelivered) {
            toast.error(`Cannot install more than delivered (${quantityDelivered} ${unit})`);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/boq-items/progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "updateInstalled",
                    boqItemId,
                    quantityInstalled: value,
                }),
            });

            const result = await response.json();
            if (result.success) {
                toast.success("Quantity installed updated");
                onUpdate?.();
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Failed to update");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCertify = async () => {
        const value = parseFloat(certifiedInput);
        if (isNaN(value) || value < 0) {
            toast.error("Invalid value");
            return;
        }

        if (value > quantityInstalled) {
            toast.error(`Cannot certify more than installed (${quantityInstalled} ${unit})`);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/boq-items/progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "certify",
                    boqItemId,
                    quantityCertified: value,
                }),
            });

            const result = await response.json();
            if (result.success) {
                toast.success("Quantity certified for payment");
                onUpdate?.();
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Failed to certify");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm">{itemNumber}</CardTitle>
                            {isVariation && (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                                    {variationOrderNumber || "VO"}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-semibold">{quantity} {unit}</p>
                        <p className="text-xs text-muted-foreground">Total Qty</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Progress Hierarchy */}
                <div className="space-y-2">
                    {/* Delivered */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Truck size={14} />
                                Delivered
                            </span>
                            <span>{quantityDelivered} {unit} ({deliveredPercent.toFixed(0)}%)</span>
                        </div>
                        <Progress value={deliveredPercent} className="h-2 bg-slate-100" />
                    </div>

                    {/* Installed */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Wrench size={14} />
                                Installed
                            </span>
                            <span className={cn(
                                quantityInstalled > quantityDelivered && "text-red-600"
                            )}>
                                {quantityInstalled} {unit} ({installedPercent.toFixed(0)}%)
                            </span>
                        </div>
                        <Progress
                            value={installedPercent}
                            className={cn(
                                "h-2",
                                installedPercent > 0 && "[&>div]:bg-blue-500"
                            )}
                        />
                    </div>

                    {/* Certified */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <SealCheck size={14} />
                                Certified
                            </span>
                            <span className="flex items-center gap-1">
                                {quantityCertified} {unit} ({certifiedPercent.toFixed(0)}%)
                                {quantityCertified > 0 && (
                                    <Lock size={12} className="text-amber-600" weight="fill" />
                                )}
                            </span>
                        </div>
                        <Progress
                            value={certifiedPercent}
                            className={cn(
                                "h-2",
                                certifiedPercent > 0 && "[&>div]:bg-green-500"
                            )}
                        />
                    </div>
                </div>

                {/* Constraint Info */}
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <span className="font-medium">Constraint:</span> Certified ≤ Installed ≤ Delivered
                </div>

                {/* Edit Mode */}
                {isEditing ? (
                    <div className="space-y-3 pt-2 border-t">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Qty Installed</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        value={installedInput}
                                        onChange={(e) => setInstalledInput(e.target.value)}
                                        className="h-8 text-sm"
                                        max={quantityDelivered}
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8"
                                        onClick={handleUpdateInstalled}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? <CircleNotch className="h-4 w-4 animate-spin" /> : "Save"}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Max: {quantityDelivered}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Qty Certified</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        value={certifiedInput}
                                        onChange={(e) => setCertifiedInput(e.target.value)}
                                        className="h-8 text-sm"
                                        max={quantityInstalled}
                                    />
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-8"
                                        onClick={handleCertify}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? <CircleNotch className="h-4 w-4 animate-spin" /> : "Certify"}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Max: {quantityInstalled}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => setIsEditing(false)}>
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setIsEditing(true)}
                    >
                        Update Progress
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
