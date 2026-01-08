"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Upload, CircleNotch, FileText, Warning, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const invoiceSchema = z.object({
    invoiceNumber: z.string().min(1, "Invoice number required"),
    amount: z.coerce.number().positive("Amount must be positive"),
    invoiceDate: z.date(),
    dueDate: z.date().optional(),
    milestoneId: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface Milestone {
    id: string;
    title: string;
    amount?: string;
    paymentPercentage: string;
    status: string;
}

interface InvoiceUploadSheetProps {
    purchaseOrderId: string;
    milestones: Milestone[];
    poTotalValue: number;
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function InvoiceUploadSheet({
    purchaseOrderId,
    milestones,
    poTotalValue,
    onSuccess,
    trigger,
}: InvoiceUploadSheetProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        status: "PASSED" | "MISMATCH" | "FAILED" | null;
        reason?: string;
    }>({ status: null });

    const form = useForm({
        resolver: zodResolver(invoiceSchema),
        defaultValues: {
            invoiceNumber: "",
            amount: 0,
            invoiceDate: new Date(),
            dueDate: undefined as Date | undefined,
            milestoneId: undefined as string | undefined,
        },
    });

    const selectedMilestoneId = form.watch("milestoneId");
    const amount = form.watch("amount") as number;

    // Validate invoice amount against milestone
    const validateAgainstMilestone = (msId: string, invoiceAmount: number) => {
        const milestone = milestones.find((m) => m.id === msId);
        if (!milestone) {
            setValidationResult({ status: null });
            return;
        }

        const msAmount = Number(milestone.amount) || (poTotalValue * Number(milestone.paymentPercentage) / 100);
        const variance = Math.abs(invoiceAmount - msAmount) / msAmount;

        if (variance <= 0.02) {
            setValidationResult({ status: "PASSED", reason: "Invoice matches milestone value" });
        } else if (variance <= 0.1) {
            setValidationResult({
                status: "MISMATCH",
                reason: `Invoice differs by ${(variance * 100).toFixed(1)}% (expected ${msAmount.toFixed(2)})`,
            });
        } else {
            setValidationResult({
                status: "FAILED",
                reason: `Significant variance: ${(variance * 100).toFixed(1)}%`,
            });
        }
    };

    // Re-validate when milestone or amount changes
    if (selectedMilestoneId && amount > 0) {
        const currentMilestone = milestones.find((m) => m.id === selectedMilestoneId);
        if (currentMilestone) {
            const msAmount = Number(currentMilestone.amount) || (poTotalValue * Number(currentMilestone.paymentPercentage) / 100);
            const variance = Math.abs(amount - msAmount) / msAmount;
            const newStatus = variance <= 0.02 ? "PASSED" : variance <= 0.1 ? "MISMATCH" : "FAILED";
            if (validationResult.status !== newStatus) {
                validateAgainstMilestone(selectedMilestoneId, amount);
            }
        }
    }

    async function onSubmit(values: InvoiceFormData) {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "create",
                    purchaseOrderId,
                    ...values,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Invoice uploaded", {
                    description: `Invoice ${values.invoiceNumber} created successfully`,
                });
                form.reset();
                setValidationResult({ status: null });
                setOpen(false);
                onSuccess?.();
            } else {
                toast.error("Failed to upload invoice", {
                    description: result.error,
                });
            }
        } catch (error) {
            toast.error("Error uploading invoice");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Invoice
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Upload Invoice</SheetTitle>
                    <SheetDescription>
                        Link an invoice to this purchase order. Optionally select a milestone for automated validation.
                    </SheetDescription>
                </SheetHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
                        <FormField
                            control={form.control}
                            name="invoiceNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Invoice Number *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="INV-001" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount *</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            {...field}
                                            value={field.value as number}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="milestoneId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Link to Milestone</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select milestone (optional)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {milestones.map((ms) => (
                                                <SelectItem key={ms.id} value={ms.id}>
                                                    <div className="flex flex-col">
                                                        <span>{ms.title}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {ms.paymentPercentage}% = ${(
                                                                (poTotalValue * Number(ms.paymentPercentage)) / 100
                                                            ).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Linking enables automatic amount validation
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Validation Result */}
                        {validationResult.status && (
                            <div
                                className={cn(
                                    "flex items-center gap-2 p-3 rounded-lg text-sm",
                                    validationResult.status === "PASSED" && "bg-green-50 text-green-700",
                                    validationResult.status === "MISMATCH" && "bg-amber-50 text-amber-700",
                                    validationResult.status === "FAILED" && "bg-red-50 text-red-700"
                                )}
                            >
                                {validationResult.status === "PASSED" && <CheckCircle className="h-5 w-5" />}
                                {validationResult.status === "MISMATCH" && <Warning className="h-5 w-5" />}
                                {validationResult.status === "FAILED" && <Warning className="h-5 w-5" />}
                                <span>{validationResult.reason}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="invoiceDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Invoice Date *</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? format(field.value, "PPP") : "Pick date"}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date > new Date()}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="dueDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Due Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? format(field.value, "PPP") : "Pick date"}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

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
                                Upload Invoice
                            </Button>
                        </div>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
