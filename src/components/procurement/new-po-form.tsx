"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPurchaseOrder } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeftIcon,
    UploadSimpleIcon,
    SpinnerIcon,
    CheckCircleIcon,
    WarningCircleIcon,
    PlusIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { AddSupplierDialog } from "@/components/add-supplier-dialog";
import { toast } from "sonner";

// Form schema - uses coerce for HTML form inputs
const formSchema = z.object({
    projectId: z.string().uuid("Please select a project"),
    supplierId: z.string().uuid("Please select a supplier"),
    poNumber: z.string().min(1, "PO number is required"),
    totalValue: z.coerce.number().positive("Value must be positive"),
    currency: z.string().default("USD"),
    fileUrl: z.string().url().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Currencies
const currencies = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
    { value: "KES", label: "KES - Kenyan Shilling" },
    { value: "AED", label: "AED - UAE Dirham" },
];

interface ProjectOption {
    id: string;
    name: string;
    organizationId: string;
}

interface SupplierOption {
    id: string;
    name: string;
}

export default function NewPurchaseOrderPage({
    projects,
    suppliers,
}: {
    projects: ProjectOption[];
    suppliers: SupplierOption[];
}) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<
        "idle" | "uploading" | "extracting" | "done" | "error"
    >("idle");

    // AI Extraction state
    const [extractionStatus, setExtractionStatus] = useState<
        "idle" | "extracting" | "success" | "error"
    >("idle");
    const [extractedFields, setExtractedFields] = useState<{
        poNumber?: string;
        vendorName?: string;
        totalValue?: number;
        currency?: string;
        confidence?: number;
    } | null>(null);
    const [extractionError, setExtractionError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            currency: "USD",
        },
    });

    const selectedProjectId = watch("projectId");
    const selectedProject = projects.find((p) => p.id === selectedProjectId);

    // Handle file selection - upload immediately and trigger AI extraction
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setExtractedFields(null);
        setExtractionError(null);
        setExtractionStatus("idle");

        // Need a project selected to upload
        if (!selectedProject) {
            toast.warning("Please select a project first before uploading a document.");
            e.target.value = ""; // Clear file input
            setUploadProgress("idle");
            return;
        }

        // Upload to S3 first
        setUploadProgress("uploading");
        try {
            const contentType = file.type || "application/pdf";

            const presignResponse = await fetch("/api/upload/presign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType,
                    docType: "po",
                    orgId: selectedProject.organizationId,
                    projectId: selectedProject.id,
                }),
            });

            if (!presignResponse.ok) {
                throw new Error("Failed to get upload URL");
            }

            const { uploadUrl, fileUrl: s3FileUrl } = await presignResponse.json();

            // Upload to S3
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": contentType },
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload file to S3");
            }

            setFileUrl(s3FileUrl);
            setUploadProgress("extracting");

            // Trigger AI extraction
            setExtractionStatus("extracting");
            const extractionToast = toast.loading("AI is analyzing your document...");

            try {
                const extractResponse = await fetch("/api/po/extract", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileUrl: s3FileUrl }),
                });

                if (extractResponse.ok) {
                    const extractResult = await extractResponse.json();
                    if (extractResult.success && extractResult.data) {
                        const data = extractResult.data;
                        setExtractedFields({
                            poNumber: data.poNumber,
                            vendorName: data.vendorName,
                            totalValue: data.totalValue,
                            currency: data.currency,
                            confidence: data.confidence,
                        });

                        // Pre-fill form fields
                        if (data.poNumber) setValue("poNumber", data.poNumber);
                        if (data.totalValue) setValue("totalValue", data.totalValue);
                        if (data.currency) setValue("currency", data.currency);

                        setExtractionStatus("success");
                        toast.success("AI extraction complete!", { id: extractionToast });
                    } else {
                        const msg = extractResult.error || "Extraction returned no data";
                        setExtractionError(msg);
                        setExtractionStatus("error");
                        toast.error(`AI Analysis: ${msg}`, { id: extractionToast });
                    }
                } else {
                    const errorData = await extractResponse.json().catch(() => ({}));
                    const msg = errorData.error || "AI extraction failed";
                    setExtractionError(msg);
                    setExtractionStatus("error");
                    toast.error(`AI Analysis Failed: ${msg}`, { id: extractionToast });
                }
            } catch (err) {
                console.error("Extraction API error:", err);
                setExtractionError("Failed to reach extraction service");
                setExtractionStatus("error");
                toast.error("AI Analysis: Connection error", { id: extractionToast });
            }

            setUploadProgress("done");
        } catch (error) {
            console.error("Upload/extraction error:", error);
            setUploadProgress("error");
            setExtractionStatus("error");
            setExtractionError(error instanceof Error ? error.message : "Upload failed");
        }
    };

    // Create PO (file is already uploaded during handleFileChange)
    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setSubmitError(null);

        const toastId = toast.loading("Creating purchase order...");

        try {
            // Create PO with the already-uploaded file URL
            const result = await createPurchaseOrder({
                ...data,
                fileUrl: fileUrl || undefined,
            });

            if (result.success) {
                toast.success("Purchase order created successfully", { id: toastId });
                router.push("/dashboard/procurement");
                router.refresh();
            } else {
                setSubmitError(result.error);
                toast.error(result.error, { id: toastId });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unexpected error occurred";
            setSubmitError(message);
            toast.error(message, { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/procurement">
                        <ArrowLeftIcon className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        New Purchase Order
                    </h1>
                    <p className="text-muted-foreground">
                        Upload and register a new PO
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* File Upload Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Document</CardTitle>
                        <CardDescription>
                            Upload the PO document (PDF)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                            {uploadProgress === "idle" && (
                                <>
                                    <UploadSimpleIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Drag & drop or click to upload
                                    </p>
                                    <Input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        className="max-w-xs mx-auto"
                                    />
                                </>
                            )}
                            {uploadProgress === "uploading" && (
                                <div className="flex flex-col items-center gap-2">
                                    <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm">Uploading...</p>
                                </div>
                            )}
                            {uploadProgress === "extracting" && (
                                <div className="flex flex-col items-center gap-2">
                                    <SpinnerIcon className="h-8 w-8 animate-spin text-amber-500" />
                                    <p className="text-sm text-amber-600 font-medium">Analyzing document with AI...</p>
                                    <p className="text-xs text-muted-foreground">This may take a few seconds</p>
                                </div>
                            )}
                            {uploadProgress === "done" && (
                                <div className="flex flex-col items-center gap-2 text-green-600">
                                    <CheckCircleIcon
                                        weight="fill"
                                        className="h-8 w-8"
                                    />
                                    <p className="text-sm font-medium">
                                        {extractionStatus === "success" ? "Upload & Analysis complete" : "Upload complete"}
                                    </p>
                                    {extractionStatus === "success" && extractedFields?.confidence && (
                                        <p className="text-xs text-muted-foreground">
                                            AI Confidence: {Math.round(extractedFields.confidence * 100)}%
                                        </p>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setFileUrl(null);
                                            setSelectedFile(null);
                                            setUploadProgress("idle");
                                            setExtractedFields(null);
                                            setExtractionStatus("idle");
                                        }}
                                    >
                                        Replace file
                                    </Button>
                                </div>
                            )}
                            {uploadProgress === "error" && (
                                <div className="flex flex-col items-center gap-2 text-destructive">
                                    <WarningCircleIcon
                                        weight="fill"
                                        className="h-8 w-8"
                                    />
                                    <p className="text-sm font-medium">
                                        Upload failed
                                    </p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setUploadProgress("idle")}
                                    >
                                        Try again
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* AI Extraction Status Banner */}
                        {extractionStatus === "success" && extractedFields && (
                            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                                    ✨ AI extracted PO details below. Please review and correct if needed.
                                </p>
                            </div>
                        )}
                        {extractionStatus === "error" && extractionError && (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                <p className="text-sm text-amber-700 dark:text-amber-400">
                                    ⚠️ {extractionError}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Metadata Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">PO Details</CardTitle>
                        <CardDescription>
                            Enter the purchase order information
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* PO Number */}
                        <div className="space-y-2">
                            <Label htmlFor="poNumber">PO Number *</Label>
                            <Input
                                id="poNumber"
                                placeholder="e.g. PO-2024-001"
                                {...register("poNumber")}
                            />
                            {errors.poNumber && (
                                <p className="text-sm text-destructive">
                                    {errors.poNumber.message}
                                </p>
                            )}
                        </div>

                        {/* Project Select */}
                        <div className="space-y-2">
                            <Label>Project *</Label>
                            <Select
                                onValueChange={(v) => setValue("projectId", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.projectId && (
                                <p className="text-sm text-destructive">
                                    {errors.projectId.message}
                                </p>
                            )}
                        </div>

                        {/* Supplier Select */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Supplier *</Label>
                                <AddSupplierDialog
                                    trigger={
                                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                            <PlusIcon className="mr-1 h-3 w-3" />
                                            Add New
                                        </Button>
                                    }
                                />
                            </div>
                            <Select
                                onValueChange={(v) => setValue("supplierId", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.supplierId && (
                                <p className="text-sm text-destructive">
                                    {errors.supplierId.message}
                                </p>
                            )}
                        </div>

                        {/* Value & Currency */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="totalValue">Total Value *</Label>
                                <Input
                                    id="totalValue"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...register("totalValue")}
                                />
                                {errors.totalValue && (
                                    <p className="text-sm text-destructive">
                                        {errors.totalValue.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <Select
                                    defaultValue="USD"
                                    onValueChange={(v) => setValue("currency", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((c) => (
                                            <SelectItem
                                                key={c.value}
                                                value={c.value}
                                            >
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Submit Error */}
                {submitError && (
                    <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                        {submitError}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/procurement">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Purchase Order"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
