"use client";

import { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CircleNotch,
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  Minus,
  Equals,
  Info,
  Package,
  CurrencyDollar,
  ListBullets,
  PencilSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types for change tracking
type ChangeType = "none" | "qty_increase" | "qty_decrease" | "price_change" | "remove";

interface ItemChange {
  id: string;
  itemNumber: string;
  description: string;
  unit: string;
  originalQty: number;
  originalPrice: number;
  newQty: number;
  newPrice: number;
  changeType: ChangeType;
  maxReduction: number; // max qty that can be reduced (original - certified)
  certifiedQty: number;
}

interface NewItem {
  itemNumber: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

interface BOQItem {
  id: string;
  itemNumber: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  quantityCertified: string | null;
}

interface Milestone {
  id: string;
  title: string;
  status: string;
}

// Schema for form validation
const changeOrderSchema = z.object({
  reason: z.string().min(10, "Please provide a detailed reason for this change order"),
  scheduleImpactDays: z.coerce.number().optional(),
  affectedMilestoneIds: z.array(z.string()).default([]),
});

type ChangeOrderFormData = z.infer<typeof changeOrderSchema>;

interface ChangeOrderSheetProps {
  purchaseOrderId: string;
  currentPOValue: number;
  milestones: Milestone[];
  boqItems?: BOQItem[];
  initialInstructionId?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function ChangeOrderSheet({
  purchaseOrderId,
  currentPOValue,
  milestones,
  boqItems = [],
  initialInstructionId,
  onSuccess,
  trigger,
}: ChangeOrderSheetProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track changes for existing items
  const [itemChanges, setItemChanges] = useState<ItemChange[]>(() =>
    boqItems.map((item) => ({
      id: item.id,
      itemNumber: item.itemNumber,
      description: item.description,
      unit: item.unit,
      originalQty: Number(item.quantity),
      originalPrice: Number(item.unitPrice),
      newQty: Number(item.quantity),
      newPrice: Number(item.unitPrice),
      changeType: "none" as ChangeType,
      maxReduction: Number(item.quantity) - Number(item.quantityCertified || 0),
      certifiedQty: Number(item.quantityCertified || 0),
    }))
  );

  // Track new items to add
  const [newItems, setNewItems] = useState<NewItem[]>([]);

  // Form for reason and metadata
  const form = useForm<ChangeOrderFormData>({
    resolver: zodResolver(changeOrderSchema) as any,
    defaultValues: {
      reason: "",
      scheduleImpactDays: 0,
      affectedMilestoneIds: [],
    },
  });

  // Reset state when sheet opens
  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (val) {
      // Reset item changes
      setItemChanges(
        boqItems.map((item) => ({
          id: item.id,
          itemNumber: item.itemNumber,
          description: item.description,
          unit: item.unit,
          originalQty: Number(item.quantity),
          originalPrice: Number(item.unitPrice),
          newQty: Number(item.quantity),
          newPrice: Number(item.unitPrice),
          changeType: "none" as ChangeType,
          maxReduction: Number(item.quantity) - Number(item.quantityCertified || 0),
          certifiedQty: Number(item.quantityCertified || 0),
        }))
      );
      setNewItems([]);
      form.reset();
    }
  };

  // Update an existing item's change
  const updateItemChange = (
    itemId: string,
    updates: Partial<Omit<ItemChange, "id" | "itemNumber" | "description" | "unit" | "originalQty" | "originalPrice" | "maxReduction" | "certifiedQty">>
  ) => {
    setItemChanges((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, ...updates };

        // Determine change type based on values
        if (updated.newQty > updated.originalQty) {
          updated.changeType = "qty_increase";
        } else if (updated.newQty < updated.originalQty) {
          updated.changeType = "qty_decrease";
        } else if (updated.newPrice !== updated.originalPrice) {
          updated.changeType = "price_change";
        } else {
          updated.changeType = "none";
        }

        return updated;
      })
    );
  };

  // Add a new item
  const addNewItem = () => {
    setNewItems((prev) => [
      ...prev,
      {
        itemNumber: `NEW-${prev.length + 1}`,
        description: "",
        unit: "EA",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  // Update a new item
  const updateNewItem = (index: number, updates: Partial<NewItem>) => {
    setNewItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  // Remove a new item
  const removeNewItem = (index: number) => {
    setNewItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate financial impact
  const financialSummary = useMemo(() => {
    let additions = 0;
    let omissions = 0;
    let changedItems = 0;

    // Existing item changes
    itemChanges.forEach((item) => {
      if (item.changeType === "none") return;
      changedItems++;

      const originalTotal = item.originalQty * item.originalPrice;
      const newTotal = item.newQty * item.newPrice;
      const diff = newTotal - originalTotal;

      if (diff > 0) {
        additions += diff;
      } else {
        omissions += Math.abs(diff);
      }
    });

    // New items
    newItems.forEach((item) => {
      if (item.quantity > 0 && item.unitPrice > 0) {
        additions += item.quantity * item.unitPrice;
      }
    });

    const netChange = additions - omissions;
    const newTotal = currentPOValue + netChange;
    const changePercent = currentPOValue > 0 ? (netChange / currentPOValue) * 100 : 0;

    return {
      additions,
      omissions,
      netChange,
      newTotal,
      changePercent,
      changedItems,
      newItemsCount: newItems.filter((i) => i.quantity > 0 && i.unitPrice > 0).length,
    };
  }, [itemChanges, newItems, currentPOValue]);

  // Check if there are any changes
  const hasChanges = useMemo(() => {
    const hasExistingChanges = itemChanges.some((item) => item.changeType !== "none");
    const hasNewItems = newItems.some((item) => item.quantity > 0 && item.unitPrice > 0 && item.description);
    return hasExistingChanges || hasNewItems;
  }, [itemChanges, newItems]);

  // Submit handler
  async function onSubmit(values: ChangeOrderFormData) {
    if (!hasChanges) {
      toast.error("No changes to submit");
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare the items for API
      const additionItems = newItems
        .filter((item) => item.quantity > 0 && item.unitPrice > 0 && item.description)
        .map((item) => ({
          itemNumber: item.itemNumber,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }));

      // Also include qty increases as additions (new variation items)
      const qtyIncreases = itemChanges
        .filter((item) => item.changeType === "qty_increase")
        .map((item) => ({
          itemNumber: `${item.itemNumber}-VAR`,
          description: `${item.description} (Quantity Increase)`,
          unit: item.unit,
          quantity: item.newQty - item.originalQty,
          unitPrice: item.newPrice,
        }));

      const omissionItems = itemChanges
        .filter((item) => item.changeType === "qty_decrease")
        .map((item) => ({
          id: item.id,
          reductionQuantity: item.originalQty - item.newQty,
        }));

      // Handle price changes - these are trickier
      const priceChanges = itemChanges.filter((item) => item.changeType === "price_change");

      // For now, we'll submit additions and omissions separately if both exist
      // This maintains compatibility with existing API

      const hasAdditions = additionItems.length > 0 || qtyIncreases.length > 0;
      const hasOmissions = omissionItems.length > 0;

      if (hasAdditions) {
        const response = await fetch("/api/change-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_variation",
            purchaseOrderId,
            clientInstructionId: initialInstructionId,
            reason: values.reason,
            items: [...additionItems, ...qtyIncreases],
            scheduleImpactDays: values.scheduleImpactDays,
            affectedMilestoneIds: values.affectedMilestoneIds,
          }),
        });

        const result = await response.json();
        if (!result.success) {
          toast.error("Failed to create additions", { description: result.error });
          setIsSubmitting(false);
          return;
        }
      }

      if (hasOmissions) {
        const response = await fetch("/api/change-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_descope",
            purchaseOrderId,
            clientInstructionId: initialInstructionId,
            reason: values.reason,
            items: omissionItems,
            scheduleImpactDays: values.scheduleImpactDays,
            affectedMilestoneIds: values.affectedMilestoneIds,
          }),
        });

        const result = await response.json();
        if (!result.success) {
          toast.error("Failed to create omissions", { description: result.error });
          setIsSubmitting(false);
          return;
        }
      }

      toast.success("Change Order Created", {
        description: `${financialSummary.changedItems + financialSummary.newItemsCount} items affected`,
      });

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting change order:", error);
      toast.error("Error submitting change order");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Submit Change Order
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-4xl flex flex-col p-0 h-full"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl flex items-center gap-2">
                <ListBullets className="h-5 w-5 text-primary" />
                Change Order Wizard
              </SheetTitle>
              <SheetDescription>
                Modify quantities, prices, or add new items to this purchase order
              </SheetDescription>
            </div>
            {hasChanges && (
              <Badge
                variant={financialSummary.netChange >= 0 ? "default" : "destructive"}
                className="text-sm px-3 py-1"
              >
                Net: {financialSummary.netChange >= 0 ? "+" : ""}
                ${financialSummary.netChange.toLocaleString()}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* Reason Input */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">
                        Reason for Change Order *
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide a detailed technical justification for these changes..."
                          className="min-h-[80px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Existing BOQ Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        Existing BOQ Items
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Adjust quantities or prices for existing items
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {boqItems.length} items
                    </Badge>
                  </div>

                  <ScrollArea className="max-h-[400px] pr-4">
                    <div className="space-y-2">
                      {itemChanges.map((item) => (
                        <BOQItemRow
                          key={item.id}
                          item={item}
                          onUpdate={(updates) => updateItemChange(item.id, updates)}
                        />
                      ))}

                      {itemChanges.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No existing BOQ items</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                {/* New Items Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <Plus className="h-4 w-4 text-green-600" />
                        New BOQ Items
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Add entirely new scope items
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNewItem}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {newItems.map((item, index) => (
                      <NewItemRow
                        key={index}
                        item={item}
                        index={index}
                        onUpdate={(updates) => updateNewItem(index, updates)}
                        onRemove={() => removeNewItem(index)}
                      />
                    ))}

                    {newItems.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p className="text-sm">Click &quot;Add Item&quot; to add new scope</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            {/* Financial Summary Footer - Sticky */}
            <SheetFooter className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-6 py-4 shrink-0 sticky bottom-0">
              <div className="w-full space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground block">Original PO</span>
                    <span className="font-mono font-semibold">
                      ${currentPOValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block flex items-center gap-1">
                      <ArrowUp className="h-3 w-3 text-green-600" />
                      Additions
                    </span>
                    <span className="font-mono font-semibold text-green-600">
                      +${financialSummary.additions.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block flex items-center gap-1">
                      <ArrowDown className="h-3 w-3 text-red-600" />
                      Omissions
                    </span>
                    <span className="font-mono font-semibold text-red-600">
                      -${financialSummary.omissions.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block">Revised Total</span>
                    <span className="font-mono font-bold text-lg">
                      ${financialSummary.newTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Net Change Highlight */}
                {hasChanges && (
                  <div
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      financialSummary.netChange > 0
                        ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900"
                        : financialSummary.netChange < 0
                        ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"
                        : "bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {financialSummary.netChange > 0 ? (
                        <ArrowUp className="h-5 w-5 text-green-600" />
                      ) : financialSummary.netChange < 0 ? (
                        <ArrowDown className="h-5 w-5 text-red-600" />
                      ) : (
                        <Equals className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">Net Impact</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={cn(
                          "font-mono font-bold text-lg",
                          financialSummary.netChange > 0
                            ? "text-green-600"
                            : financialSummary.netChange < 0
                            ? "text-red-600"
                            : ""
                        )}
                      >
                        {financialSummary.netChange >= 0 ? "+" : ""}
                        ${financialSummary.netChange.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({financialSummary.changePercent >= 0 ? "+" : ""}
                        {financialSummary.changePercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting || !hasChanges}
                  >
                    {isSubmitting && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Change Order
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// Component for existing BOQ item row
function BOQItemRow({
  item,
  onUpdate,
}: {
  item: ItemChange;
  onUpdate: (updates: Partial<Omit<ItemChange, "id" | "itemNumber" | "description" | "unit" | "originalQty" | "originalPrice" | "maxReduction" | "certifiedQty">>) => void;
}) {
  const hasChange = item.changeType !== "none";
  const qtyDiff = item.newQty - item.originalQty;
  const priceDiff = item.newPrice - item.originalPrice;
  const valueDiff = item.newQty * item.newPrice - item.originalQty * item.originalPrice;

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-all",
        hasChange
          ? item.changeType === "qty_increase"
            ? "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30"
            : item.changeType === "qty_decrease"
            ? "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30"
            : "border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30"
          : "border-border bg-card hover:bg-muted/50"
      )}
    >
      <div className="flex flex-col gap-3">
        {/* Item Info Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs shrink-0">
                {item.itemNumber}
              </Badge>
              {hasChange && (
                <Badge
                  variant={
                    item.changeType === "qty_increase"
                      ? "default"
                      : item.changeType === "qty_decrease"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {item.changeType === "qty_increase"
                    ? "Increase"
                    : item.changeType === "qty_decrease"
                    ? "Decrease"
                    : "Price Change"}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium mt-1 line-clamp-2">{item.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unit: {item.unit} | Certified: {item.certifiedQty} | Max Reduction:{" "}
              {item.maxReduction}
            </p>
          </div>

          {hasChange && (
            <div className="text-right shrink-0">
              <span
                className={cn(
                  "font-mono font-semibold",
                  valueDiff > 0 ? "text-green-600" : valueDiff < 0 ? "text-red-600" : ""
                )}
              >
                {valueDiff >= 0 ? "+" : ""}${valueDiff.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Edit Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Original Quantity (readonly) */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Original Qty</label>
            <Input
              value={item.originalQty}
              disabled
              className="font-mono text-sm bg-muted/50"
            />
          </div>

          {/* New Quantity */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              New Qty
              {qtyDiff !== 0 && (
                <span
                  className={cn(
                    "text-[10px]",
                    qtyDiff > 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  ({qtyDiff > 0 ? "+" : ""}
                  {qtyDiff})
                </span>
              )}
            </label>
            <Input
              type="number"
              min={item.certifiedQty}
              value={item.newQty}
              onChange={(e) => {
                const val = Number(e.target.value);
                // Cannot go below certified quantity
                if (val >= item.certifiedQty) {
                  onUpdate({ newQty: val });
                }
              }}
              className={cn(
                "font-mono text-sm",
                qtyDiff !== 0 && (qtyDiff > 0 ? "border-green-400" : "border-red-400")
              )}
            />
          </div>

          {/* Original Price (readonly) */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Original Price</label>
            <Input
              value={`$${item.originalPrice.toLocaleString()}`}
              disabled
              className="font-mono text-sm bg-muted/50"
            />
          </div>

          {/* New Price */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              New Price
              {priceDiff !== 0 && (
                <span
                  className={cn(
                    "text-[10px]",
                    priceDiff > 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  ({priceDiff > 0 ? "+" : ""}${priceDiff.toLocaleString()})
                </span>
              )}
            </label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={item.newPrice}
              onChange={(e) => onUpdate({ newPrice: Number(e.target.value) })}
              className={cn(
                "font-mono text-sm",
                priceDiff !== 0 && "border-blue-400"
              )}
            />
          </div>
        </div>

        {/* Value Summary Row */}
        <div className="flex items-center justify-between pt-2 border-t text-sm">
          <span className="text-muted-foreground">
            Original: ${(item.originalQty * item.originalPrice).toLocaleString()}
          </span>
          <span className="font-medium">
            New: ${(item.newQty * item.newPrice).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// Component for new item row
function NewItemRow({
  item,
  index,
  onUpdate,
  onRemove,
}: {
  item: NewItem;
  index: number;
  onUpdate: (updates: Partial<NewItem>) => void;
  onRemove: () => void;
}) {
  const total = item.quantity * item.unitPrice;

  return (
    <div className="p-4 rounded-lg border border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Badge className="bg-green-600">New Item</Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-3">
          {/* Item Number */}
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-muted-foreground">Item #</label>
            <Input
              value={item.itemNumber}
              onChange={(e) => onUpdate({ itemNumber: e.target.value })}
              placeholder="#"
              className="font-mono text-sm"
            />
          </div>

          {/* Description */}
          <div className="col-span-4 space-y-1">
            <label className="text-xs text-muted-foreground">Description *</label>
            <Input
              value={item.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Item description"
              className="text-sm"
            />
          </div>

          {/* Unit */}
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-muted-foreground">Unit</label>
            <Select
              value={item.unit}
              onValueChange={(val) => onUpdate({ unit: val })}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EA">EA</SelectItem>
                <SelectItem value="M">M</SelectItem>
                <SelectItem value="M2">M²</SelectItem>
                <SelectItem value="M3">M³</SelectItem>
                <SelectItem value="KG">KG</SelectItem>
                <SelectItem value="TON">TON</SelectItem>
                <SelectItem value="LS">LS</SelectItem>
                <SelectItem value="SET">SET</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-muted-foreground">Qty</label>
            <Input
              type="number"
              min={0}
              value={item.quantity}
              onChange={(e) => onUpdate({ quantity: Number(e.target.value) })}
              className="font-mono text-sm"
            />
          </div>

          {/* Unit Price */}
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-muted-foreground">Unit Price</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={item.unitPrice}
              onChange={(e) => onUpdate({ unitPrice: Number(e.target.value) })}
              className="font-mono text-sm"
            />
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-end pt-2 border-t">
          <span className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-mono font-semibold text-green-600">
              ${total.toLocaleString()}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
