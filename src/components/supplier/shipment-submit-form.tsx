"use client";

/**
 * Phase 6: Shipment Submit Form
 * 
 * Allows suppliers to submit shipment information including
 * tracking number, carrier, dispatch date, and ETA.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { Package, Truck, Calendar, MapPin, Plus } from "lucide-react";
import { format } from "date-fns";

interface ShipmentSubmitFormProps {
    purchaseOrderId: string;
    supplierId: string;
    boqItems?: {
        id: string;
        description: string;
        quantity: string;
        unit: string;
    }[];
    onSubmitSuccess?: () => void;
}

const COMMON_CARRIERS = [
    { value: "fedex", label: "FedEx" },
    { value: "ups", label: "UPS" },
    { value: "dhl", label: "DHL Express" },
    { value: "maersk", label: "Maersk" },
    { value: "msc", label: "MSC" },
    { value: "hapag-lloyd", label: "Hapag-Lloyd" },
    { value: "cosco", label: "COSCO" },
    { value: "evergreen", label: "Evergreen" },
    { value: "cma-cgm", label: "CMA CGM" },
    { value: "other", label: "Other" },
];

export function ShipmentSubmitForm({
    purchaseOrderId,
    supplierId,
    boqItems = [],
    onSubmitSuccess,
}: ShipmentSubmitFormProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [trackingNumber, setTrackingNumber] = useState("");
    const [carrier, setCarrier] = useState("");
    const [customCarrier, setCustomCarrier] = useState("");
    const [dispatchDate, setDispatchDate] = useState("");
    const [supplierAos, setSupplierAos] = useState(""); // Arrival on Site
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");
    const [selectedBoqItem, setSelectedBoqItem] = useState("");
    const [declaredQty, setDeclaredQty] = useState("");
    const [unit, setUnit] = useState("");
    const [notes, setNotes] = useState("");

    const handleBoqItemChange = (boqItemId: string) => {
        setSelectedBoqItem(boqItemId);
        const item = boqItems.find(i => i.id === boqItemId);
        if (item) {
            setDeclaredQty(item.quantity);
            setUnit(item.unit);
        }
    };

    const handleSubmit = async () => {
        if (!carrier && !customCarrier) {
            toast.error("Please select a carrier");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/shipments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "create",
                    purchaseOrderId,
                    supplierId,
                    boqItemId: selectedBoqItem || undefined,
                    trackingNumber: trackingNumber || undefined,
                    carrier: carrier === "other" ? customCarrier : carrier,
                    dispatchDate: dispatchDate || undefined,
                    supplierAos: supplierAos || undefined,
                    originLocation: origin || undefined,
                    destination: destination || undefined,
                    declaredQty: declaredQty ? Number(declaredQty) : undefined,
                    unit: unit || undefined,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to create shipment");
            }

            toast.success("Shipment submitted successfully!");
            setOpen(false);
            resetForm();
            onSubmitSuccess?.();
            router.refresh();
        } catch (error) {
            console.error("Shipment submit error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to submit shipment");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTrackingNumber("");
        setCarrier("");
        setCustomCarrier("");
        setDispatchDate("");
        setSupplierAos("");
        setOrigin("");
        setDestination("");
        setSelectedBoqItem("");
        setDeclaredQty("");
        setUnit("");
        setNotes("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Package className="h-4 w-4" />
                    Add Shipment
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Submit Shipment Details
                    </DialogTitle>
                    <DialogDescription>
                        Provide shipment and tracking information for this purchase order.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* BOQ Item Selection */}
                    {boqItems.length > 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="boqItem">Material / BOQ Item (Optional)</Label>
                            <Select value={selectedBoqItem} onValueChange={handleBoqItemChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select item being shipped" />
                                </SelectTrigger>
                                <SelectContent>
                                    {boqItems.map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.description} ({item.quantity} {item.unit})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Tracking Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="carrier">Carrier *</Label>
                            <Select value={carrier} onValueChange={setCarrier}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select carrier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COMMON_CARRIERS.map((c) => (
                                        <SelectItem key={c.value} value={c.value}>
                                            {c.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {carrier === "other" && (
                            <div className="space-y-2">
                                <Label htmlFor="customCarrier">Carrier Name *</Label>
                                <Input
                                    id="customCarrier"
                                    value={customCarrier}
                                    onChange={(e) => setCustomCarrier(e.target.value)}
                                    placeholder="Enter carrier name"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="tracking">Tracking Number</Label>
                            <Input
                                id="tracking"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="Enter tracking number"
                            />
                            <p className="text-xs text-muted-foreground">
                                If provided, we'll automatically track shipment status
                            </p>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="dispatch" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Dispatch Date
                            </Label>
                            <Input
                                id="dispatch"
                                type="date"
                                value={dispatchDate}
                                onChange={(e) => setDispatchDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="eta" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Expected Arrival (AOS) *
                            </Label>
                            <Input
                                id="eta"
                                type="date"
                                value={supplierAos}
                                onChange={(e) => setSupplierAos(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Your estimated Arrival on Site date
                            </p>
                        </div>
                    </div>

                    {/* Locations */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="origin" className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Origin
                            </Label>
                            <Input
                                id="origin"
                                value={origin}
                                onChange={(e) => setOrigin(e.target.value)}
                                placeholder="e.g., Shanghai, China"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="destination" className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Destination
                            </Label>
                            <Input
                                id="destination"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                placeholder="e.g., Rotterdam, Netherlands"
                            />
                        </div>
                    </div>

                    {/* Quantities */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="qty">Quantity</Label>
                            <Input
                                id="qty"
                                type="number"
                                value={declaredQty}
                                onChange={(e) => setDeclaredQty(e.target.value)}
                                placeholder="0"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="unit">Unit</Label>
                            <Input
                                id="unit"
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                placeholder="e.g., pcs, kg, m³"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any additional information about this shipment..."
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit Shipment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
