"use client";

/**
 * Shipment Review Step
 *
 * Editable table showing extracted packing list items.
 * Allows users to review, edit, add, and remove items before submission.
 */

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
    Package,
    Weight,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
    ExtractedShipmentResult,
    ExtractedItemResult,
} from "./shipment-upload-step";

interface ShipmentReviewStepProps {
    extractionResult: ExtractedShipmentResult;
    items: ExtractedItemResult[];
    onItemsChange: (items: ExtractedItemResult[]) => void;
}

function generateItemId(): string {
    return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyItem(): ExtractedItemResult {
    return {
        id: generateItemId(),
        articleNumber: "",
        description: "",
        quantity: 0,
        unit: "",
        unitPrice: null,
        totalPrice: null,
        weightKg: null,
        hsCode: null,
        countryOfOrigin: null,
        deliveryNote: null,
        packages: [],
    };
}

/**
 * Confidence level indicator component
 */
function ConfidenceBadge({ confidence }: { confidence: number }) {
    const pct = Math.round(confidence * 100);
    const variant =
        pct >= 80 ? "default" : pct >= 50 ? "secondary" : "destructive";
    const icon =
        pct >= 80 ? (
            <CheckCircle2 className="h-3 w-3" />
        ) : (
            <AlertCircle className="h-3 w-3" />
        );

    return (
        <Badge variant={variant} className="gap-1 text-xs">
            {icon} {pct}% confidence
        </Badge>
    );
}

/**
 * Summary header showing extracted metadata
 */
function ExtractionSummary({
    data,
}: {
    data: ExtractedShipmentResult;
}) {
    const summaryFields = [
        { label: "Order", value: data.orderNumber },
        { label: "Project", value: data.project },
        { label: "Supplier", value: data.supplierName },
        { label: "Invoice", value: data.invoiceNumber },
        { label: "Delivery", value: data.deliveryConditions },
        { label: "Origin", value: data.origin },
        { label: "Destination", value: data.destination },
    ].filter((f) => f.value);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Extracted Data</span>
                </div>
                <ConfidenceBadge confidence={data.confidence} />
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {summaryFields.map((field) => (
                    <div
                        key={field.label}
                        className="px-3 py-1.5 rounded-md bg-muted/50 text-xs"
                    >
                        <span className="text-muted-foreground">{field.label}: </span>
                        <span className="font-medium">{field.value}</span>
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {data.totalGrossWeightKg && (
                    <span className="flex items-center gap-1">
                        <Weight className="h-3 w-3" />
                        {data.totalGrossWeightKg.toLocaleString()} kg gross
                    </span>
                )}
                {data.totalNetWeightKg && (
                    <span>
                        {data.totalNetWeightKg.toLocaleString()} kg net
                    </span>
                )}
                {data.currency && data.totalExclVat && (
                    <span>
                        {data.totalExclVat.toLocaleString()} {data.currency} excl. VAT
                    </span>
                )}
            </div>
        </div>
    );
}

/**
 * Single editable item row with collapsible packages
 */
function ItemRow({
    item,
    index,
    onUpdate,
    onRemove,
}: {
    item: ExtractedItemResult;
    index: number;
    onUpdate: (updated: ExtractedItemResult) => void;
    onRemove: () => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasPackages = item.packages.length > 0;

    const updateField = <K extends keyof ExtractedItemResult>(
        field: K,
        value: ExtractedItemResult[K]
    ) => {
        onUpdate({ ...item, [field]: value });
    };

    return (
        <>
            <TableRow className="group">
                <TableCell className="w-8 text-xs text-muted-foreground">
                    {index + 1}
                </TableCell>
                <TableCell className="min-w-[80px]">
                    <Input
                        value={item.articleNumber}
                        onChange={(e) => updateField("articleNumber", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Art #"
                    />
                </TableCell>
                <TableCell className="min-w-[200px]">
                    <Input
                        value={item.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Description"
                    />
                </TableCell>
                <TableCell className="w-20">
                    <Input
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) =>
                            updateField("quantity", parseFloat(e.target.value) || 0)
                        }
                        className="h-7 text-xs"
                        placeholder="0"
                    />
                </TableCell>
                <TableCell className="w-16">
                    <Input
                        value={item.unit}
                        onChange={(e) => updateField("unit", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="M2"
                    />
                </TableCell>
                <TableCell className="w-24">
                    <Input
                        type="number"
                        value={item.weightKg ?? ""}
                        onChange={(e) =>
                            updateField(
                                "weightKg",
                                e.target.value ? parseFloat(e.target.value) : null
                            )
                        }
                        className="h-7 text-xs"
                        placeholder="kg"
                    />
                </TableCell>
                <TableCell className="w-24">
                    <Input
                        value={item.hsCode ?? ""}
                        onChange={(e) =>
                            updateField("hsCode", e.target.value || null)
                        }
                        className="h-7 text-xs"
                        placeholder="HS code"
                    />
                </TableCell>
                <TableCell className="w-10">
                    <div className="flex items-center gap-1">
                        {hasPackages && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                ) : (
                                    <ChevronRight className="h-3 w-3" />
                                )}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={onRemove}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>

            {/* Expandable packages sub-table */}
            {isExpanded && hasPackages && (
                <TableRow>
                    <TableCell colSpan={8} className="p-0 bg-muted/30">
                        <Collapsible open={isExpanded}>
                            <CollapsibleTrigger className="hidden" />
                            <CollapsibleContent>
                                <div className="px-4 py-2">
                                    <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1.5 tracking-wider">
                                        Packages ({item.packages.length})
                                    </p>
                                    <div className="grid grid-cols-5 gap-2 text-[10px] font-medium text-muted-foreground mb-1">
                                        <span>Package No.</span>
                                        <span>Length (m)</span>
                                        <span>Qty</span>
                                        <span>Area (m²)</span>
                                        <span>Weight (kg)</span>
                                    </div>
                                    {item.packages.map((pkg, pkgIdx) => (
                                        <div
                                            key={pkgIdx}
                                            className="grid grid-cols-5 gap-2 text-xs py-0.5 border-b border-border/50 last:border-0"
                                        >
                                            <span className="font-mono text-[10px]">
                                                {pkg.packageNo}
                                            </span>
                                            <span>{pkg.lengthM?.toFixed(3) ?? "—"}</span>
                                            <span>{pkg.quantity}</span>
                                            <span>{pkg.totalAreaM2?.toFixed(3) ?? "—"}</span>
                                            <span>
                                                {pkg.grossWeightKg?.toLocaleString() ?? "—"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

/**
 * Main review step component
 */
export function ShipmentReviewStep({
    extractionResult,
    items,
    onItemsChange,
}: ShipmentReviewStepProps) {
    const handleUpdateItem = (index: number, updated: ExtractedItemResult) => {
        const newItems = [...items];
        newItems[index] = updated;
        onItemsChange(newItems);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        onItemsChange(newItems);
    };

    const handleAddItem = () => {
        onItemsChange([...items, createEmptyItem()]);
    };

    const totalWeight = items.reduce(
        (sum, item) => sum + (item.weightKg || 0),
        0
    );

    return (
        <div className="space-y-4">
            {/* Summary header */}
            <ExtractionSummary data={extractionResult} />

            {/* Items table */}
            <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                    <span className="text-xs font-medium">
                        {items.length} item{items.length !== 1 ? "s" : ""} extracted
                        {totalWeight > 0 && (
                            <span className="text-muted-foreground ml-2">
                                · {totalWeight.toLocaleString()} kg total
                            </span>
                        )}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={handleAddItem}
                    >
                        <Plus className="h-3 w-3" /> Add Item
                    </Button>
                </div>

                <div className={cn(
                    "overflow-auto",
                    items.length > 8 ? "max-h-[400px]" : ""
                )}>
                    <Table>
                        <TableHeader>
                            <TableRow className="text-xs">
                                <TableHead className="w-8">#</TableHead>
                                <TableHead>Article</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Weight</TableHead>
                                <TableHead>HS Code</TableHead>
                                <TableHead className="w-10" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, index) => (
                                <ItemRow
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    onUpdate={(updated) =>
                                        handleUpdateItem(index, updated)
                                    }
                                    onRemove={() => handleRemoveItem(index)}
                                />
                            ))}
                            {items.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="text-center py-8 text-sm text-muted-foreground"
                                    >
                                        No items. Click &quot;Add Item&quot; to add manually.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
