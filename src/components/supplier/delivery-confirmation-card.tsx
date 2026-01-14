"use client";

/**
 * Phase 6: Delivery Confirmation Card
 * 
 * Allows site receivers to confirm delivery with quantities and evidence.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, Package, AlertTriangle, Camera, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryItem {
    boqItemId: string;
    description: string;
    declaredQty: number;
    deliveredQty: number;
    condition: "GOOD" | "DAMAGED" | "MISSING_ITEMS";
    notes: string;
}

interface DeliveryConfirmationCardProps {
    shipmentId: string;
    shipment: {
        declaredQty?: string | null;
        unit?: string | null;
        carrier?: string | null;
        trackingNumber?: string | null;
    };
    boqItems: {
        id: string;
        description: string;
        quantity: string;
        unit: string;
    }[];
    onConfirmSuccess?: () => void;
}

export function DeliveryConfirmationCard({
    shipmentId,
    shipment,
    boqItems,
    onConfirmSuccess,
}: DeliveryConfirmationCardProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPartial, setIsPartial] = useState(false);
    const [notes, setNotes] = useState("");

    // Initialize delivery items from BOQ
    const [items, setItems] = useState<DeliveryItem[]>(
        boqItems.map((item) => ({
            boqItemId: item.id,
            description: item.description,
            declaredQty: Number(item.quantity) || 0,
            deliveredQty: Number(item.quantity) || 0,
            condition: "GOOD" as const,
            notes: "",
        }))
    );

    const updateItem = (index: number, updates: Partial<DeliveryItem>) => {
        setItems((prev) => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], ...updates };
            return newItems;
        });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/deliveries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "confirm",
                    shipmentId,
                    isPartial,
                    notes,
                    items: items.map((item) => ({
                        boqItemId: item.boqItemId,
                        quantityDelivered: item.deliveredQty,
                        quantityDeclared: item.declaredQty,
                        condition: item.condition,
                        notes: item.notes,
                    })),
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to confirm delivery");
            }

            toast.success("Delivery confirmed successfully!");
            setOpen(false);
            onConfirmSuccess?.();
            router.refresh();
        } catch (error) {
            console.error("Delivery confirmation error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to confirm delivery");
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasIssues = items.some((item) => item.condition !== "GOOD");
    const hasVariance = items.some((item) => item.deliveredQty !== item.declaredQty);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Confirm Delivery
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Confirm Delivery
                    </DialogTitle>
                    <DialogDescription>
                        Record the received quantities and condition for each item.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Shipment Info */}
                    <Card>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Carrier:</span>
                                    <p className="font-medium">{shipment.carrier || "—"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Tracking:</span>
                                    <p className="font-mono">{shipment.trackingNumber || "—"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Declared Qty:</span>
                                    <p className="font-medium">
                                        {shipment.declaredQty || "—"} {shipment.unit || ""}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items */}
                    <div className="space-y-4">
                        <h4 className="font-medium">Items Received</h4>
                        {items.map((item, index) => (
                            <Card key={item.boqItemId} className={cn(
                                item.condition !== "GOOD" && "border-orange-300 bg-orange-50/50"
                            )}>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium">{item.description}</p>
                                        {item.condition !== "GOOD" && (
                                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Declared Qty</Label>
                                            <Input
                                                type="number"
                                                value={item.declaredQty}
                                                disabled
                                                className="bg-muted"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Received Qty</Label>
                                            <Input
                                                type="number"
                                                value={item.deliveredQty}
                                                onChange={(e) =>
                                                    updateItem(index, {
                                                        deliveredQty: Number(e.target.value),
                                                    })
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Condition</Label>
                                            <Select
                                                value={item.condition}
                                                onValueChange={(value: "GOOD" | "DAMAGED" | "MISSING_ITEMS") =>
                                                    updateItem(index, { condition: value })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GOOD">Good</SelectItem>
                                                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                                                    <SelectItem value="MISSING_ITEMS">Missing Items</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {item.condition !== "GOOD" && (
                                        <div className="space-y-2">
                                            <Label>Notes</Label>
                                            <Textarea
                                                value={item.notes}
                                                onChange={(e) =>
                                                    updateItem(index, { notes: e.target.value })
                                                }
                                                placeholder="Describe the issue..."
                                                rows={2}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Partial Delivery */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="partial"
                            checked={isPartial}
                            onCheckedChange={(checked) => setIsPartial(Boolean(checked))}
                        />
                        <Label htmlFor="partial">
                            This is a partial delivery (more shipments to follow)
                        </Label>
                    </div>

                    {/* General Notes */}
                    <div className="space-y-2">
                        <Label>General Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any additional comments about this delivery..."
                            rows={3}
                        />
                    </div>

                    {/* Warnings */}
                    {(hasIssues || hasVariance) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-2 text-yellow-800 font-medium">
                                <AlertTriangle className="h-4 w-4" />
                                Review Required
                            </div>
                            {hasIssues && (
                                <p className="text-sm text-yellow-700">
                                    • Some items have condition issues that will be flagged for review.
                                </p>
                            )}
                            {hasVariance && (
                                <p className="text-sm text-yellow-700">
                                    • Quantity variance detected - this may require PM approval.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Confirming..." : "Confirm Delivery"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
