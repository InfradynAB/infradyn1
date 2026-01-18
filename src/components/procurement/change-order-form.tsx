"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    CircleNotch,
    Plus,
    Warning,
    Trash,
    PlusCircle,
    ArrowArcLeft,
    ArrowArcRight
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const itemSchema = z.object({
    itemNumber: z.string().min(1, "Item number required"),
    description: z.string().min(3, "Description too short"),
    unit: z.string().min(1, "Unit required"),
    quantity: z.coerce.number().positive("Quantity must be positive"),
    unitPrice: z.coerce.number().positive("Price must be positive"),
});

const changeOrderSchema = z.object({
    reason: z.string().min(10, "Please provide a detailed reason"),
    type: z.enum(["ADDITION", "OMISSION"]),
    clientInstructionId: z.string().optional(),
    // For Additions
    items: z.array(itemSchema).optional(),
    // For Omissions
    omittedItems: z.array(z.object({
        id: z.string(),
        reductionQuantity: z.coerce.number().positive(),
        description: z.string(), // for UI
    })).optional(),
    scheduleImpactDays: z.coerce.number().optional(),
    affectedMilestoneIds: z.array(z.string()).default([]),
});

type ChangeOrderFormData = z.infer<typeof changeOrderSchema>;

interface Milestone {
    id: string;
    title: string;
    status: string;
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

interface ChangeOrderFormProps {
    purchaseOrderId: string;
    currentPOValue: number;
    milestones: Milestone[];
    boqItems?: BOQItem[];
    initialInstructionId?: string;
    initialType?: "ADDITION" | "OMISSION";
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function ChangeOrderForm({
    purchaseOrderId,
    currentPOValue,
    milestones,
    boqItems = [],
    initialInstructionId,
    initialType = "ADDITION",
    onSuccess,
    trigger,
}: ChangeOrderFormProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(initialInstructionId ? 2 : 1);

    const form = useForm<ChangeOrderFormData>({
        resolver: zodResolver(changeOrderSchema),
        defaultValues: {
            reason: "",
            type: initialType,
            clientInstructionId: initialInstructionId,
            items: [],
            omittedItems: [],
            scheduleImpactDays: 0,
            affectedMilestoneIds: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const watchType = form.watch("type");
    const watchItems = form.watch("items") || [];
    const watchOmittedItems = form.watch("omittedItems") || [];

    const calculateDelta = () => {
        if (watchType === "ADDITION") {
            return watchItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        } else {
            // This is a bit trickier since we need price from boqItems
            return watchOmittedItems.reduce((acc, oItem) => {
                const originalItem = boqItems.find(i => i.id === oItem.id);
                if (!originalItem) return acc;
                return acc - (oItem.reductionQuantity * Number(originalItem.unitPrice));
            }, 0);
        }
    };

    const amountDelta = calculateDelta();
    const newTotal = currentPOValue + amountDelta;
    const changePercent = currentPOValue > 0 ? (amountDelta / currentPOValue) * 100 : 0;

    async function onSubmit(values: ChangeOrderFormData) {
        setIsSubmitting(true);
        try {
            const action = values.type === "ADDITION" ? "create_variation" : "create_descope";

            // Reformat items for backend
            const payloadItems = values.type === "ADDITION"
                ? values.items
                : values.omittedItems?.map(o => ({
                    id: o.id,
                    reductionQuantity: o.reductionQuantity
                }));

            const response = await fetch("/api/change-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    purchaseOrderId,
                    clientInstructionId: values.clientInstructionId,
                    reason: values.reason,
                    items: payloadItems,
                    scheduleImpactDays: values.scheduleImpactDays,
                    affectedMilestoneIds: values.affectedMilestoneIds,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success(values.type === "ADDITION" ? "Variation Order Created" : "De-Scope Created", {
                    description: `Change order ${result.data?.changeNumber || ""} submitted`,
                });
                form.reset();
                setOpen(false);
                setStep(1);
                onSuccess?.();
            } else {
                toast.error("Process failed", { description: result.error });
            }
        } catch (error) {
            toast.error("Error submitting change order");
        } finally {
            setIsSubmitting(false);
        }
    }

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val && !initialInstructionId) setStep(1);
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Submit Change Order
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {watchType === "ADDITION" ? <PlusCircle className="text-green-600" /> : <ArrowArcLeft className="text-red-600" />}
                        {initialInstructionId ? "Execute Instruction" : "Change Order Wizard"}
                        <Badge variant="outline" className="ml-2">
                            {watchType === "ADDITION" ? "Variation" : "De-Scope"}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription>
                        {watchType === "ADDITION"
                            ? "Add new scope and items to this purchase order."
                            : "Remove or reduce scope from existing items."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {step === 1 && (
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant={watchType === "ADDITION" ? "default" : "outline"}
                                    className="h-24 flex-col gap-2 border-green-200 hover:bg-green-50 hover:text-green-900"
                                    onClick={() => { form.setValue("type", "ADDITION"); nextStep(); }}
                                >
                                    <PlusCircle size={32} />
                                    <span>Scope Addition</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant={watchType === "OMISSION" ? "default" : "outline"}
                                    className="h-24 flex-col gap-2 border-red-200 hover:bg-red-50 hover:text-red-900"
                                    onClick={() => { form.setValue("type", "OMISSION"); nextStep(); }}
                                >
                                    <ArrowArcLeft size={32} />
                                    <span>Scope Omission</span>
                                </Button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="reason"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Professional Reason for Change *</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Provide technical justification for this change..."
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {watchType === "ADDITION" && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <FormLabel>New BOQ Items</FormLabel>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => append({ itemNumber: "", description: "", unit: "EA", quantity: 0, unitPrice: 0 })}
                                            >
                                                <Plus className="mr-2" /> Add Item
                                            </Button>
                                        </div>

                                        {fields.length === 0 && (
                                            <div className="text-center p-8 border-2 border-dashed rounded-lg bg-gray-50/50">
                                                <p className="text-sm text-muted-foreground">No items added yet. Click "Add Item" to begin.</p>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            {fields.map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg bg-white shadow-sm">
                                                    <div className="col-span-2">
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.itemNumber`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl><Input placeholder="#" {...field} /></FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="col-span-4">
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.description`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl><Input placeholder="Description" {...field} /></FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.quantity`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl><Input type="number" placeholder="Qty" {...field} /></FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.unitPrice`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl><Input type="number" placeholder="Rate" {...field} /></FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="col-span-1 pt-1">
                                                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(index)}>
                                                            <Trash size={16} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {watchType === "OMISSION" && (
                                    <div className="space-y-4">
                                        <FormLabel>Select Items to De-Scope</FormLabel>
                                        <div className="border rounded-lg divide-y bg-white max-h-60 overflow-y-auto">
                                            {boqItems.map((item) => {
                                                const isSelected = watchOmittedItems.some(o => o.id === item.id);
                                                const maxReduction = Number(item.quantity) - Number(item.quantityCertified || 0);

                                                return (
                                                    <div key={item.id} className="p-3 flex items-center gap-4 hover:bg-gray-50">
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => {
                                                                const current = watchOmittedItems;
                                                                if (checked) {
                                                                    form.setValue("omittedItems", [...current, { id: item.id, reductionQuantity: 0, description: item.description }]);
                                                                } else {
                                                                    form.setValue("omittedItems", current.filter(o => o.id !== item.id));
                                                                }
                                                            }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{item.description}</p>
                                                            <p className="text-xs text-muted-foreground">Available: {item.quantity} {item.unit} | Max Reduction: {maxReduction}</p>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="w-32">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Deduction Qty"
                                                                    max={maxReduction}
                                                                    onChange={(e) => {
                                                                        const val = Number(e.target.value);
                                                                        form.setValue("omittedItems", watchOmittedItems.map(o =>
                                                                            o.id === item.id ? { ...o, reductionQuantity: val } : o
                                                                        ));
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <Separator />

                                <div className="p-4 bg-muted/30 rounded-xl border border-dashed text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Original PO Value:</span>
                                        <span className="font-mono">${currentPOValue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Estimated Net Impact:</span>
                                        <span className={amountDelta > 0 ? "text-green-600" : amountDelta < 0 ? "text-red-600" : ""}>
                                            {amountDelta > 0 ? "+" : ""}${amountDelta.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Revised PO Total:</span>
                                        <span className="font-mono">${newTotal.toLocaleString()} ({changePercent.toFixed(1)}%)</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    {!initialInstructionId && <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>Back</Button>}
                                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                                        {isSubmitting && <CircleNotch className="mr-2 animate-spin" />}
                                        Submit Variation Order
                                    </Button>
                                </div>
                            </div>
                        )}
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
