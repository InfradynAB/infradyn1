"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
    CircleNotch,
    CheckCircle,
    Lightbulb,
    ClipboardText,
    Phone,
    MapPin,
} from "@phosphor-icons/react";
import { TrustIndicator } from "@/components/shared/trust-indicator";

// --- Schema ---
const internalUpdateSchema = z.object({
    milestoneId: z.string().min(1, "Please select a milestone"),
    percentComplete: z.number().min(0).max(100),
    source: z.enum(["SITE_VISIT", "CALL", "EMAIL", "OTHER"]),
    comment: z.string().min(1, "Please add a note about this update"),
});

type InternalUpdateFormData = z.infer<typeof internalUpdateSchema>;

// --- Types ---
interface Milestone {
    id: string;
    title: string;
    paymentPercentage: string;
    currentProgress?: number;
    lastUpdated?: Date;
}

interface AIFieldSuggestion {
    field: string;
    value: string | number;
    confidence: number;
    reason: string;
}

interface InternalProgressFormProps {
    purchaseOrderId: string;
    poNumber: string;
    milestones: Milestone[];
    supplierName: string;
    aiSuggestions?: AIFieldSuggestion[];
    onSuccess?: () => void;
}

const SOURCE_OPTIONS = [
    { value: "SITE_VISIT", label: "Site Visit", icon: MapPin },
    { value: "CALL", label: "Weekly Call", icon: Phone },
    { value: "EMAIL", label: "Email Update", icon: ClipboardText },
    { value: "OTHER", label: "Other", icon: ClipboardText },
];

/**
 * Internal Progress Form (Path B)
 * Used by PMs and site teams to log progress from calls, site visits, or internal reports.
 * Includes AI-assisted field suggestions based on historical trends.
 */
export function InternalProgressForm({
    purchaseOrderId,
    poNumber,
    milestones,
    supplierName,
    aiSuggestions = [],
    onSuccess,
}: InternalProgressFormProps) {
    const [isPending, startTransition] = useTransition();
    const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

    const form = useForm<InternalUpdateFormData>({
        resolver: zodResolver(internalUpdateSchema),
        defaultValues: {
            milestoneId: "",
            percentComplete: 0,
            source: "CALL",
            comment: "",
        },
    });

    const selectedMilestone = milestones.find(
        (m) => m.id === form.watch("milestoneId")
    );

    const applySuggestion = (suggestion: AIFieldSuggestion) => {
        if (suggestion.field === "percentComplete") {
            form.setValue("percentComplete", suggestion.value as number);
        }
        setAppliedSuggestions((prev) => new Set([...prev, suggestion.field]));
        toast.success("Suggestion applied", { description: suggestion.reason });
    };

    async function onSubmit(values: InternalUpdateFormData) {
        startTransition(async () => {
            try {
                // TODO: Implement submitInternalProgress server action
                // const result = await submitInternalProgress({
                //     purchaseOrderId,
                //     milestoneId: values.milestoneId,
                //     percentComplete: values.percentComplete,
                //     source: values.source,
                //     comment: values.comment,
                // });

                // Placeholder success
                await new Promise((resolve) => setTimeout(resolve, 1000));

                toast.success("Progress logged successfully!", {
                    description: `${poNumber} updated to ${values.percentComplete}%`,
                });
                form.reset();
                onSuccess?.();
            } catch (error) {
                toast.error("Failed to log progress");
            }
        });
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10">
                            <ClipboardText className="h-6 w-6 text-amber-600" weight="duotone" />
                        </div>
                        <div>
                            <CardTitle>Internal Progress Log</CardTitle>
                            <CardDescription>
                                Log progress for <strong>{poNumber}</strong> from {supplierName}
                            </CardDescription>
                        </div>
                    </div>
                    <TrustIndicator level="INTERNAL" />
                </div>
            </CardHeader>
            <CardContent>
                {/* AI Suggestions Panel */}
                {aiSuggestions.length > 0 && (
                    <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                        <div className="flex items-center gap-2 mb-3">
                            <Lightbulb className="h-5 w-5 text-blue-600" weight="duotone" />
                            <span className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                                AI Suggestions
                            </span>
                        </div>
                        <div className="space-y-2">
                            {aiSuggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900"
                                >
                                    <div>
                                        <p className="text-sm font-medium">
                                            {suggestion.field}: <strong>{suggestion.value}</strong>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {suggestion.reason}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={appliedSuggestions.has(suggestion.field) ? "secondary" : "outline"}
                                        onClick={() => applySuggestion(suggestion)}
                                        disabled={appliedSuggestions.has(suggestion.field)}
                                    >
                                        {appliedSuggestions.has(suggestion.field) ? "Applied" : "Apply"}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Source */}
                        <FormField
                            control={form.control}
                            name="source"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Update Source *</FormLabel>
                                    <div className="grid grid-cols-4 gap-2">
                                        {SOURCE_OPTIONS.map((option) => {
                                            const Icon = option.icon;
                                            const isSelected = field.value === option.value;
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => field.onChange(option.value)}
                                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${isSelected
                                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                                                            : "border-muted hover:border-muted-foreground/30"
                                                        }`}
                                                >
                                                    <Icon className={`h-5 w-5 ${isSelected ? "text-blue-600" : "text-muted-foreground"}`} />
                                                    <span className={`text-xs ${isSelected ? "font-semibold" : ""}`}>
                                                        {option.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Milestone Selection */}
                        <FormField
                            control={form.control}
                            name="milestoneId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Milestone *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select milestone" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {milestones.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    <div className="flex items-center justify-between w-full gap-4">
                                                        <span>{m.title}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            Current: {m.currentProgress ?? 0}%
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Progress Slider */}
                        <FormField
                            control={form.control}
                            name="percentComplete"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Progress</FormLabel>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={field.value}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                                className="w-20 text-center"
                                            />
                                            <span className="text-muted-foreground">%</span>
                                        </div>
                                    </div>
                                    <FormControl>
                                        <Slider
                                            min={0}
                                            max={100}
                                            step={5}
                                            value={[field.value]}
                                            onValueChange={(v) => field.onChange(v[0])}
                                            className="py-4"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Comment */}
                        <FormField
                            control={form.control}
                            name="comment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes *</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe the source and details of this update..."
                                            className="resize-none"
                                            rows={4}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Required for audit trail. Include date and attendees if from a call.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Submit */}
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                            Log Progress
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
