"use client";

/**
 * Phase 6: Multi-Provider Delivery Confirmation Card
 * 
 * Provider-specific verification:
 * - Maersk: Seal verification, weight reconciliation
 * - DHL: POD signature display, delivery photo
 * - Other: Basic quantity confirmation
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    CheckCircle, AlertTriangle, ShieldCheck, ShieldX,
    Scale, Container, Truck, Plane, Ship, Signature
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProviderBadge, LogisticsProvider } from "./provider-selector";

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
        provider?: LogisticsProvider | null;
        // Maersk fields
        containerNumber?: string | null;
        sealNumber?: string | null;
        maerskWeight?: string | null;
        supplierWeight?: string | null;
        vesselName?: string | null;
        // DHL fields
        waybillNumber?: string | null;
        dhlService?: string | null;
        podSignatureUrl?: string | null;
        podSignedBy?: string | null;
        podSignedAt?: Date | null;
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

    // Maersk-specific fields
    const [isSealIntact, setIsSealIntact] = useState<boolean | null>(null);
    const [isContainerStripped, setIsContainerStripped] = useState(false);
    const [receivedWeight, setReceivedWeight] = useState("");
    const [sealNotes, setSealNotes] = useState("");

    // DHL-specific fields
    const [podVerified, setPodVerified] = useState(false);

    // Initialize delivery items
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

    // Determine provider
    const provider = shipment.provider as LogisticsProvider | undefined;
    const isMaersk = provider === 'MAERSK';
    const isDHL = provider === 'DHL_EXPRESS' || provider === 'DHL_FREIGHT';

    // Weight calculations (Maersk)
    const maerskWeightNum = Number(shipment.maerskWeight) || 0;
    const supplierWeightNum = Number(shipment.supplierWeight) || 0;
    const receivedWeightNum = Number(receivedWeight) || 0;
    const weightVariance = receivedWeightNum > 0 && supplierWeightNum > 0
        ? ((receivedWeightNum - supplierWeightNum) / supplierWeightNum * 100).toFixed(1)
        : null;
    const hasWeightVariance = weightVariance && Math.abs(Number(weightVariance)) > 5;

    const handleSubmit = async () => {
        // Validate Maersk seal check
        if (isMaersk && shipment.sealNumber && isSealIntact === null) {
            toast.error("Please verify if the seal is intact");
            return;
        }

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
                    // Provider-specific
                    isSealIntact: isMaersk ? isSealIntact : undefined,
                    isContainerStripped: isMaersk ? isContainerStripped : undefined,
                    receivedWeight: isMaersk ? receivedWeightNum : undefined,
                    sealNotes: isMaersk && isSealIntact === false ? sealNotes : undefined,
                    podVerified: isDHL ? podVerified : undefined,
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
    const hasSealIssue = isMaersk && isSealIntact === false;

    // Provider icon
    const ProviderIcon = isMaersk ? Ship : isDHL ? (shipment.dhlService === 'freight' ? Truck : Plane) : Container;

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
                        <ProviderIcon className="h-5 w-5 text-blue-600" />
                        Confirm Delivery
                        {provider && <ProviderBadge provider={provider} size="sm" />}
                    </DialogTitle>
                    <DialogDescription>
                        Verify delivery details and confirm received quantities.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Shipment Info */}
                    <Card className="bg-slate-50">
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                {isMaersk && shipment.containerNumber && (
                                    <div>
                                        <span className="text-muted-foreground text-xs uppercase">Container</span>
                                        <p className="font-mono font-medium">{shipment.containerNumber}</p>
                                    </div>
                                )}
                                {isDHL && shipment.waybillNumber && (
                                    <div>
                                        <span className="text-muted-foreground text-xs uppercase">Waybill</span>
                                        <p className="font-mono font-medium">{shipment.waybillNumber}</p>
                                    </div>
                                )}
                                {shipment.vesselName && (
                                    <div>
                                        <span className="text-muted-foreground text-xs uppercase">Vessel</span>
                                        <p className="font-medium">{shipment.vesselName}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-muted-foreground text-xs uppercase">Declared Qty</span>
                                    <p className="font-medium">{shipment.declaredQty || "—"} {shipment.unit || ""}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* DHL: POD Signature Display */}
                    {isDHL && shipment.podSignatureUrl && (
                        <Card className="border-2 border-yellow-500 bg-yellow-50/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Signature className="h-5 w-5 text-yellow-600" />
                                    Proof of Delivery
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-white rounded-lg p-4 border">
                                    <img
                                        src={shipment.podSignatureUrl}
                                        alt="Delivery Signature"
                                        className="max-h-32 mx-auto"
                                    />
                                </div>
                                {shipment.podSignedBy && (
                                    <p className="text-sm text-center">
                                        Signed by: <strong>{shipment.podSignedBy}</strong>
                                        {shipment.podSignedAt && (
                                            <> on {new Date(shipment.podSignedAt).toLocaleDateString()}</>
                                        )}
                                    </p>
                                )}
                                <div className="flex items-center justify-center gap-2">
                                    <Checkbox
                                        id="podVerified"
                                        checked={podVerified}
                                        onCheckedChange={(c) => setPodVerified(Boolean(c))}
                                    />
                                    <Label htmlFor="podVerified">I confirm this is the correct delivery</Label>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Maersk: Seal Verification */}
                    {isMaersk && shipment.sealNumber && (
                        <Card className={cn(
                            "border-2",
                            isSealIntact === true && "border-green-500 bg-green-50/50",
                            isSealIntact === false && "border-red-500 bg-red-50/50"
                        )}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    {isSealIntact === true ? (
                                        <ShieldCheck className="h-5 w-5 text-green-600" />
                                    ) : isSealIntact === false ? (
                                        <ShieldX className="h-5 w-5 text-red-600" />
                                    ) : (
                                        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                                    )}
                                    Seal Verification *
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-white rounded-lg p-3 border">
                                    <p className="text-sm text-muted-foreground mb-1">Expected Seal:</p>
                                    <p className="font-mono text-lg font-bold">{shipment.sealNumber}</p>
                                </div>
                                <div className="flex gap-4">
                                    <Button
                                        type="button"
                                        variant={isSealIntact === true ? "default" : "outline"}
                                        className={cn("flex-1 gap-2", isSealIntact === true && "bg-green-600 hover:bg-green-700")}
                                        onClick={() => setIsSealIntact(true)}
                                    >
                                        <ShieldCheck className="h-4 w-4" /> Seal Intact
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={isSealIntact === false ? "destructive" : "outline"}
                                        className="flex-1 gap-2"
                                        onClick={() => setIsSealIntact(false)}
                                    >
                                        <ShieldX className="h-4 w-4" /> Seal Broken
                                    </Button>
                                </div>
                                {isSealIntact === false && (
                                    <Textarea
                                        value={sealNotes}
                                        onChange={(e) => setSealNotes(e.target.value)}
                                        placeholder="Describe the seal issue..."
                                        rows={2}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Maersk: Weight Reconciliation */}
                    {isMaersk && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Scale className="h-5 w-5" /> Weight Reconciliation (kg)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Maersk</Label>
                                        <Input value={maerskWeightNum || "—"} disabled className="bg-muted text-center font-mono" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Supplier</Label>
                                        <Input value={supplierWeightNum || "—"} disabled className="bg-muted text-center font-mono" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Received *</Label>
                                        <Input
                                            type="number"
                                            value={receivedWeight}
                                            onChange={(e) => setReceivedWeight(e.target.value)}
                                            placeholder="0"
                                            className="text-center font-mono"
                                        />
                                    </div>
                                </div>
                                {weightVariance && (
                                    <div className={cn(
                                        "mt-3 p-2 rounded text-sm text-center",
                                        hasWeightVariance ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                                    )}>
                                        {hasWeightVariance ? "⚠️" : "✓"} Variance: {weightVariance}%
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Container stripped checkbox (Maersk) */}
                    {isMaersk && (
                        <div className="flex items-center space-x-2">
                            <Checkbox id="stripped" checked={isContainerStripped} onCheckedChange={(c) => setIsContainerStripped(Boolean(c))} />
                            <Label htmlFor="stripped">Container stripped/unloaded</Label>
                        </div>
                    )}

                    {/* Items Received */}
                    <div className="space-y-4">
                        <h4 className="font-medium">Items Received</h4>
                        {items.map((item, index) => (
                            <Card key={item.boqItemId} className={cn(item.condition !== "GOOD" && "border-orange-300 bg-orange-50/50")}>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium">{item.description}</p>
                                        {item.condition !== "GOOD" && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Declared</Label>
                                            <Input type="number" value={item.declaredQty} disabled className="bg-muted" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Received</Label>
                                            <Input type="number" value={item.deliveredQty} onChange={(e) => updateItem(index, { deliveredQty: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Condition</Label>
                                            <Select value={item.condition} onValueChange={(v: "GOOD" | "DAMAGED" | "MISSING_ITEMS") => updateItem(index, { condition: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GOOD">Good</SelectItem>
                                                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                                                    <SelectItem value="MISSING_ITEMS">Missing</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {item.condition !== "GOOD" && (
                                        <Textarea value={item.notes} onChange={(e) => updateItem(index, { notes: e.target.value })} placeholder="Describe issue..." rows={2} />
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Partial delivery */}
                    <div className="flex items-center space-x-2">
                        <Checkbox id="partial" checked={isPartial} onCheckedChange={(c) => setIsPartial(Boolean(c))} />
                        <Label htmlFor="partial">This is a partial delivery</Label>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional comments..." rows={3} />
                    </div>

                    {/* Warnings */}
                    {(hasIssues || hasVariance || hasSealIssue || hasWeightVariance) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-1">
                            <p className="font-medium text-yellow-800 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" /> Review Required
                            </p>
                            {hasSealIssue && <p className="text-sm text-red-700">• Seal integrity issue</p>}
                            {hasWeightVariance && <p className="text-sm text-yellow-700">• Weight variance &gt;5%</p>}
                            {hasIssues && <p className="text-sm text-yellow-700">• Condition issues detected</p>}
                            {hasVariance && <p className="text-sm text-yellow-700">• Quantity variance detected</p>}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || Boolean(isMaersk && shipment.sealNumber && isSealIntact === null)}
                        className="gap-2"
                    >
                        <CheckCircle className="h-4 w-4" />
                        {isSubmitting ? "Confirming..." : "Confirm Delivery"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
