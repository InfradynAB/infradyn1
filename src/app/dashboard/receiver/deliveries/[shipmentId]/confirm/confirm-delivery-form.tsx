"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    CheckCircle,
    Warning,
    Package,
    Truck,
    Camera,
    ArrowLeft,
} from "@phosphor-icons/react";
import { receiverConfirmDelivery } from "@/lib/actions/receiver-actions";
import { cn } from "@/lib/utils";

interface BOQItem {
    id: string;
    itemNumber: string;
    description: string;
    unit: string;
    quantity: string;
    quantityDelivered: string;
}

interface ConfirmDeliveryFormProps {
    shipmentId: string;
    poNumber: string;
    supplierName: string;
    projectName: string;
    carrier?: string | null;
    trackingNumber?: string | null;
    boqItems: BOQItem[];
}

type Condition = "GOOD" | "DAMAGED" | "MISSING_ITEMS";

interface DeliveryLineItem {
    boqItemId: string;
    quantityDelivered: number;
    quantityDeclared: number;
    condition: Condition;
    notes: string;
}

const CONDITION_COLORS: Record<Condition, string> = {
    GOOD: "border-emerald-500/30 bg-emerald-500/5",
    DAMAGED: "border-red-500/30 bg-red-500/5",
    MISSING_ITEMS: "border-amber-500/30 bg-amber-500/5",
};

export function ConfirmDeliveryForm({
    shipmentId,
    poNumber,
    supplierName,
    projectName,
    carrier,
    trackingNumber,
    boqItems,
}: ConfirmDeliveryFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Line items state initialized from boqItems
    const [lineItems, setLineItems] = useState<DeliveryLineItem[]>(
        boqItems.map((item) => ({
            boqItemId: item.id,
            quantityDelivered: 0,
            quantityDeclared: 0,
            condition: "GOOD" as Condition,
            notes: "",
        }))
    );

    const [isPartial, setIsPartial] = useState(false);
    const [notes, setNotes] = useState("");
    const [hasAttempted, setHasAttempted] = useState(false);

    function updateLine(index: number, field: keyof DeliveryLineItem, value: any) {
        setLineItems((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }

    function hasAnyDamaged() {
        return lineItems.some((l) => l.condition === "DAMAGED" || l.condition === "MISSING_ITEMS");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setHasAttempted(true);

        // Validate at least one item has quantity > 0
        const activeItems = lineItems.filter((l) => l.quantityDelivered > 0);
        if (activeItems.length === 0) {
            toast.error("Enter at least one delivered quantity.");
            return;
        }

        const formData = new FormData();
        formData.set("shipmentId", shipmentId);
        formData.set("isPartial", String(isPartial));
        formData.set("notes", notes);
        formData.set("photoDocIds", "[]");
        formData.set(
            "items",
            JSON.stringify(
                activeItems.map((l) => ({
                    boqItemId: l.boqItemId,
                    quantityDelivered: l.quantityDelivered,
                    quantityDeclared: l.quantityDeclared || undefined,
                    condition: l.condition,
                    notes: l.notes || undefined,
                }))
            )
        );

        startTransition(async () => {
            const result = await receiverConfirmDelivery(formData);
            if (result.success) {
                toast.success("Delivery confirmed successfully!");
                router.push("/dashboard/receiver/deliveries?tab=confirmed");
            } else {
                toast.error(result.error || "Failed to confirm delivery");
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Shipment Info Header ────────────────────────────────────────── */}
            <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="py-4">
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">PO Number</p>
                            <p className="font-semibold">{poNumber}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Supplier</p>
                            <p className="font-medium truncate">{supplierName}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Project</p>
                            <p className="font-medium truncate">{projectName}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Carrier</p>
                            <p className="font-medium">{carrier ?? "—"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── BOQ Line Items ──────────────────────────────────────────────── */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Material Items
                </h2>
                {boqItems.map((item, index) => {
                    const line = lineItems[index];
                    return (
                        <Card
                            key={item.id}
                            className={cn(
                                "border transition-colors",
                                line.condition !== "GOOD" && hasAttempted
                                    ? CONDITION_COLORS[line.condition]
                                    : "border-border/70"
                            )}
                        >
                            <CardContent className="py-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold truncate">{item.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                            #{item.itemNumber} · Unit: {item.unit} · Ordered: {item.quantity}
                                        </p>
                                    </div>
                                    <Select
                                        value={line.condition}
                                        onValueChange={(v) => updateLine(index, "condition", v as Condition)}
                                    >
                                        <SelectTrigger className="w-36 h-8 text-xs shrink-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="GOOD">
                                                <span className="flex items-center gap-1.5">
                                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                                    Good
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="DAMAGED">
                                                <span className="flex items-center gap-1.5">
                                                    <Warning className="h-3.5 w-3.5 text-red-500" weight="fill" />
                                                    Damaged
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="MISSING_ITEMS">
                                                <span className="flex items-center gap-1.5">
                                                    <Package className="h-3.5 w-3.5 text-amber-500" />
                                                    Missing Items
                                                </span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor={`qty-${item.id}`} className="text-xs">
                                            Qty Received *
                                        </Label>
                                        <Input
                                            id={`qty-${item.id}`}
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="h-8 text-sm"
                                            value={line.quantityDelivered || ""}
                                            onChange={(e) =>
                                                updateLine(index, "quantityDelivered", parseFloat(e.target.value) || 0)
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`decl-${item.id}`} className="text-xs">
                                            Qty on Delivery Note
                                        </Label>
                                        <Input
                                            id={`decl-${item.id}`}
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="h-8 text-sm"
                                            value={line.quantityDeclared || ""}
                                            onChange={(e) =>
                                                updateLine(index, "quantityDeclared", parseFloat(e.target.value) || 0)
                                            }
                                        />
                                    </div>
                                </div>

                                {(line.condition === "DAMAGED" || line.condition === "MISSING_ITEMS") && (
                                    <div className="space-y-1">
                                        <Label htmlFor={`note-${item.id}`} className="text-xs text-red-600">
                                            Issue Details *
                                        </Label>
                                        <Textarea
                                            id={`note-${item.id}`}
                                            rows={2}
                                            className="text-xs"
                                            placeholder="Describe the damage or missing items…"
                                            value={line.notes}
                                            onChange={(e) => updateLine(index, "notes", e.target.value)}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* ── Delivery Options ───────────────────────────────────────────── */}
            <Card>
                <CardContent className="py-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="isPartial"
                            checked={isPartial}
                            onChange={(e) => setIsPartial(e.target.checked)}
                            className="h-4 w-4 rounded border-input accent-cyan-600"
                        />
                        <Label htmlFor="isPartial" className="text-sm cursor-pointer">
                            This is a partial delivery (more items expected)
                        </Label>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="notes" className="text-sm">
                            General Notes / Comments
                        </Label>
                        <Textarea
                            id="notes"
                            rows={3}
                            placeholder="Any additional notes about this delivery…"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ── Raise NCR hint ─────────────────────────────────────────────── */}
            {hasAnyDamaged() && (
                <Card className="border-red-500/20 bg-red-500/5">
                    <CardContent className="py-3 flex items-center gap-3">
                        <Warning className="h-5 w-5 text-red-500 shrink-0" weight="fill" />
                        <div className="text-sm">
                            <p className="font-medium text-red-700 dark:text-red-400">
                                Damaged or missing items detected
                            </p>
                            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                                After confirming, you can raise an NCR from the NCR section.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Actions ────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isPending}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-cyan-600 hover:bg-cyan-700"
                >
                    {isPending ? (
                        <>Confirming…</>
                    ) : (
                        <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirm Delivery
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
