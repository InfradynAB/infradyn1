"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
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
    SparkleIcon,
} from "@phosphor-icons/react";
import { TrustIndicator } from "@/components/shared/trust-indicator";
import { Sparkle } from "@phosphor-icons/react";

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
    onSuccess,
}: InternalProgressFormProps) {
    const [isPending, startTransition] = useTransition();
    const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
    const [aiSuggestions, setAiSuggestions] = useState<AIFieldSuggestion[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    const form = useForm<InternalUpdateFormData>({
        resolver: zodResolver(internalUpdateSchema),
        defaultValues: {
            milestoneId: "",
            percentComplete: 0,
            source: "CALL",
            comment: "",
        },
    });

    const selectedMilestoneId = form.watch("milestoneId");
    const selectedSource = form.watch("source");
    const selectedMilestone = milestones.find((m) => m.id === selectedMilestoneId);

    // Fetch AI suggestions when milestone or source changes
    const fetchAISuggestions = useCallback(async () => {
        if (!selectedMilestoneId) {
            setAiSuggestions([]);
            return;
        }

        setIsLoadingSuggestions(true);
        setAppliedSuggestions(new Set());

        try {
            const response = await fetch("/api/progress/suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    milestoneId: selectedMilestoneId,
                    purchaseOrderId,
                    source: selectedSource,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.suggestions) {
                    setAiSuggestions(data.suggestions);
                }
            }
        } catch (error) {
            console.error("Failed to fetch AI suggestions:", error);
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [selectedMilestoneId, selectedSource, purchaseOrderId]);

    useEffect(() => {
        fetchAISuggestions();
    }, [fetchAISuggestions]);

    const applySuggestion = (suggestion: AIFieldSuggestion) => {
        if (suggestion.field === "percentComplete") {
            const value = typeof suggestion.value === 'number'
                ? suggestion.value
                : Number(suggestion.value);
            form.setValue("percentComplete", value, { shouldValidate: true, shouldDirty: true });
        } else if (suggestion.field === "comment") {
            form.setValue("comment", suggestion.value as string, { shouldValidate: true, shouldDirty: true });
        }
        setAppliedSuggestions((prev) => new Set([...prev, suggestion.field]));
        toast.success("Suggestion applied", { description: suggestion.reason });
    };

    async function onSubmit(values: InternalUpdateFormData) {
        startTransition(async () => {
            try {
                // Import and call the actual server action
                const { submitProgress } = await import("@/lib/actions/progress-engine");

                const result = await submitProgress({
                    milestoneId: values.milestoneId,
                    percentComplete: values.percentComplete,
                    source: "IRP", // Internal Reported Progress
                    comment: `[${values.source}] ${values.comment}`,
                });

                if (!result.success) {
                    throw new Error(result.error || "Failed to save progress");
                }

                toast.success("Progress logged successfully!", {
                    description: `${poNumber} updated to ${values.percentComplete}%`,
                });
                form.reset();
                setAiSuggestions([]);
                onSuccess?.();
            } catch (error: any) {
                toast.error("Failed to log progress", {
                    description: error.message,
                });
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
                {(aiSuggestions.length > 0 || isLoadingSuggestions) && selectedMilestoneId && (
                    <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-500/10 dark:to-purple-500/10 border border-blue-200 dark:border-blue-500/20">
                        <div className="flex items-center gap-2 mb-3">
                            {isLoadingSuggestions ? (
                                <CircleNotch className="h-5 w-5 text-blue-600 animate-spin" />
                            ) : (
                                <Sparkle className="h-5 w-5 text-blue-600" weight="fill" />
                            )}
                            <span className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                                {isLoadingSuggestions ? "Generating AI Suggestions..." : "AI Suggestions"}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                                Click to apply
                            </span>
                        </div>
                        {isLoadingSuggestions ? (
                            <div className="flex items-center justify-center py-4">
                                <p className="text-sm text-muted-foreground">Analyzing milestone history...</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {aiSuggestions.map((suggestion, index) => {
                                    const fieldLabels: Record<string, string> = {
                                        percentComplete: "Progress",
                                        comment: "Notes",
                                    };
                                    const displayValue = suggestion.field === "comment"
                                        ? (suggestion.value as string).length > 50
                                            ? (suggestion.value as string).substring(0, 50) + "..."
                                            : suggestion.value
                                        : suggestion.field === "percentComplete"
                                            ? `${suggestion.value}%`
                                            : suggestion.value;

                                    return (
                                        <div
                                            key={index}
                                            className={`flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 shadow-sm transition-all ${appliedSuggestions.has(suggestion.field)
                                                ? "opacity-60"
                                                : "hover:shadow-md cursor-pointer"
                                                }`}
                                            onClick={() => !appliedSuggestions.has(suggestion.field) && applySuggestion(suggestion)}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                        {fieldLabels[suggestion.field] || suggestion.field}
                                                    </span>
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                        {suggestion.confidence}% confident
                                                    </span>
                                                </div>
                                                <p className="text-sm font-semibold mt-1">{displayValue}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {suggestion.reason}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={appliedSuggestions.has(suggestion.field) ? "secondary" : "default"}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applySuggestion(suggestion);
                                                }}
                                                disabled={appliedSuggestions.has(suggestion.field)}
                                                className="ml-3"
                                            >
                                                {appliedSuggestions.has(suggestion.field) ? (
                                                    <>
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Applied
                                                    </>
                                                ) : (
                                                    "Apply"
                                                )}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
                            render={({ field }) => {
                                // Use watched value to ensure UI updates on setValue
                                const progressValue = form.watch("percentComplete");
                                return (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>Progress</FormLabel>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={progressValue}
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
                                                value={[progressValue]}
                                                onValueChange={(v) => field.onChange(v[0])}
                                                className="py-4"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                );
                            }}
                        />

                        {/* Comment */}
                        <FormField
                            control={form.control}
                            name="comment"
                            render={({ field }) => {
                                // Use watched value to ensure UI updates on setValue
                                const commentValue = form.watch("comment");
                                return (
                                    <FormItem>
                                        <FormLabel>Notes *</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Describe the source and details of this update..."
                                                className="resize-none"
                                                rows={4}
                                                value={commentValue}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                name={field.name}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Required for audit trail. Include date and attendees if from a call.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                );
                            }}
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
