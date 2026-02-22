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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
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

    const [submitAsOtherOffer, setSubmitAsOtherOffer] = useState<string | null>(null);

    // Provider + tracking
    const [provider, setProvider] = useState<LogisticsProvider | undefined>();
    const [containerNumber, setContainerNumber] = useState("");
    const [billOfLading, setBillOfLading] = useState("");
    const [waybillNumber, setWaybillNumber] = useState("");
    const [trackingNumber, setTrackingNumber] = useState("");
    const [containerVal, setContainerVal] = useState<{ valid: boolean; error?: string; normalized?: string }>({ valid: false });
    const [waybillVal, setWaybillVal] = useState<{ valid: boolean; error?: string; normalized?: string }>({ valid: false });

    // Simple fields
    const [dispatchDate, setDispatchDate] = useState<Date | undefined>();
    const [expectedArrival, setExpectedArrival] = useState<Date | undefined>();
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");

    // Extraction
    type ExtractedItemWithSource = ExtractedItemResult & { packingListId: string };
    type PackingListState = {
        id: string;
        fileName: string;
        extractedAt: string;
        result: ExtractedShipmentResult;
        items: ExtractedItemWithSource[];
    };

    const [packingLists, setPackingLists] = useState<PackingListState[]>([]);
    const [activePackingListId, setActivePackingListId] = useState<string>("ALL");

    // BOQ comparison
    type BOQItemLite = {
        id: string;
        itemNumber: string;
        description: string;
        unit: string;
        quantity: string;
    };

    const [boqItems, setBoqItems] = useState<BOQItemLite[]>([]);
    const [boqLoadError, setBoqLoadError] = useState<string | null>(null);

    const extractionSummary: ExtractedShipmentResult | null = (() => {
        if (packingLists.length === 0) return null;

        const results = packingLists.map((p) => p.result);
        const firstCurrency = results.find((r) => !!r.currency)?.currency ?? null;
        const currenciesMatch = results.every((r) => !r.currency || r.currency === firstCurrency);

        const sum = (values: Array<number | null | undefined>) => {
            const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
            if (nums.length === 0) return null;
            return nums.reduce((a, b) => a + b, 0);
        };

        const avgConfidence = results.reduce((acc, r) => acc + (r.confidence ?? 0), 0) / results.length;

        return {
            orderNumber: results.find((r) => r.orderNumber)?.orderNumber ?? null,
            project: results.find((r) => r.project)?.project ?? null,
            invoiceNumber: results.find((r) => r.invoiceNumber)?.invoiceNumber ?? null,
            invoiceDate: results.find((r) => r.invoiceDate)?.invoiceDate ?? null,
            supplierName: results.find((r) => r.supplierName)?.supplierName ?? null,
            customerName: results.find((r) => r.customerName)?.customerName ?? null,
            deliveryConditions: results.find((r) => r.deliveryConditions)?.deliveryConditions ?? null,
            deliveryAddress: results.find((r) => r.deliveryAddress)?.deliveryAddress ?? null,
            origin: results.find((r) => r.origin)?.origin ?? null,
            destination: results.find((r) => r.destination)?.destination ?? null,
            currency: currenciesMatch ? firstCurrency : null,
            totalExclVat: currenciesMatch ? sum(results.map((r) => r.totalExclVat)) : null,
            totalInclVat: currenciesMatch ? sum(results.map((r) => r.totalInclVat)) : null,
            totalGrossWeightKg: sum(results.map((r) => r.totalGrossWeightKg)),
            totalNetWeightKg: sum(results.map((r) => r.totalNetWeightKg)),
            items: [],
            confidence: Number.isFinite(avgConfidence) ? avgConfidence : 0,
        };
    })();

    const allItems: ExtractedItemWithSource[] = packingLists.flatMap((p) => p.items);
    const activePackingList = packingLists.find((p) => p.id === activePackingListId) || null;
    const viewItems: ExtractedItemWithSource[] = activePackingListId === "ALL" ? allItems : (activePackingList?.items ?? []);
    const viewExtraction: ExtractedShipmentResult | null = activePackingListId === "ALL" ? extractionSummary : (activePackingList?.result ?? null);

    useEffect(() => {
        if (!open) return;
        if (!purchaseOrderId) return;

        let cancelled = false;
        (async () => {
            try {
                setBoqLoadError(null);
                const res = await fetch(`/api/boq-items?action=list&purchaseOrderId=${encodeURIComponent(purchaseOrderId)}`);
                const json = await res.json();
                if (!res.ok || !json?.success) {
                    throw new Error(json?.error || "Failed to fetch BOQ items");
                }
                if (cancelled) return;
                const rawItems = (json.items || []) as unknown[];
                const parsed: BOQItemLite[] = rawItems
                    .map((it) => {
                        const obj = it as Partial<BOQItemLite>;
                        if (!obj.id || !obj.itemNumber) return null;
                        return {
                            id: String(obj.id),
                            itemNumber: String(obj.itemNumber),
                            description: String(obj.description ?? ""),
                            unit: String(obj.unit ?? ""),
                            quantity: String(obj.quantity ?? "0"),
                        } satisfies BOQItemLite;
                    })
                    .filter((v): v is BOQItemLite => v !== null);

                setBoqItems(parsed);
            } catch (e) {
                if (cancelled) return;
                setBoqItems([]);
                setBoqLoadError(e instanceof Error ? e.message : "Failed to fetch BOQ items");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, purchaseOrderId]);

    const normalizeId = (value: string) => value.toUpperCase().replace(/[\s-]/g, "");
    const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

    const boqCheck = (() => {
        if (!boqItems || boqItems.length === 0) return null;

        const extracted = viewItems;
        const extractedByArticle = new Map<string, ExtractedItemWithSource[]>();
        for (const item of extracted) {
            const key = item.articleNumber ? normalizeId(item.articleNumber) : "";
            if (!key) continue;
            const list = extractedByArticle.get(key) || [];
            list.push(item);
            extractedByArticle.set(key, list);
        }

        const boqByItemNumber = new Map<string, typeof boqItems[number]>();
        for (const b of boqItems) {
            boqByItemNumber.set(normalizeId(b.itemNumber), b);
        }

        const missingFromPackingList = boqItems.filter((b) => !extractedByArticle.has(normalizeId(b.itemNumber)));

        const notInBoq = extracted.filter((item) => {
            const key = item.articleNumber ? normalizeId(item.articleNumber) : "";
            if (!key) return false; // can't compare
            return !boqByItemNumber.has(key);
        });

        const quantityMismatches: Array<{ boq: typeof boqItems[number]; extractedQty: number; boqQty: number }> = [];
        for (const [itemNumber, b] of boqByItemNumber.entries()) {
            const matches = extractedByArticle.get(itemNumber);
            if (!matches || matches.length === 0) continue;

            const extractedQty = matches.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
            const boqQty = Number(b.quantity);
            if (!Number.isFinite(boqQty) || boqQty <= 0) continue;

            // Flag only if clearly different (avoid noise for partial deliveries)
            const ratio = extractedQty / boqQty;
            if (ratio > 1.2 || ratio < 0.8) {
                quantityMismatches.push({ boq: b, extractedQty, boqQty });
            }
        }

        // Optional secondary match if article numbers are empty: description similarity (very simple)
        const extractedMissingArticle = extracted.filter((i) => !i.articleNumber && i.description);
        const possibleDescriptionMismatches = extractedMissingArticle.length > 0
            ? extractedMissingArticle.filter((i) => {
                const needle = normalizeText(i.description);
                return needle.length > 8 && !boqItems.some((b) => normalizeText(b.description) === needle);
            })
            : [];

        return {
            missingFromPackingList,
            notInBoq,
            quantityMismatches,
            possibleDescriptionMismatches,
        };
    })();

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

    // Clear fallback offer when provider/tracking changes
    useEffect(() => {
        setSubmitAsOtherOffer(null);
    }, [provider, waybillNumber]);

    // --- Helpers ---
    const isTrackingValid = () => {
        switch (provider) {
            case "MAERSK": return containerVal.valid;
            case "DHL_EXPRESS":
            case "DHL_FREIGHT": return waybillVal.valid;
            case "OTHER": return trackingNumber.trim().length > 0;
            default: return false;
        }
    };

    const generatePackingListId = () => `pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const handleExtractionComplete = (result: ExtractedShipmentResult) => {
        const id = generatePackingListId();
        const fileName = result.sourceFileName || `Packing list ${packingLists.length + 1}`;
        const extractedAt = result.extractedAt || new Date().toISOString();
        const itemsWithSource: ExtractedItemWithSource[] = (result.items || []).map((it) => ({
            ...(it as ExtractedItemResult),
            packingListId: id,
        }));

        setPackingLists((prev) => [
            ...prev,
            { id, fileName, extractedAt, result, items: itemsWithSource },
        ]);
        setActivePackingListId(id);
        if (result.origin && !origin) setOrigin(result.origin);
        if ((result.destination || result.deliveryAddress) && !destination)
            setDestination(result.destination || result.deliveryAddress || "");
        setStep(3);
    };

    const handleSkipUpload = () => {
        // If user is adding an additional packing list, don't wipe prior results.
        if (packingLists.length === 0) setActivePackingListId("ALL");
        setStep(3);
    };

    const resetForm = () => {
        setStep(1);
        setProvider(undefined);
        setContainerNumber(""); setBillOfLading("");
        setWaybillNumber(""); setTrackingNumber("");
        setContainerVal({ valid: false }); setWaybillVal({ valid: false });
        setDispatchDate(undefined); setExpectedArrival(undefined);
        setOrigin(""); setDestination("");
        setPackingLists([]);
        setActivePackingListId("ALL");
        setSubmitAsOtherOffer(null);
    };

    const normalizeTracking = (value: string) => value.toUpperCase().replace(/[\s-]/g, "");

    // --- Submit ---
    const handleSubmit = async () => {
        if (!provider || !isTrackingValid()) return;
        setIsSubmitting(true);
        try {
            const items = allItems.map((item) => ({
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
                    carrier: provider === "OTHER" ? undefined : provider.toLowerCase().replace("_", "-"),
                    dispatchDate: dispatchDate ? dispatchDate.toISOString().split("T")[0] : undefined,
                    supplierAos: expectedArrival ? expectedArrival.toISOString().split("T")[0] : undefined,
                    originLocation: origin || undefined,
                    destination: destination || undefined,
                    items: items.length > 0 ? items : undefined,
                }),
            });

            const result = await res.json();
            if (!res.ok || !result.success) {
                if (
                    (provider === "DHL_EXPRESS" || provider === "DHL_FREIGHT") &&
                    result?.canSubmitAsOther
                ) {
                    setSubmitAsOtherOffer(result.error || "Tracking number not found — submit as Other?");
                }
                throw new Error(result.error || "Failed");
            }

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

    const handleSubmitAsOther = async () => {
        if (provider !== "DHL_EXPRESS" && provider !== "DHL_FREIGHT") return;
        if (!waybillNumber.trim()) return;

        setIsSubmitting(true);
        try {
            const items = allItems.map((item) => ({
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
                    provider: "OTHER",
                    trackingNumber: normalizeTracking(waybillNumber),
                    carrier: undefined,
                    dispatchDate: dispatchDate ? dispatchDate.toISOString().split("T")[0] : undefined,
                    supplierAos: expectedArrival ? expectedArrival.toISOString().split("T")[0] : undefined,
                    originLocation: origin || undefined,
                    destination: destination || undefined,
                    items: items.length > 0 ? items : undefined,
                }),
            });

            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Failed");

            toast.success("Shipment submitted as Other.");
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
                                        <div className="space-y-2">
                                            <Label className="text-sm">Tracking Number *</Label>
                                            <Input
                                                value={trackingNumber}
                                                onChange={(e) => setTrackingNumber(e.target.value)}
                                                placeholder="Any tracking number"
                                            />
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
                            {submitAsOtherOffer && (provider === "DHL_EXPRESS" || provider === "DHL_FREIGHT") && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium">Tracking number not found</p>
                                            <p className="text-xs text-amber-800/90 mt-0.5">{submitAsOtherOffer}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs text-muted-foreground">
                                        Packing lists: <span className="font-medium text-foreground">{packingLists.length}</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setStep(2)}
                                        disabled={isExtracting || isSubmitting}
                                    >
                                        {packingLists.length > 0 ? "Add packing list" : "Upload packing list"}
                                    </Button>
                                </div>

                                {packingLists.length > 0 && (
                                    <Tabs value={activePackingListId} onValueChange={setActivePackingListId}>
                                        <TabsList className="w-full justify-start overflow-x-auto">
                                            <TabsTrigger value="ALL" className="text-xs">All items</TabsTrigger>
                                            {packingLists.map((p, idx) => (
                                                <TabsTrigger key={p.id} value={p.id} className="text-xs">
                                                    {`PL ${idx + 1}: ${p.fileName}`}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                        <TabsContent value={activePackingListId} className="mt-0" />
                                    </Tabs>
                                )}

                                {packingLists.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                        {activePackingListId === "ALL" ? (
                                            <>
                                                Showing <span className="font-medium text-foreground">{allItems.length}</span> item{allItems.length !== 1 ? "s" : ""} from all packing lists.
                                                <span className="ml-2">Select a packing list to add new items.</span>
                                            </>
                                        ) : activePackingList ? (
                                            <>
                                                <span className="font-medium text-foreground">{activePackingList.fileName}</span>
                                                <span className="mx-2">·</span>
                                                Extracted {new Date(activePackingList.extractedAt).toLocaleString()}
                                                <span className="mx-2">·</span>
                                                <span className="font-medium text-foreground">{activePackingList.items.length}</span> item{activePackingList.items.length !== 1 ? "s" : ""}
                                            </>
                                        ) : null}
                                    </div>
                                )}
                            </div>

                            {viewExtraction ? (
                                <>
                                    {/* BOQ comparison */}
                                    {boqLoadError && (
                                        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                                            BOQ check unavailable: {boqLoadError}
                                        </div>
                                    )}

                                    {boqCheck && (
                                        <div className="rounded-lg border">
                                            <div className="px-4 py-3 flex items-start justify-between gap-4">
                                                <div className="space-y-0.5">
                                                    <div className="text-sm font-medium">BOQ check</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Flags items that look out of sync between BOQ and the selected packing list view.
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2 justify-end">
                                                    <Badge variant={boqCheck.missingFromPackingList.length > 0 ? "destructive" : "secondary"}>
                                                        Missing {boqCheck.missingFromPackingList.length}
                                                    </Badge>
                                                    <Badge variant={boqCheck.notInBoq.length > 0 ? "destructive" : "secondary"}>
                                                        Not in BOQ {boqCheck.notInBoq.length}
                                                    </Badge>
                                                    <Badge variant={boqCheck.quantityMismatches.length > 0 ? "secondary" : "secondary"}>
                                                        Qty diff {boqCheck.quantityMismatches.length}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {(boqCheck.missingFromPackingList.length > 0 || boqCheck.notInBoq.length > 0 || boqCheck.quantityMismatches.length > 0) ? (
                                                <div className="px-4 pb-3 text-xs text-muted-foreground">
                                                    If these look unexpected, the packing list might be for a different PO, or the delivery could be partial.
                                                </div>
                                            ) : (
                                                <div className="px-4 pb-3 text-xs text-muted-foreground">
                                                    Looks consistent with BOQ based on item numbers.
                                                </div>
                                            )}

                                            <div className="border-t">
                                                <Accordion type="multiple" className="px-4">
                                                    <AccordionItem value="missing">
                                                        <AccordionTrigger className="py-3">
                                                            <div className="flex items-center gap-2">
                                                                <span>BOQ items missing from packing list</span>
                                                                <Badge variant={boqCheck.missingFromPackingList.length > 0 ? "destructive" : "secondary"}>
                                                                    {boqCheck.missingFromPackingList.length}
                                                                </Badge>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent>
                                                            {boqCheck.missingFromPackingList.length === 0 ? (
                                                                <div className="text-xs text-muted-foreground">No missing BOQ items detected in this view.</div>
                                                            ) : (
                                                                <ScrollArea className="h-36 rounded-md border bg-muted/20">
                                                                    <div className="p-2 space-y-1">
                                                                        {boqCheck.missingFromPackingList.slice(0, 50).map((b) => (
                                                                            <div key={b.id} className="text-xs">
                                                                                <span className="font-medium">{b.itemNumber}</span>
                                                                                <span className="text-muted-foreground"> — {b.description}</span>
                                                                            </div>
                                                                        ))}
                                                                        {boqCheck.missingFromPackingList.length > 50 && (
                                                                            <div className="text-xs text-muted-foreground pt-1">
                                                                                Showing 50 of {boqCheck.missingFromPackingList.length}.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </ScrollArea>
                                                            )}
                                                        </AccordionContent>
                                                    </AccordionItem>

                                                    <AccordionItem value="notInBoq">
                                                        <AccordionTrigger className="py-3">
                                                            <div className="flex items-center gap-2">
                                                                <span>Packing list items not found in BOQ</span>
                                                                <Badge variant={boqCheck.notInBoq.length > 0 ? "destructive" : "secondary"}>
                                                                    {boqCheck.notInBoq.length}
                                                                </Badge>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent>
                                                            {boqCheck.notInBoq.length === 0 ? (
                                                                <div className="text-xs text-muted-foreground">No packing list-only items detected in this view.</div>
                                                            ) : (
                                                                <ScrollArea className="h-36 rounded-md border bg-muted/20">
                                                                    <div className="p-2 space-y-1">
                                                                        {boqCheck.notInBoq.slice(0, 50).map((i) => (
                                                                            <div key={i.id} className="text-xs">
                                                                                <span className="font-medium">{i.articleNumber || "(no article #)"}</span>
                                                                                <span className="text-muted-foreground"> — {i.description}</span>
                                                                            </div>
                                                                        ))}
                                                                        {boqCheck.notInBoq.length > 50 && (
                                                                            <div className="text-xs text-muted-foreground pt-1">
                                                                                Showing 50 of {boqCheck.notInBoq.length}.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </ScrollArea>
                                                            )}
                                                        </AccordionContent>
                                                    </AccordionItem>

                                                    <AccordionItem value="qty">
                                                        <AccordionTrigger className="py-3">
                                                            <div className="flex items-center gap-2">
                                                                <span>Large quantity differences</span>
                                                                <Badge variant={boqCheck.quantityMismatches.length > 0 ? "secondary" : "secondary"}>
                                                                    {boqCheck.quantityMismatches.length}
                                                                </Badge>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent>
                                                            {boqCheck.quantityMismatches.length === 0 ? (
                                                                <div className="text-xs text-muted-foreground">No large quantity differences detected.</div>
                                                            ) : (
                                                                <ScrollArea className="h-28 rounded-md border bg-muted/20">
                                                                    <div className="p-2 space-y-1">
                                                                        {boqCheck.quantityMismatches.slice(0, 30).map((m) => (
                                                                            <div key={m.boq.id} className="text-xs">
                                                                                <span className="font-medium">{m.boq.itemNumber}</span>
                                                                                <span className="text-muted-foreground"> — BOQ {m.boqQty} vs PL {m.extractedQty}</span>
                                                                            </div>
                                                                        ))}
                                                                        {boqCheck.quantityMismatches.length > 30 && (
                                                                            <div className="text-xs text-muted-foreground pt-1">
                                                                                Showing 30 of {boqCheck.quantityMismatches.length}.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </ScrollArea>
                                                            )}
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                </Accordion>
                                            </div>
                                        </div>
                                    )}

                                <ShipmentReviewStep
                                    extractionResult={viewExtraction}
                                    items={viewItems}
                                    canAddItems={activePackingListId !== "ALL"}
                                    onItemsChange={(next) => {
                                        // In a per-packing-list view, ensure new items are tagged to that packing list.
                                        if (activePackingListId !== "ALL") {
                                            const normalized = (next as ExtractedItemWithSource[]).map((it) => ({
                                                ...(it as ExtractedItemResult),
                                                packingListId: (it as ExtractedItemWithSource).packingListId || activePackingListId,
                                            }));
                                            setPackingLists((prev) => prev.map((p) => p.id === activePackingListId ? { ...p, items: normalized } : p));
                                            return;
                                        }

                                        // In the combined view, propagate edits/removals back into each packing list by packingListId.
                                        const grouped = new Map<string, ExtractedItemWithSource[]>();
                                        for (const item of next as ExtractedItemWithSource[]) {
                                            const pid = (item as ExtractedItemWithSource).packingListId;
                                            if (!pid) continue;
                                            const bucket = grouped.get(pid) || [];
                                            bucket.push(item);
                                            grouped.set(pid, bucket);
                                        }
                                        setPackingLists((prev) => prev.map((p) => ({ ...p, items: grouped.get(p.id) || [] })));
                                    }}
                                />
                                </>
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
                            <div className="flex items-center gap-2">
                                {submitAsOtherOffer && (provider === "DHL_EXPRESS" || provider === "DHL_FREIGHT") && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleSubmitAsOther}
                                        disabled={isSubmitting}
                                        className="gap-2"
                                    >
                                        Submit as Other
                                    </Button>
                                )}
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !isTrackingValid()}
                                    className="gap-2 min-w-40"
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
                            </div>
                        )}
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
