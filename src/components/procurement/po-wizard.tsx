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
import { Textarea } from "@/components/ui/textarea";
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
    ArrowRightIcon,
    UploadSimpleIcon,
    SpinnerIcon,
    CheckCircleIcon,
    WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { toast } from "sonner";
import { MilestoneManager, type MilestoneData } from "./milestone-manager";
import { ROSManager, type BOQItemWithROS } from "./ros-manager";
import { ComplianceValidator, runValidation } from "./compliance-validator";

// Steps in the wizard
type WizardStep = "upload" | "details" | "milestones" | "boq" | "review";

const STEPS: { id: WizardStep; label: string }[] = [
    { id: "upload", label: "Upload PO" },
    { id: "details", label: "PO Details" },
    { id: "milestones", label: "Milestones" },
    { id: "boq", label: "BOQ & ROS" },
    { id: "review", label: "Review" },
];

// Extended form schema with Phase 2 fields
const formSchema = z.object({
    projectId: z.string().uuid("Please select a project"),
    supplierId: z.string().uuid("Please select a supplier"),
    poNumber: z.string().min(1, "PO number is required"),
    totalValue: z.coerce.number().positive("Value must be positive"),
    currency: z.string().min(1, "Currency is required"),
    scope: z.string().optional(),
    paymentTerms: z.string().optional(),
    incoterms: z.string().optional(),
    retentionPercentage: z.coerce.number().min(0).max(100).optional().default(0),
});

type FormData = z.output<typeof formSchema>;

const currencies = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
    { value: "KES", label: "KES - Kenyan Shilling" },
    { value: "AED", label: "AED - UAE Dirham" },
];

const incotermsOptions = [
    { value: "EXW", label: "EXW - Ex Works" },
    { value: "FCA", label: "FCA - Free Carrier" },
    { value: "FOB", label: "FOB - Free on Board" },
    { value: "CIF", label: "CIF - Cost, Insurance & Freight" },
    { value: "DDP", label: "DDP - Delivered Duty Paid" },
    { value: "DAP", label: "DAP - Delivered at Place" },
];

interface ProjectOption {
    id: string;
    name: string;
    organizationId: string;
    currency?: string | null;
}

interface SupplierOption {
    id: string;
    name: string;
}

export default function POWizard({
    projects,
    suppliers,
}: {
    projects: ProjectOption[];
    suppliers: SupplierOption[];
}) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // File upload state
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "extracting" | "done" | "error">("idle");

    // AI Extraction state
    const [extractionStatus, setExtractionStatus] = useState<"idle" | "extracting" | "success" | "error">("idle");
    const [extractedData, setExtractedData] = useState<any>(null);

    // Milestones & BOQ state
    const [milestones, setMilestones] = useState<MilestoneData[]>([]);
    const [boqItems, setBOQItems] = useState<BOQItemWithROS[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            currency: "USD",
            retentionPercentage: 0,
        },
    });

    const selectedProjectId = watch("projectId");
    const selectedProject = projects.find((p) => p.id === selectedProjectId);
    const totalValue = watch("totalValue");
    const currency = watch("currency");

    const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

    // Handle file upload and AI extraction
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setUploadProgress("idle");
        setExtractionStatus("idle");

        if (!selectedProject) {
            toast.warning("Please select a project first");
            e.target.value = "";
            return;
        }

        setUploadProgress("uploading");
        const uploadToast = toast.loading("Uploading document...");

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

            if (!presignResponse.ok) throw new Error("Failed to get upload URL");

            const { uploadUrl, fileUrl: s3FileUrl } = await presignResponse.json();

            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": contentType },
                body: file,
            });

            if (!uploadResponse.ok) throw new Error("Failed to upload file");

            setFileUrl(s3FileUrl);
            toast.success("Document uploaded", { id: uploadToast });
            setUploadProgress("extracting");

            // AI Extraction
            const extractToast = toast.loading("AI analyzing document...");
            setExtractionStatus("extracting");

            const extractResponse = await fetch("/api/po/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileUrl: s3FileUrl }),
            });

            if (extractResponse.ok) {
                const result = await extractResponse.json();
                if (result.success && result.data) {
                    setExtractedData(result.data);

                    // Pre-fill form fields
                    if (result.data.poNumber) setValue("poNumber", result.data.poNumber);
                    if (result.data.totalValue) setValue("totalValue", result.data.totalValue);
                    if (result.data.currency) setValue("currency", result.data.currency);
                    if (result.data.scope) setValue("scope", result.data.scope);
                    if (result.data.paymentTerms) setValue("paymentTerms", result.data.paymentTerms);
                    if (result.data.incoterms) setValue("incoterms", result.data.incoterms);
                    if (result.data.retentionPercentage) setValue("retentionPercentage", result.data.retentionPercentage);

                    // Pre-fill milestones
                    if (result.data.milestones?.length > 0) {
                        setMilestones(result.data.milestones.map((m: any, i: number) => ({
                            ...m,
                            sequenceOrder: i,
                        })));
                    }

                    // Pre-fill BOQ items
                    if (result.data.boqItems?.length > 0) {
                        setBOQItems(result.data.boqItems.map((b: any) => ({
                            ...b,
                            isCritical: false,
                            rosStatus: "NOT_SET" as const,
                        })));
                    }

                    setExtractionStatus("success");
                    toast.success(`AI extraction: ${Math.round(result.data.confidence * 100)}% confidence`, { id: extractToast });
                } else {
                    throw new Error(result.error || "Extraction failed");
                }
            } else {
                throw new Error("AI extraction failed");
            }

            setUploadProgress("done");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Upload failed");
            setUploadProgress("error");
            setExtractionStatus("error");
        }
    };

    // Navigation
    const goNext = () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < STEPS.length) {
            setCurrentStep(STEPS[nextIndex].id);
        }
    };

    const goPrev = () => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(STEPS[prevIndex].id);
        }
    };

    // Submit
    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setSubmitError(null);
        const submitToast = toast.loading("Creating purchase order...");

        try {
            const result = await createPurchaseOrder({
                ...data,
                fileUrl: fileUrl || undefined,
            });

            if (result.success) {
                toast.success("Purchase order created!", { id: submitToast });
                router.push("/dashboard/procurement");
                router.refresh();
            } else {
                setSubmitError(result.error);
                toast.error(result.error, { id: submitToast });
            }
        } catch (error) {
            setSubmitError("Failed to create purchase order. Please try again.");
            toast.error("Failed to create purchase order", { id: submitToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Compliance check
    const complianceData = {
        poNumber: watch("poNumber"),
        totalValue: watch("totalValue"),
        currency: watch("currency"),
        incoterms: watch("incoterms"),
        retentionPercentage: watch("retentionPercentage"),
        paymentTerms: watch("paymentTerms"),
        milestones,
        boqItems,
        projectCurrency: selectedProject?.currency,
    };
    const complianceRules = runValidation(complianceData);
    const canPublish = !complianceRules.some(r => r.severity === "critical" && r.status === "fail");

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/procurement">
                        <ArrowLeftIcon className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">New Purchase Order</h1>
                    <p className="text-muted-foreground">Complete all steps to create a PO</p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-between">
                {STEPS.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                        <button
                            type="button"
                            onClick={() => setCurrentStep(step.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentStep === step.id
                                ? "bg-primary text-primary-foreground"
                                : index < currentStepIndex
                                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                                    : "bg-muted text-muted-foreground"
                                }`}
                        >
                            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">
                                {index < currentStepIndex ? "✓" : index + 1}
                            </span>
                            <span className="text-sm font-medium hidden md:block">{step.label}</span>
                        </button>
                        {index < STEPS.length - 1 && (
                            <div className="w-8 h-0.5 bg-border mx-2" />
                        )}
                    </div>
                ))}
            </div>

            {/* Error Message */}
            {submitError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                    <WarningCircleIcon className="h-5 w-5 text-red-600 mt-0.5" weight="fill" />
                    <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">Submission Failed</p>
                        <p className="text-xs text-red-700 dark:text-red-400 mt-1">{submitError}</p>
                    </div>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
                {/* Step 1: Upload */}
                {currentStep === "upload" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload PO Document</CardTitle>
                            <CardDescription>
                                Upload a PDF and let AI extract the data automatically
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Project Selection */}
                            <div className="grid gap-2">
                                <Label>Project *</Label>
                                <Select onValueChange={(v) => setValue("projectId", v)} value={watch("projectId")}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* File Upload */}
                            <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                {uploadProgress === "idle" && (
                                    <>
                                        <UploadSimpleIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <Input
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            onChange={handleFileChange}
                                            className="max-w-xs mx-auto"
                                        />
                                    </>
                                )}
                                {uploadProgress === "uploading" && (
                                    <div className="flex flex-col items-center gap-2">
                                        <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
                                        <p>Uploading...</p>
                                    </div>
                                )}
                                {uploadProgress === "extracting" && (
                                    <div className="flex flex-col items-center gap-2">
                                        <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
                                        <p>AI analyzing document...</p>
                                    </div>
                                )}
                                {uploadProgress === "done" && (
                                    <div className="flex flex-col items-center gap-2 text-green-600">
                                        <CheckCircleIcon weight="fill" className="h-8 w-8" />
                                        <p>Upload & Analysis Complete</p>
                                        {extractedData?.confidence && (
                                            <p className="text-sm">Confidence: {Math.round(extractedData.confidence * 100)}%</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Details */}
                {currentStep === "details" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>PO Details</CardTitle>
                            <CardDescription>Review and edit the extracted information</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Supplier *</Label>
                                    <Select onValueChange={(v) => setValue("supplierId", v)} value={watch("supplierId")}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>PO Number *</Label>
                                    <Input {...register("poNumber")} />
                                    {errors.poNumber && <p className="text-sm text-destructive">{errors.poNumber.message}</p>}
                                </div>
                                <div>
                                    <Label>Total Value *</Label>
                                    <Input type="number" step="0.01" {...register("totalValue")} />
                                </div>
                                <div>
                                    <Label>Currency</Label>
                                    <Select onValueChange={(v) => setValue("currency", v)} value={watch("currency")}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currencies.map((c) => (
                                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Incoterms</Label>
                                    <Select onValueChange={(v) => setValue("incoterms", v)} value={watch("incoterms")}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select incoterms" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {incotermsOptions.map((i) => (
                                                <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Retention %</Label>
                                    <Input type="number" min="0" max="100" {...register("retentionPercentage")} />
                                </div>
                            </div>
                            <div>
                                <Label>Scope</Label>
                                <Textarea {...register("scope")} placeholder="Project scope description..." />
                            </div>
                            <div>
                                <Label>Payment Terms</Label>
                                <Textarea {...register("paymentTerms")} placeholder="e.g., Net 30, 50% advance..." />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Milestones */}
                {currentStep === "milestones" && (
                    <MilestoneManager
                        milestones={milestones}
                        onChange={setMilestones}
                        totalValue={totalValue}
                        currency={currency}
                    />
                )}

                {/* Step 4: BOQ & ROS */}
                {currentStep === "boq" && (
                    <ROSManager
                        boqItems={boqItems}
                        onChange={setBOQItems}
                        currency={currency}
                    />
                )}

                {/* Step 5: Review */}
                {currentStep === "review" && (
                    <div className="space-y-4">
                        <ComplianceValidator
                            data={complianceData}
                            onNavigateToStep={(step) => setCurrentStep(step)}
                        />

                        <Card>
                            <CardHeader>
                                <CardTitle>Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p><strong>PO Number:</strong> {watch("poNumber")}</p>
                                <p><strong>Total Value:</strong> {currency} {totalValue?.toLocaleString()}</p>
                                <p><strong>Milestones:</strong> {milestones.length}</p>
                                <p><strong>BOQ Items:</strong> {boqItems.length}</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between pt-6">
                    <Button type="button" variant="outline" onClick={goPrev} disabled={currentStepIndex === 0}>
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Previous
                    </Button>

                    {currentStep === "review" ? (
                        <Button type="submit" disabled={isSubmitting || !canPublish}>
                            {isSubmitting ? (
                                <>
                                    <SpinnerIcon className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Publish PO"
                            )}
                        </Button>
                    ) : (
                        <Button type="button" onClick={goNext}>
                            Next
                            <ArrowRightIcon className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
