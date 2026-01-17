"use client";

/**
 * Phase 6: Multi-Provider Shipment Submit Form
 * 
 * Dynamic form that changes based on selected logistics provider:
 * - Maersk: Container number, vessel, seal
 * - DHL Express: 10-digit waybill
 * - DHL Freight: Alphanumeric waybill
 * - Other: Manual tracking number
 */

import { useState, useEffect } from "react";
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
import { Package, Calendar, MapPin, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProviderSelector, LogisticsProvider, ProviderBadge } from "./provider-selector";

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

// Validate container number (Maersk) - ISO 6346
function validateContainerNumber(containerNumber: string): { valid: boolean; error?: string; normalized?: string } {
    if (!containerNumber) return { valid: false, error: "Container number is required" };
    const normalized = containerNumber.toUpperCase().replace(/[\s-]/g, '');
    const regex = /^[A-Z]{4}[0-9]{7}$/;
    if (!regex.test(normalized)) {
        return { valid: false, error: "Must be 4 letters + 7 digits (e.g., MSKU1234567)" };
    }
    return { valid: true, normalized };
}

// Validate waybill number (DHL)
function validateWaybillNumber(waybill: string, service: 'express' | 'freight'): { valid: boolean; error?: string; normalized?: string } {
    if (!waybill) return { valid: false, error: "Waybill number is required" };
    const normalized = waybill.toUpperCase().replace(/[\s-]/g, '');

    if (service === 'express') {
        const regex = /^\d{10}$/;
        if (!regex.test(normalized)) {
            return { valid: false, error: "DHL Express requires exactly 10 digits" };
        }
    } else {
        const regex = /^[A-Z0-9]{7,15}$/;
        if (!regex.test(normalized)) {
            return { valid: false, error: "DHL Freight requires 7-15 alphanumeric characters" };
        }
    }
    return { valid: true, normalized };
}

export function ShipmentSubmitForm({
    purchaseOrderId,
    supplierId,
    boqItems = [],
    onSubmitSuccess,
}: ShipmentSubmitFormProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<1 | 2>(1); // 1: Provider selection, 2: Form details

    // Provider selection
    const [provider, setProvider] = useState<LogisticsProvider | undefined>();

    // Maersk fields
    const [containerNumber, setContainerNumber] = useState("");
    const [billOfLading, setBillOfLading] = useState("");
    const [containerValidation, setContainerValidation] = useState<{ valid: boolean; error?: string; normalized?: string }>({ valid: false });

    // DHL fields
    const [waybillNumber, setWaybillNumber] = useState("");
    const [waybillValidation, setWaybillValidation] = useState<{ valid: boolean; error?: string; normalized?: string }>({ valid: false });

    // Common fields
    const [trackingNumber, setTrackingNumber] = useState("");
    const [carrier, setCarrier] = useState("");
    const [dispatchDate, setDispatchDate] = useState("");
    const [supplierAos, setSupplierAos] = useState("");
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");
    const [selectedBoqItem, setSelectedBoqItem] = useState("");
    const [declaredQty, setDeclaredQty] = useState("");
    const [unit, setUnit] = useState("");
    const [supplierWeight, setSupplierWeight] = useState("");
    const [notes, setNotes] = useState("");

    // Validate container number (Maersk)
    useEffect(() => {
        if (provider === 'MAERSK' && containerNumber.length >= 11) {
            const result = validateContainerNumber(containerNumber);
            setContainerValidation(result);
        } else if (provider === 'MAERSK' && containerNumber.length > 0) {
            setContainerValidation({ valid: false, error: `${11 - containerNumber.length} more characters needed` });
        } else {
            setContainerValidation({ valid: false });
        }
    }, [containerNumber, provider]);

    // Validate waybill number (DHL)
    useEffect(() => {
        if (provider === 'DHL_EXPRESS') {
            if (waybillNumber.length >= 10) {
                const result = validateWaybillNumber(waybillNumber, 'express');
                setWaybillValidation(result);
            } else if (waybillNumber.length > 0) {
                setWaybillValidation({ valid: false, error: `${10 - waybillNumber.length} more digits needed` });
            } else {
                setWaybillValidation({ valid: false });
            }
        } else if (provider === 'DHL_FREIGHT') {
            if (waybillNumber.length >= 7) {
                const result = validateWaybillNumber(waybillNumber, 'freight');
                setWaybillValidation(result);
            } else if (waybillNumber.length > 0) {
                setWaybillValidation({ valid: false, error: `${7 - waybillNumber.length} more characters needed` });
            } else {
                setWaybillValidation({ valid: false });
            }
        }
    }, [waybillNumber, provider]);

    const handleBoqItemChange = (boqItemId: string) => {
        setSelectedBoqItem(boqItemId);
        const item = boqItems.find(i => i.id === boqItemId);
        if (item) {
            setDeclaredQty(item.quantity);
            setUnit(item.unit);
        }
    };

    const isTrackingValid = () => {
        switch (provider) {
            case 'MAERSK':
                return containerValidation.valid;
            case 'DHL_EXPRESS':
            case 'DHL_FREIGHT':
                return waybillValidation.valid;
            case 'OTHER':
                return trackingNumber.length > 0;
            default:
                return false;
        }
    };

    const handleSubmit = async () => {
        if (!provider) {
            toast.error("Please select a logistics provider");
            return;
        }

        if (!isTrackingValid()) {
            toast.error("Please enter a valid tracking number");
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
                    provider,
                    // Provider-specific fields
                    containerNumber: provider === 'MAERSK' ? containerValidation.normalized : undefined,
                    billOfLading: provider === 'MAERSK' ? billOfLading : undefined,
                    waybillNumber: (provider === 'DHL_EXPRESS' || provider === 'DHL_FREIGHT') ? waybillValidation.normalized : undefined,
                    trackingNumber: provider === 'OTHER' ? trackingNumber : undefined,
                    carrier: provider === 'OTHER' ? carrier : provider.toLowerCase().replace('_', '-'),
                    supplierWeight: supplierWeight ? Number(supplierWeight) : undefined,
                    // Common fields
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

            toast.success("Shipment submitted successfully! Tracking will begin shortly.");
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
        setStep(1);
        setProvider(undefined);
        setContainerNumber("");
        setBillOfLading("");
        setContainerValidation({ valid: false });
        setWaybillNumber("");
        setWaybillValidation({ valid: false });
        setTrackingNumber("");
        setCarrier("");
        setDispatchDate("");
        setSupplierAos("");
        setOrigin("");
        setDestination("");
        setSelectedBoqItem("");
        setDeclaredQty("");
        setUnit("");
        setSupplierWeight("");
        setNotes("");
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Package className="h-4 w-4" />
                    Add Shipment
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        {step === 1 ? "Select Provider" : "Shipment Details"}
                        {step === 2 && provider && (
                            <ProviderBadge provider={provider} size="sm" />
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1
                            ? "Choose your logistics provider to enable real-time tracking."
                            : "Enter shipment details for tracking."
                        }
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Provider Selection */}
                {step === 1 && (
                    <div className="py-4">
                        <ProviderSelector value={provider} onChange={setProvider} />
                    </div>
                )}

                {/* Step 2: Form Details */}
                {step === 2 && (
                    <div className="grid gap-6 py-4">
                        {/* MAERSK Form */}
                        {provider === 'MAERSK' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="container" className="text-base font-medium flex items-center gap-2">
                                        Container Number *
                                        {containerValidation.valid && (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Valid
                                            </Badge>
                                        )}
                                    </Label>
                                    <Input
                                        id="container"
                                        value={containerNumber}
                                        onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                                        placeholder="MSKU1234567"
                                        className={cn(
                                            "text-lg font-mono tracking-wider",
                                            containerValidation.valid && "border-green-500",
                                            !containerValidation.valid && containerNumber.length > 0 && "border-amber-500"
                                        )}
                                        maxLength={11}
                                    />
                                    {containerNumber.length > 0 && !containerValidation.valid && (
                                        <p className="text-xs text-amber-600 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {containerValidation.error}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bol">Bill of Lading (Optional)</Label>
                                    <Input
                                        id="bol"
                                        value={billOfLading}
                                        onChange={(e) => setBillOfLading(e.target.value)}
                                        placeholder="Enter BoL number"
                                    />
                                </div>
                            </>
                        )}

                        {/* DHL Form */}
                        {(provider === 'DHL_EXPRESS' || provider === 'DHL_FREIGHT') && (
                            <div className="space-y-2">
                                <Label htmlFor="waybill" className="text-base font-medium flex items-center gap-2">
                                    Waybill Number *
                                    {waybillValidation.valid && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Valid
                                        </Badge>
                                    )}
                                </Label>
                                <Input
                                    id="waybill"
                                    value={waybillNumber}
                                    onChange={(e) => setWaybillNumber(e.target.value.toUpperCase())}
                                    placeholder={provider === 'DHL_EXPRESS' ? "1234567890" : "ABC1234567"}
                                    className={cn(
                                        "text-lg font-mono tracking-wider",
                                        waybillValidation.valid && "border-green-500",
                                        !waybillValidation.valid && waybillNumber.length > 0 && "border-amber-500"
                                    )}
                                    maxLength={provider === 'DHL_EXPRESS' ? 10 : 15}
                                />
                                {waybillNumber.length > 0 && !waybillValidation.valid && (
                                    <p className="text-xs text-amber-600 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {waybillValidation.error}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    {provider === 'DHL_EXPRESS'
                                        ? "DHL Express waybill: exactly 10 digits"
                                        : "DHL Freight reference: 7-15 alphanumeric characters"
                                    }
                                </p>
                            </div>
                        )}

                        {/* OTHER Form */}
                        {provider === 'OTHER' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="carrier">Carrier Name *</Label>
                                    <Input
                                        id="carrier"
                                        value={carrier}
                                        onChange={(e) => setCarrier(e.target.value)}
                                        placeholder="e.g., FedEx, UPS"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tracking">Tracking Number *</Label>
                                    <Input
                                        id="tracking"
                                        value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value)}
                                        placeholder="Enter tracking number"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Common Fields */}
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dispatch" className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Dispatch Date
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
                                    <Calendar className="h-4 w-4" /> Expected Arrival *
                                </Label>
                                <Input
                                    id="eta"
                                    type="date"
                                    value={supplierAos}
                                    onChange={(e) => setSupplierAos(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="origin" className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" /> Origin
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
                                    <MapPin className="h-4 w-4" /> Destination
                                </Label>
                                <Input
                                    id="destination"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    placeholder="e.g., Nairobi, Kenya"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
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
                                    placeholder="pcs, kg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="weight">Weight (kg)</Label>
                                <Input
                                    id="weight"
                                    type="number"
                                    value={supplierWeight}
                                    onChange={(e) => setSupplierWeight(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="flex justify-between">
                    {step === 1 ? (
                        <>
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => setStep(2)}
                                disabled={!provider}
                                className="gap-2"
                            >
                                Next <ArrowRight className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !isTrackingValid()}
                                className="gap-2"
                            >
                                {isSubmitting ? "Submitting..." : "Submit Shipment"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
