"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { CircleNotch, Plus, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";

const changeOrderSchema = z.object({
    reason: z.string().min(10, "Please provide a detailed reason"),
    amountDelta: z.coerce.number(),
    scopeChange: z.string().optional(),
    scheduleImpactDays: z.coerce.number().optional(),
    affectedMilestoneIds: z.array(z.string()).default([]),
});

type ChangeOrderFormData = z.infer<typeof changeOrderSchema>;

interface Milestone {
    id: string;
    title: string;
    status: string;
}

interface ChangeOrderFormProps {
    purchaseOrderId: string;
    currentPOValue: number;
    milestones: Milestone[];
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function ChangeOrderForm({
    purchaseOrderId,
    currentPOValue,
    milestones,
    onSuccess,
    trigger,
}: ChangeOrderFormProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ChangeOrderFormData>({
        resolver: zodResolver(changeOrderSchema),
        defaultValues: {
            reason: "",
            amountDelta: 0,
            scopeChange: "",
            scheduleImpactDays: 0,
            affectedMilestoneIds: [],
        },
    });

    const amountDelta = form.watch("amountDelta");
    const newTotal = currentPOValue + (amountDelta || 0);
    const changePercent = currentPOValue > 0 ? ((amountDelta || 0) / currentPOValue) * 100 : 0;

    async function onSubmit(values: ChangeOrderFormData) {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/change-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "submit",
                    purchaseOrderId,
                    ...values,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Change Order Submitted", {
                    description: `CO ${result.data.changeNumber} submitted for review`,
                });
                form.reset();
                setOpen(false);
                onSuccess?.();
            } else {
                toast.error("Failed to submit CO", {
                    description: result.error,
                });
            }
        } catch (error) {
            toast.error("Error submitting change order");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Submit Change Order
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Submit Change Order</DialogTitle>
                    <DialogDescription>
                        Request a change to this purchase order. Changes require PM approval.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason for Change *</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe why this change is needed..."
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amountDelta"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cost Change</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Positive = increase, Negative = decrease
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-2">
                                <p className="text-sm font-medium">Impact Preview</p>
                                <div className="text-sm space-y-1 p-3 bg-muted rounded-lg">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Current:</span>
                                        <span>${currentPOValue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span className="text-muted-foreground">New Total:</span>
                                        <span className={amountDelta > 0 ? "text-amber-600" : amountDelta < 0 ? "text-green-600" : ""}>
                                            ${newTotal.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Change:</span>
                                        <span>{changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="scheduleImpactDays"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Schedule Impact (Days)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        How many days will milestones shift? (0 if no schedule change)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="scopeChange"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Scope Change Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe any changes to the scope of work..."
                                            rows={2}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="affectedMilestoneIds"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Affected Milestones</FormLabel>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {milestones.map((ms) => (
                                            <FormField
                                                key={ms.id}
                                                control={form.control}
                                                name="affectedMilestoneIds"
                                                render={({ field }) => (
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(ms.id)}
                                                                onCheckedChange={(checked) => {
                                                                    const current = field.value || [];
                                                                    if (checked) {
                                                                        field.onChange([...current, ms.id]);
                                                                    } else {
                                                                        field.onChange(current.filter((id) => id !== ms.id));
                                                                    }
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal cursor-pointer">
                                                            {ms.title}
                                                        </FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {Math.abs(changePercent) > 10 && (
                            <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">
                                <Warning className="h-5 w-5 flex-shrink-0" />
                                <span>This represents a {Math.abs(changePercent).toFixed(1)}% change and may require additional approval.</span>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1" disabled={isSubmitting}>
                                {isSubmitting && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Change Order
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
