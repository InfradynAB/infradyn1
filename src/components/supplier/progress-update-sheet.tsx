"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import {
    Camera,
    VideoCamera,
    UploadSimple,
    CircleNotch,
    CheckCircle,
    FileText,
    Image as ImageIcon,
} from "@phosphor-icons/react";
import { TrustIndicator } from "@/components/shared/trust-indicator";

// --- Constants ---
const DOCUMENT_TYPES = [
    { value: "PROGRESS_REPORT", label: "Progress Report" },
    { value: "INVOICE", label: "Invoice" },
    { value: "PACKING_LIST", label: "Packing List" },
    { value: "CMR", label: "CMR (Consignment Note)" },
    { value: "NCR_REPORT", label: "NCR Report" },
    { value: "EVIDENCE", label: "Evidence Photo/Video" },
    { value: "OTHER", label: "Other" },
] as const;

const ACCEPTED_MEDIA_TYPES = "image/*,video/*,application/pdf";

// --- Schema ---
const progressUpdateSchema = z.object({
    milestoneId: z.string().min(1, "Please select a milestone"),
    percentComplete: z.number().min(0).max(100),
    comment: z.string().optional(),
    documentType: z.string().optional(),
});

type ProgressUpdateFormData = z.infer<typeof progressUpdateSchema>;

// --- Types ---
interface Milestone {
    id: string;
    title: string;
    paymentPercentage: string;
    currentProgress?: number;
}

interface ProgressUpdateSheetProps {
    purchaseOrderId: string;
    poNumber: string;
    organizationId: string;
    projectId: string;
    milestones: Milestone[];
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

/**
 * Supplier Progress Update Dialog
 * Path A in the Dual-Path Ingestion system.
 * Allows suppliers to update milestone progress with photo/video evidence.
 */
export function ProgressUpdateSheet({
    purchaseOrderId,
    poNumber,
    organizationId,
    projectId,
    milestones,
    onSuccess,
    trigger,
}: ProgressUpdateSheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

    const form = useForm<ProgressUpdateFormData>({
        resolver: zodResolver(progressUpdateSchema),
        defaultValues: {
            milestoneId: "",
            percentComplete: 0,
            comment: "",
            documentType: "EVIDENCE",
        },
    });

    const selectedMilestone = milestones.find(
        (m) => m.id === form.watch("milestoneId")
    );

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setUploadedFiles((prev) => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    async function onSubmit(values: ProgressUpdateFormData) {
        startTransition(async () => {
            try {
                // 1. Upload files to S3 and create document records
                if (uploadedFiles.length > 0) {
                    const { createDocument } = await import("@/lib/actions/documents");

                    for (const file of uploadedFiles) {
                        // Get presigned URL
                        const presignRes = await fetch("/api/upload/presign", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                fileName: file.name,
                                contentType: file.type,
                                docType: "evidence",
                                orgId: organizationId,
                                projectId: projectId,
                            }),
                        });

                        if (!presignRes.ok) {
                            throw new Error("Failed to get upload URL");
                        }

                        const { uploadUrl, fileUrl } = await presignRes.json();

                        // Upload to S3
                        const uploadRes = await fetch(uploadUrl, {
                            method: "PUT",
                            headers: { "Content-Type": file.type },
                            body: file,
                        });

                        if (!uploadRes.ok) {
                            throw new Error(`Failed to upload ${file.name}`);
                        }

                        // Create document record
                        await createDocument({
                            organizationId,
                            projectId,
                            parentId: purchaseOrderId,
                            parentType: "PO",
                            fileName: file.name,
                            fileUrl,
                            mimeType: file.type,
                            documentType: values.documentType as any || "EVIDENCE",
                        });
                    }
                }

                // 2. Submit progress update
                const { submitProgress } = await import("@/lib/actions/progress-engine");

                const result = await submitProgress({
                    milestoneId: values.milestoneId,
                    percentComplete: values.percentComplete,
                    source: "SRP",
                    comment: values.comment,
                });

                if (!result.success) {
                    throw new Error(result.error || "Failed to save progress");
                }

                toast.success("Progress updated successfully!", {
                    description: `${poNumber} updated to ${values.percentComplete}%` +
                        (uploadedFiles.length > 0 ? ` with ${uploadedFiles.length} file(s)` : ""),
                });
                form.reset();
                setUploadedFiles([]);
                setOpen(false);
                onSuccess?.();
            } catch (error: any) {
                toast.error("Failed to update progress", {
                    description: error.message,
                });
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2">
                        <UploadSimple className="h-4 w-4" />
                        Update Progress
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10">
                            <CheckCircle className="h-6 w-6 text-blue-600" weight="duotone" />
                        </div>
                        Update Progress
                    </DialogTitle>
                    <DialogDescription>
                        Report your progress on <strong>{poNumber}</strong>. Upload photos or videos as evidence.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-4">
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
                                                <SelectValue placeholder="Select milestone to update" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {milestones.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    <div className="flex items-center justify-between w-full gap-4">
                                                        <span>{m.title}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {m.paymentPercentage}%
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
                                        <span className="text-2xl font-bold text-blue-600">
                                            {field.value}%
                                        </span>
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
                                    {selectedMilestone?.currentProgress !== undefined && (
                                        <FormDescription>
                                            Previous: {selectedMilestone.currentProgress}%
                                        </FormDescription>
                                    )}
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
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Any additional notes about this update..."
                                            className="resize-none"
                                            rows={2}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Document Type (Manual Tagging) */}
                        <FormField
                            control={form.control}
                            name="documentType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Document Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select document type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {DOCUMENT_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Helps train our AI to auto-classify future uploads.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* File Upload */}
                        <div className="space-y-3">
                            <FormLabel>Evidence (Photos/Videos)</FormLabel>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 h-16 flex-col gap-1"
                                    onClick={() => document.getElementById("file-upload")?.click()}
                                >
                                    <Camera className="h-5 w-5" />
                                    <span className="text-xs">Photo</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 h-16 flex-col gap-1"
                                    onClick={() => document.getElementById("file-upload")?.click()}
                                >
                                    <VideoCamera className="h-5 w-5" />
                                    <span className="text-xs">Video</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 h-16 flex-col gap-1"
                                    onClick={() => document.getElementById("file-upload")?.click()}
                                >
                                    <FileText className="h-5 w-5" />
                                    <span className="text-xs">Document</span>
                                </Button>
                            </div>
                            <input
                                id="file-upload"
                                type="file"
                                accept={ACCEPTED_MEDIA_TYPES}
                                multiple
                                className="hidden"
                                onChange={handleFileSelect}
                            />

                            {/* Uploaded Files Preview */}
                            {uploadedFiles.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                    {uploadedFiles.map((file, index) => (
                                        <div
                                            key={index}
                                            className="relative aspect-square rounded-lg bg-muted overflow-hidden group"
                                        >
                                            {file.type.startsWith("image/") ? (
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <FileText className="h-6 w-6 text-muted-foreground" />
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Trust Level Indicator */}
                        <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50">
                            <span className="text-sm text-muted-foreground">Data Trust Level:</span>
                            <TrustIndicator level="VERIFIED" size="sm" />
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1" disabled={isPending}>
                                {isPending && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Update
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
