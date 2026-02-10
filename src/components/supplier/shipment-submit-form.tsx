"use client";

/**
 * Shipment Submit Sheet — Railway-style side panel
 *
 * Large right-side sheet with simplified flow:
 *   Step 1: Provider → tracking number
 *   Step 2: Upload document → AI extraction
 *   Step 3: Review & edit extracted items → submit
 *
 * Only manual fields: tracking, dispatch date, expected arrival, origin, destination.
 * Everything else comes from the extracted packing list.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
    Package,
    MapPin,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    ArrowRight,
    Send,
    Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProviderSelector, LogisticsProvider, ProviderBadge } from "./provider-selector";
import {
    ShipmentUploadStep,
    ExtractedShipmentResult,
    ExtractedItemResult,
} from "./shipment-upload-step";
import { ShipmentReviewStep } from "./shipment-review-step";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";

// ============================================================================
// TYPES
// ============================================================================

interface ShipmentSubmitFormProps {
    purchaseOrderId: string;
    supplierId: string;
    onSubmitSuccess?: () => void;
}

type WizardStep = 1 | 2 | 3;

// ============================================================================
// VALIDATION
// ============================================================================

function validateContainerNumber(v: string) {
    if (!v) return { valid: false, error: "Required" };
    const n = v.toUpperCase().replace(/[\s-]/g, "");
    if (!/^[A-Z]{4}[0-9]{7}$/.test(n))
        return { valid: false, error: "4 letters + 7 digits (e.g. MSKU1234567)" };
    return { valid: true, normalized: n };
}

function validateWaybill(v: string, svc: "express" | "freight") {
    if (!v) return { valid: false, error: "Required" };
    const n = v.toUpperCase().replace(/[\s-]/g, "");
    if (svc === "express" && !/^\d{10}$/.test(n))
        return { valid: false, error: "Exactly 10 digits" };
    if (svc === "freight" && !/^[A-Z0-9]{7,15}$/.test(n))
        return { valid: false, error: "7–15 alphanumeric" };
    return { valid: true, normalized: n };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ShipmentSubmitForm({
    purchaseOrderId,
    supplierId,
    onSubmitSuccess,
}: ShipmentSubmitFormProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [step, setStep] = useState<WizardStep>(1);

    // Provider + tracking
    const [provider, setProvider] = useState<LogisticsProvider | undefined>();
    const [containerNumber, setContainerNumber] = useState("");
    const [billOfLading, setBillOfLading] = useState("");
    const [waybillNumber, setWaybillNumber] = useState("");
    const [trackingNumber, setTrackingNumber] = useState("");
    const [carrier, setCarrier] = useState("");
    const [containerVal, setContainerVal] = useState<{ valid: boolean; error?: string; normalized?: string }>({ valid: false });
    const [waybillVal, setWaybillVal] = useState<{ valid: boolean; error?: string; normalized?: string }>({ valid: false });

    // Simple fields
    const [dispatchDate, setDispatchDate] = useState<Date | undefined>();
    const [expectedArrival, setExpectedArrival] = useState<Date | undefined>();
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");

    // Extraction
    const [extractionResult, setExtractionResult] = useState<ExtractedShipmentResult | null>(null);
    const [extractedItems, setExtractedItems] = useState<ExtractedItemResult[]>([]);

    // --- Live validation ---
    useEffect(() => {
        if (provider === "MAERSK") {
            setContainerVal(
                containerNumber.length >= 11
                    ? validateContainerNumber(containerNumber)
                    : containerNumber.length > 0
                        ? { valid: false, error: `${11 - containerNumber.length} more chars` }
                        : { valid: false }
            );
        }
    }, [containerNumber, provider]);

    useEffect(() => {
        if (provider === "DHL_EXPRESS" || provider === "DHL_FREIGHT") {
            const svc = provider === "DHL_EXPRESS" ? "express" : "freight";
            const minLen = svc === "express" ? 10 : 7;
            setWaybillVal(
                waybillNumber.length >= minLen
                    ? validateWaybill(waybillNumber, svc as "express" | "freight")
                    : waybillNumber.length > 0
                        ? { valid: false, error: `${minLen - waybillNumber.length} more chars` }
                        : { valid: false }
            );
        }
    }, [waybillNumber, provider]);

    // --- Helpers ---
    const isTrackingValid = () => {
        switch (provider) {
            case "MAERSK": return containerVal.valid;
            case "DHL_EXPRESS":
            case "DHL_FREIGHT": return waybillVal.valid;
            case "OTHER": return trackingNumber.length > 0 && carrier.length > 0;
            default: return false;
        }
    };

    const handleExtractionComplete = (result: ExtractedShipmentResult) => {
        setExtractionResult(result);
        setExtractedItems(result.items);
        if (result.origin && !origin) setOrigin(result.origin);
        if ((result.destination || result.deliveryAddress) && !destination)
            setDestination(result.destination || result.deliveryAddress || "");
        setStep(3);
    };

    const handleSkipUpload = () => {
        setExtractionResult(null);
        setExtractedItems([]);
        setStep(3);
    };

    const resetForm = () => {
        setStep(1);
        setProvider(undefined);
        setContainerNumber(""); setBillOfLading("");
        setWaybillNumber(""); setTrackingNumber(""); setCarrier("");
        setContainerVal({ valid: false }); setWaybillVal({ valid: false });
        setDispatchDate(undefined); setExpectedArrival(undefined);
        setOrigin(""); setDestination("");
        setExtractionResult(null); setExtractedItems([]);
    };

    // --- Submit ---
    const handleSubmit = async () => {
        if (!provider || !isTrackingValid()) return;
        setIsSubmitting(true);
        try {
            const items = extractedItems.map((item) => ({
                articleNumber: item.articleNumber,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                weightKg: item.weightKg,
                hsCode: item.hsCode,
                countryOfOrigin: item.countryOfOrigin,
                deliveryNote: item.deliveryNote,
                packages: item.packages,
            }));

            const res = await fetch("/api/shipments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "create",
                    purchaseOrderId,
                    supplierId,
                    provider,
                    containerNumber: provider === "MAERSK" ? containerVal.normalized : undefined,
                    billOfLading: provider === "MAERSK" ? billOfLading : undefined,
                    waybillNumber: provider?.startsWith("DHL") ? waybillVal.normalized : undefined,
                    trackingNumber: provider === "OTHER" ? trackingNumber : undefined,
                    carrier: provider === "OTHER" ? carrier : provider.toLowerCase().replace("_", "-"),
                    dispatchDate: dispatchDate ? dispatchDate.toISOString().split("T")[0] : undefined,
                    supplierAos: expectedArrival ? expectedArrival.toISOString().split("T")[0] : undefined,
                    originLocation: origin || undefined,
                    destination: destination || undefined,
                    items: items.length > 0 ? items : undefined,
                }),
            });

            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Failed");

            toast.success("Shipment submitted! Tracking will begin shortly.");
            setOpen(false);
            resetForm();
            onSubmitSuccess?.();
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to submit");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ======== STEP CONTENT ========

    return (
        <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Package className="h-4 w-4" /> Add Shipment
                </Button>
            </SheetTrigger>

            <SheetContent
                side="right"
                className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-0 flex flex-col"
            >
                {/* ---- Header ---- */}
                <SheetHeader className="px-6 pt-6 pb-4 border-b bg-muted/30 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-500/10">
                            <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <SheetTitle className="text-lg">New Shipment</SheetTitle>
                            <SheetDescription className="text-xs">
                                {step === 1 && "Select provider, enter tracking & dates"}
                                {step === 2 && "Upload packing list for AI extraction"}
                                {step === 3 && "Review extracted items & submit"}
                            </SheetDescription>
                        </div>
                        {provider && <ProviderBadge provider={provider} size="sm" />}
                    </div>

                    {/* Step progress bar */}
                    <div className="flex items-center gap-1 pt-3">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex-1 flex items-center gap-1">
                                <div className={cn(
                                    "h-1.5 flex-1 rounded-full transition-colors duration-300",
                                    s <= step ? "bg-blue-500" : "bg-muted-foreground/20"
                                )} />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                        <span className={cn(step >= 1 && "text-blue-600 font-medium")}>Details</span>
                        <span className={cn(step >= 2 && "text-blue-600 font-medium")}>Upload</span>
                        <span className={cn(step >= 3 && "text-blue-600 font-medium")}>Review</span>
                    </div>
                </SheetHeader>

                {/* ---- Body ---- */}
                <div className="flex-1 overflow-y-auto px-6 py-6">

                    {/* ====== STEP 1: Provider + Details ====== */}
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Provider selection */}
                            <ProviderSelector value={provider} onChange={setProvider} />

                            {/* Tracking fields — only show after provider selected */}
                            {provider && (
                                <div className="space-y-5 pt-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">

                                    {/* Maersk */}
                                    {provider === "MAERSK" && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium flex items-center gap-2">
                                                    Container Number *
                                                    {containerVal.valid && (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                    )}
                                                </Label>
                                                <Input
                                                    value={containerNumber}
                                                    onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                                                    placeholder="MSKU1234567"
                                                    className={cn(
                                                        "font-mono text-base tracking-wide",
                                                        containerVal.valid && "border-green-500/60",
                                                        !containerVal.valid && containerNumber.length > 0 && "border-amber-500/60"
                                                    )}
                                                    maxLength={11}
                                                />
                                                {containerNumber.length > 0 && !containerVal.valid && (
                                                    <p className="text-xs text-amber-600 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" /> {containerVal.error}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm">Bill of Lading (optional)</Label>
                                                <Input
                                                    value={billOfLading}
                                                    onChange={(e) => setBillOfLading(e.target.value)}
                                                    placeholder="BoL number"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* DHL */}
                                    {(provider === "DHL_EXPRESS" || provider === "DHL_FREIGHT") && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium flex items-center gap-2">
                                                Waybill Number *
                                                {waybillVal.valid && (
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                )}
                                            </Label>
                                            <Input
                                                value={waybillNumber}
                                                onChange={(e) => setWaybillNumber(e.target.value.toUpperCase())}
                                                placeholder={provider === "DHL_EXPRESS" ? "1234567890" : "ABC1234567"}
                                                className={cn(
                                                    "font-mono text-base tracking-wide",
                                                    waybillVal.valid && "border-green-500/60",
                                                    !waybillVal.valid && waybillNumber.length > 0 && "border-amber-500/60"
                                                )}
                                                maxLength={provider === "DHL_EXPRESS" ? 10 : 15}
                                            />
                                            {waybillNumber.length > 0 && !waybillVal.valid && (
                                                <p className="text-xs text-amber-600 flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" /> {waybillVal.error}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Other carrier */}
                                    {provider === "OTHER" && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm">Carrier *</Label>
                                                <Input
                                                    value={carrier}
                                                    onChange={(e) => setCarrier(e.target.value)}
                                                    placeholder="e.g. FedEx"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm">Tracking # *</Label>
                                                <Input
                                                    value={trackingNumber}
                                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                                    placeholder="Tracking number"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Divider */}
                                    <div className="border-t pt-4" />

                                    {/* Dates — yyyy/mm/dd via DatePicker (same as project creation) */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm">Dispatch Date</Label>
                                            <DatePicker
                                                value={dispatchDate}
                                                onChange={setDispatchDate}
                                                placeholder="yyyy/mm/dd"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm">Expected Arrival</Label>
                                            <DatePicker
                                                value={expectedArrival}
                                                onChange={setExpectedArrival}
                                                placeholder="yyyy/mm/dd"
                                            />
                                        </div>
                                    </div>

                                    {/* Origin / Destination — Google Maps location picker */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                                Origin
                                            </Label>
                                            <LocationAutocomplete
                                                name="origin"
                                                placeholder="Search origin city or address..."
                                                defaultValue={origin}
                                                onSelect={(loc) => setOrigin(loc.address)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                                Destination
                                            </Label>
                                            <LocationAutocomplete
                                                name="destination"
                                                placeholder="Search destination city or address..."
                                                defaultValue={destination}
                                                onSelect={(loc) => setDestination(loc.address)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ====== STEP 2: Upload Document ====== */}
                    {step === 2 && (
                        <ShipmentUploadStep
                            onExtractionComplete={handleExtractionComplete}
                            onSkip={handleSkipUpload}
                            isExtracting={isExtracting}
                            setIsExtracting={setIsExtracting}
                        />
                    )}

                    {/* ====== STEP 3: Review & Edit ====== */}
                    {step === 3 && (
                        <div className="space-y-4">
                            {extractionResult ? (
                                <ShipmentReviewStep
                                    extractionResult={extractionResult}
                                    items={extractedItems}
                                    onItemsChange={setExtractedItems}
                                />
                            ) : (
                                <div className="text-center py-12 text-sm text-muted-foreground space-y-2">
                                    <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
                                    <p>No document uploaded — shipment will be created without item details.</p>
                                    <button
                                        onClick={() => setStep(2)}
                                        className="text-blue-500 hover:underline text-xs"
                                    >
                                        Go back and upload a packing list
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ---- Footer ---- */}
                <SheetFooter className="border-t px-6 py-4 bg-background">
                    <div className="flex items-center justify-between w-full">
                        {/* Back button */}
                        {step > 1 ? (
                            <Button
                                variant="ghost"
                                onClick={() => setStep((step - 1) as WizardStep)}
                                disabled={isExtracting}
                                className="gap-1.5"
                            >
                                <ArrowLeft className="h-4 w-4" /> Back
                            </Button>
                        ) : (
                            <div />
                        )}

                        {/* Forward / Submit */}
                        {step === 1 && (
                            <Button
                                onClick={() => setStep(2)}
                                disabled={!provider || !isTrackingValid()}
                                className="gap-1.5"
                            >
                                Next <ArrowRight className="h-4 w-4" />
                            </Button>
                        )}
                        {step === 2 && !isExtracting && (
                            <div /> // Upload step has its own Extract/Skip buttons
                        )}
                        {step === 3 && (
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !isTrackingValid()}
                                className="gap-2 min-w-[160px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" /> Submit Shipment
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
