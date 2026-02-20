"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPurchaseOrder, updatePurchaseOrder, generatePONumber } from "@/lib/actions/procurement";
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
import { CreateSupplierDialog } from "./create-supplier-dialog";
import { Progress } from "@/components/ui/progress";
import { FileArrowUpIcon, FilesIcon } from "@phosphor-icons/react/dist/ssr";

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

interface POInitialData {
    id: string;
    projectId: string;
    supplierId: string;
    poNumber: string;
    totalValue: number;
    currency: string;
    scope?: string | null;
    paymentTerms?: string | null;
    incoterms?: string | null;
    retentionPercentage?: number | null;
    milestones?: any[];
    boqItems?: any[];
}

export default function POWizard({
    projects,
    suppliers,
    initialData,
    mode = "create",
}: {
    projects: ProjectOption[];
    suppliers: SupplierOption[];
    initialData?: POInitialData;
    mode?: "create" | "edit";
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [currentStep, setCurrentStep] = useState<WizardStep>(mode === "edit" ? "details" : "upload");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Optional deep-link: /edit?step=boq (or any WizardStep id)
    useEffect(() => {
        const step = searchParams.get("step");
        if (!step) return;
        const allowed = STEPS.some((s) => s.id === step);
        if (!allowed) return;

        // Prevent skipping analysis step when creating a new PO.
        if (mode !== "edit" && step !== "upload" && uploadProgress !== "done") return;
        setCurrentStep(step as WizardStep);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, searchParams]);

    // File upload state
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "extracting" | "done" | "error">("idle");

    // AI Extraction state
    const [extractionStatus, setExtractionStatus] = useState<"idle" | "extracting" | "success" | "error">("idle");
    const [extractedData, setExtractedData] = useState<any>(null);

    // Supporting documents state (multiple files with type)
    type SupportingDoc = { file: File; type: "boq" | "milestone" | "ro" | "other"; fileUrl?: string };
    const [supportingDocs, setSupportingDocs] = useState<SupportingDoc[]>([]);
    const [simulatedProgress, setSimulatedProgress] = useState(0);

    // Milestones & BOQ state
    const [milestones, setMilestones] = useState<MilestoneData[]>(
        initialData?.milestones?.map((m) => ({
            ...m,
            paymentPercentage: Number(m.paymentPercentage),
        })) || []
    );
    const [boqItems, setBOQItems] = useState<BOQItemWithROS[]>(
        initialData?.boqItems?.map((b) => ({
            ...b,
            quantity: Number(b.quantity),
            unitPrice: Number(b.unitPrice),
            totalPrice: Number(b.totalPrice),
        })) || []
    );
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Dynamic supplier list for inline creation
    const [localSuppliers, setLocalSuppliers] = useState<SupplierOption[]>(suppliers);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(formSchema) as any,
        defaultValues: initialData ? {
            projectId: initialData.projectId,
            supplierId: initialData.supplierId,
            poNumber: initialData.poNumber,
            totalValue: Number(initialData.totalValue),
            currency: initialData.currency,
            scope: initialData.scope || "",
            paymentTerms: initialData.paymentTerms || "",
            incoterms: initialData.incoterms || "",
            retentionPercentage: Number(initialData.retentionPercentage || 0),
        } : {
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
    const processUploads = async (poFile: File, docs: SupportingDoc[]) => {
        if (!selectedProject) {
            toast.warning("Please select a project first");
            return;
        }

        setUploadProgress("uploading");
        setExtractionStatus("extracting");
        setSimulatedProgress(0);

        // Psychological loading bar simulation
        const progressInterval = setInterval(() => {
            setSimulatedProgress((prev) => {
                if (prev < 40) return prev + 2; // Fast at first
                if (prev < 85) return prev + 0.5; // Slower during analysis
                if (prev < 98) return prev + 0.1; // Very slow at the end
                return prev;
            });
        }, 100);

        try {
            // 1. Upload PO
            const poData = await uploadAndPresign(poFile, "po");
            setFileUrl(poData.fileUrl);

            // 2. Upload all supporting documents
            const uploadedDocs = await Promise.all(
                docs.map(async (doc) => {
                    const data = await uploadAndPresign(doc.file, doc.type);
                    return { ...doc, fileUrl: data.fileUrl };
                })
            );
            setSupportingDocs(uploadedDocs);

            setSimulatedProgress(40); // Jump to 40% after uploads

            // 3. Parallel Extraction for PO + supporting docs
            const extractionPromises = [
                fetch("/api/po/extract", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileUrl: poData.fileUrl }),
                }).then(r => r.json())
            ];

            // Extract from milestone/boq documents separately
            const milestoneDoc = uploadedDocs.find(d => d.type === "milestone");
            const boqDoc = uploadedDocs.find(d => d.type === "boq");

            // Extract milestones from milestone doc
            if (milestoneDoc?.fileUrl) {
                extractionPromises.push(
                    fetch("/api/milestones/extract", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ fileUrl: milestoneDoc.fileUrl }),
                    }).then(r => r.json()).catch(() => ({ success: false }))
                );
            } else {
                extractionPromises.push(Promise.resolve({ success: false }));
            }

            // Extract BOQ from BOQ doc
            if (boqDoc?.fileUrl) {
                extractionPromises.push(
                    fetch("/api/boq/extract", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ fileUrl: boqDoc.fileUrl }),
                    }).then(r => r.json()).catch(() => ({ success: false }))
                );
            } else {
                extractionPromises.push(Promise.resolve({ success: false }));
            }

            const results = await Promise.all(extractionPromises);
            const poResult = results[0];
            const msResult = results[1]; // Milestone extraction result
            const boqResult = results[2]; // BOQ extraction result

            if (poResult.success && poResult.data) {
                const data = poResult.data;
                setExtractedData(data);

                // Pre-fill form fields
                if (data.poNumber) setValue("poNumber", data.poNumber);
                if (data.totalValue) setValue("totalValue", data.totalValue);
                if (data.currency) setValue("currency", data.currency);
                if (data.scope) setValue("scope", data.scope);
                if (data.paymentTerms) setValue("paymentTerms", data.paymentTerms);
                if (data.incoterms) setValue("incoterms", data.incoterms);
                if (data.retentionPercentage) setValue("retentionPercentage", data.retentionPercentage);

                // Milestones: Prioritize secondary file if provided
                if (msResult?.success && msResult.milestones?.length > 0) {
                    setMilestones(msResult.milestones.map((m: any, i: number) => ({
                        ...m,
                        sequenceOrder: i,
                    })));
                    toast.success(`Extracted ${msResult.milestones.length} milestones from document`);
                } else if (milestoneDoc?.fileUrl) {
                    // User uploaded a milestone doc but extraction failed
                    console.warn("[PO Wizard] Milestone document extraction failed:", msResult?.error);
                    toast.warning("Could not extract milestones from uploaded document", {
                        description: msResult?.error || "Try using Import on the Milestones step with an Excel file"
                    });
                    // Still fall back to PO milestones if available
                    if (data.milestones?.length > 0) {
                        setMilestones(data.milestones.map((m: any, i: number) => ({
                            ...m,
                            sequenceOrder: i,
                        })));
                    }
                } else if (data.milestones?.length > 0) {
                    setMilestones(data.milestones.map((m: any, i: number) => ({
                        ...m,
                        sequenceOrder: i,
                    })));
                }

                // BOQ: Prioritize secondary file if provided
                if (boqResult?.success && boqResult.items?.length > 0) {
                    setBOQItems(boqResult.items.map((b: any) => ({
                        ...b,
                        isCritical: false,
                        rosStatus: "NOT_SET" as const,
                    })));
                    toast.success(`Extracted ${boqResult.items.length} BOQ items from document`);
                } else if (data.boqItems?.length > 0) {
                    setBOQItems(data.boqItems.map((b: any) => ({
                        ...b,
                        isCritical: false,
                        rosStatus: "NOT_SET" as const,
                    })));
                }

                setExtractionStatus("success");
                setSimulatedProgress(100);
                toast.success("Intelligence analysis complete");
            } else {
                throw new Error(poResult.error || "Extraction failed");
            }

            setUploadProgress("done");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Analysis failed");
            setUploadProgress("error");
            setExtractionStatus("error");
        } finally {
            clearInterval(progressInterval);
        }
    };

    const uploadAndPresign = async (file: File, type: string) => {
        const contentType = file.type || "application/octet-stream";
        const presignResponse = await fetch("/api/upload/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fileName: file.name,
                contentType,
                docType: type,
                orgId: selectedProject?.organizationId,
                projectId: selectedProject?.id,
            }),
        });

        if (!presignResponse.ok) throw new Error(`Failed to get upload URL for ${file.name}`);
        const { uploadUrl, fileUrl } = await presignResponse.json();

        const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: file,
        });

        if (!uploadResponse.ok) throw new Error(`Failed to upload ${file.name}`);
        return { fileUrl };
    };

    const handlePOFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setSelectedFile(file);
    };

    const handleSupportingDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            // Add new files with default type
            const newDocs: SupportingDoc[] = Array.from(files).map(file => ({
                file,
                type: file.name.toLowerCase().includes('boq') ? 'boq' :
                    file.name.toLowerCase().includes('milestone') ? 'milestone' :
                        file.name.toLowerCase().includes('ro') ? 'ro' : 'other',
            }));
            setSupportingDocs(prev => [...prev, ...newDocs]);
        }
    };

    const removeDocument = (index: number) => {
        setSupportingDocs(prev => prev.filter((_, i) => i !== index));
    };

    const changeDocType = (index: number, type: SupportingDoc['type']) => {
        setSupportingDocs(prev => prev.map((doc, i) => i === index ? { ...doc, type } : doc));
    };

    const startAnalysis = () => {
        if (!selectedFile) {
            toast.error("Please select a primary PO document");
            return;
        }
        processUploads(selectedFile, supportingDocs);
    };

    // Navigation with Step 1 validation
    const goNext = () => {
        // Step 1 validation: Must complete analysis before proceeding
        if (currentStep === "upload") {
            if (uploadProgress === "done" || mode === "edit") {
                const nextIndex = currentStepIndex + 1;
                if (nextIndex < STEPS.length) {
                    setCurrentStep(STEPS[nextIndex].id);
                }
                return;
            }

            // If analysis hasn't started but we have file and project, trigger it
            if (uploadProgress === "idle" && selectedFile && watch("projectId")) {
                startAnalysis();
                return;
            }

            toast.error("Please upload and analyze your PO document first");
            return;
        }

        // Step 2 validation: Must fill mandatory fields
        if (currentStep === "details") {
            const supplierId = watch("supplierId");
            const poNumber = watch("poNumber");
            const totalValue = watch("totalValue");

            if (!supplierId) {
                toast.error("Please select a supplier");
                return;
            }
            if (!poNumber || poNumber.trim() === "") {
                toast.error("Please enter a PO number");
                return;
            }
            if (!totalValue || totalValue <= 0) {
                toast.error("Please enter a valid total value");
                return;
            }
        }

        // Step 3 validation: Milestones must total exactly 100% (or be empty)
        if (currentStep === "milestones") {
            const totalPercentage = milestones.reduce((sum, m) => sum + (m.paymentPercentage || 0), 0);
            if (milestones.length > 0 && totalPercentage !== 100) {
                if (totalPercentage > 100) {
                    toast.error(`Milestone percentages total ${totalPercentage}% - must equal 100%`, {
                        description: "Please adjust the payment percentages before proceeding."
                    });
                } else {
                    toast.error(`Milestone percentages total ${totalPercentage}% - must equal 100%`, {
                        description: `Missing ${100 - totalPercentage}% allocation.`
                    });
                }
                return;
            }
        }

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

    const handleSupplierCreated = (newSupplier: SupplierOption) => {
        setLocalSuppliers((prev) => [...prev, newSupplier]);
        setValue("supplierId", newSupplier.id);
        router.refresh(); // Update server-side data for other components
    };

    // Submit
    const onSubmit = async (data: FormData) => {
        // Enforce delivery taxonomy mapping rules (L1/L2 required on every BOQ line)
        const missingCategoryCount = boqItems.filter((b: any) => !b?.discipline || !b?.materialClass).length;
        if (missingCategoryCount > 0) {
            toast.error("Categorize all BOQ items before publishing", {
                description: `${missingCategoryCount} BOQ line item${missingCategoryCount !== 1 ? "s" : ""} missing Discipline and/or Material Class.`,
            });
            setCurrentStep("boq");
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        const submitToast = toast.loading(mode === "edit" ? "Updating purchase order..." : "Creating purchase order...");

        try {
            let result;
            if (mode === "edit" && initialData) {
                result = await updatePurchaseOrder({
                    ...data,
                    id: initialData.id,
                    milestones,
                    boqItems,
                });
            } else {
                result = await createPurchaseOrder({
                    ...data,
                    fileUrl: fileUrl || undefined,
                    milestones,
                    boqItems,
                });
            }

            if (result.success) {
                toast.success(mode === "edit" ? "Purchase order updated!" : "Purchase order created!", { id: submitToast });
                router.push(mode === "edit" ? `/dashboard/procurement/${initialData?.id}` : "/dashboard/procurement");
                router.refresh();
            } else {
                setSubmitError(result.error);
                toast.error(result.error, { id: submitToast });
            }
        } catch (error) {
            setSubmitError(`Failed to ${mode === "edit" ? "update" : "create"} purchase order. Please try again.`);
            toast.error(`Failed to ${mode === "edit" ? "update" : "create"} purchase order`, { id: submitToast });
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
    const hasAllCategories = useMemo(() => boqItems.every((b: any) => !!b?.discipline && !!b?.materialClass), [boqItems]);
    const canPublish =
        !complianceRules.some((r) => r.severity === "critical" && r.status === "fail") &&
        hasAllCategories;

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
                    <h1 className="text-2xl font-bold tracking-tight">
                        {mode === "edit" ? "Edit Purchase Order" : "New Purchase Order"}
                    </h1>
                    <p className="text-muted-foreground">
                        {mode === "edit" 
                            ? `Editing ${initialData?.poNumber || "PO"}`
                            : "Complete all steps to create a PO"
                        }
                    </p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-between">
                {STEPS.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                        <button
                            type="button"
                            onClick={() => {
                                // Prevent skipping Step 1 without completing analysis
                                if (index > 0 && uploadProgress !== "done" && mode !== "edit") {
                                    toast.warning("Complete document analysis first");
                                    return;
                                }
                                setCurrentStep(step.id);
                            }}
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
                    <Card className="border-none shadow-xl bg-card overflow-hidden">
                        <div className="h-1 bg-blue-500" />
                        <CardHeader className="space-y-4">
                            <div>
                                <CardTitle className="text-2xl font-black">Procurement Intake</CardTitle>
                                <CardDescription className="font-medium">
                                    Upload your documents and let our AI handle the data extraction.
                                </CardDescription>
                            </div>

                            {/* Project Selection Moved Up */}
                            <div className="p-4 bg-muted/30 rounded-2xl border border-muted/50 space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <FilesIcon weight="fill" className="h-4 w-4" />
                                    Assign to Project
                                </Label>
                                <Select
                                    onValueChange={async (v) => {
                                        setValue("projectId", v);
                                        // Auto-generate PO number for new POs
                                        if (mode === "create" && v) {
                                            const result = await generatePONumber(v);
                                            if (result.success && result.data) {
                                                setValue("poNumber", result.data.poNumber);
                                            }
                                        }
                                    }}
                                    value={watch("projectId")}
                                >
                                    <SelectTrigger className="h-12 rounded-xl border-muted-foreground/20 bg-background/50 font-bold">
                                        <SelectValue placeholder="Select a project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* PO Upload */}
                                <div className={`relative p-8 rounded-3xl border-2 border-dashed transition-all group ${selectedFile ? 'border-green-500/50 bg-green-500/5' : 'border-muted-foreground/20 hover:border-primary/50 bg-muted/20'}`}>
                                    <input
                                        type="file"
                                        id="po-upload"
                                        accept=".pdf,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        onChange={handlePOFileChange}
                                        disabled={uploadProgress !== "idle" && uploadProgress !== "error"}
                                    />
                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-all ${selectedFile ? 'bg-green-500 text-white' : 'bg-background shadow-md text-muted-foreground group-hover:scale-110'}`}>
                                            <FileArrowUpIcon className="h-8 w-8" weight="duotone" />
                                        </div>
                                        <div>
                                            <p className="font-black text-sm">Primary PO Document</p>
                                            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                                                {selectedFile ? selectedFile.name : "Mandatory document"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Supporting Documents Upload */}
                                <div className={`relative p-8 rounded-3xl border-2 border-dashed transition-all group ${supportingDocs.length > 0 ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-muted-foreground/20 hover:border-indigo-500/50 bg-muted/20'}`}>
                                    <input
                                        type="file"
                                        id="supporting-upload"
                                        accept=".pdf,application/pdf,.xlsx,.xls,.csv,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        onChange={handleSupportingDocChange}
                                        disabled={uploadProgress !== "idle" && uploadProgress !== "error"}
                                        multiple
                                    />
                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-all ${supportingDocs.length > 0 ? 'bg-indigo-500 text-white' : 'bg-background shadow-md text-muted-foreground group-hover:scale-110'}`}>
                                            <FilesIcon className="h-8 w-8" weight="duotone" />
                                        </div>
                                        <div>
                                            <p className="font-black text-sm">BOQ / Milestones / RO</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {supportingDocs.length > 0 ? `${supportingDocs.length} file(s) selected` : "Excel or PDF (optional)"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* List of Supporting Documents */}
                            {supportingDocs.length > 0 && (
                                <div className="space-y-2 p-4 bg-muted/20 rounded-2xl border border-muted/30">
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Supporting Documents</p>
                                    {supportingDocs.map((doc, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 bg-background rounded-xl border">
                                            <FilesIcon className="h-5 w-5 text-indigo-500" weight="fill" />
                                            <span className="flex-1 text-sm font-medium truncate">{doc.file.name}</span>
                                            <select
                                                value={doc.type}
                                                onChange={(e) => changeDocType(index, e.target.value as SupportingDoc['type'])}
                                                className="text-xs px-2 py-1 rounded-lg border bg-muted/50"
                                            >
                                                <option value="boq">BOQ Schedule</option>
                                                <option value="milestone">Milestones</option>
                                                <option value="ro">RO Schedule</option>
                                                <option value="other">Other</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => removeDocument(index)}
                                                className="text-red-500 hover:text-red-700 text-xs font-bold"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Progress Area */}
                            {(uploadProgress === "uploading" || uploadProgress === "extracting") && (
                                <div className="space-y-4 p-6 bg-muted/30 rounded-3xl border border-muted/50">
                                    <div className="flex justify-between items-end mb-1">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black uppercase tracking-widest text-primary animate-pulse">
                                                {uploadProgress === "uploading" ? "Broadcasting to Cloud..." : "AI Neural Processing..."}
                                            </p>
                                            <p className="text-xl font-black">Analyzing Document Intelligence</p>
                                        </div>
                                        <span className="text-2xl font-black">{Math.round(simulatedProgress)}%</span>
                                    </div>
                                    <Progress value={simulatedProgress} className="h-3 rounded-full bg-muted shadow-inner" />
                                </div>
                            )}

                            {uploadProgress === "done" && (
                                <div className="p-6 bg-green-500/10 rounded-3xl border border-green-500/20 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg ring-4 ring-green-500/20">
                                        <CheckCircleIcon weight="fill" className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <p className="font-black">Success! Intelligence Captured</p>
                                        <p className="text-sm text-green-600 font-medium">Proceed to verify the extracted details.</p>
                                    </div>
                                    <Button onClick={goNext} className="ml-auto rounded-xl font-bold bg-green-600 hover:bg-green-700">
                                        Verify Data
                                    </Button>
                                </div>
                            )}

                            {uploadProgress === "idle" && (
                                <Button
                                    onClick={startAnalysis}
                                    disabled={!selectedFile || !watch("projectId")}
                                    className="w-full h-16 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-black text-lg shadow-xl group"
                                >
                                    Start AI Analysis
                                    <ArrowRightIcon className="h-6 w-6 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            )}
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
                                    <div className="flex items-center justify-between mb-2">
                                        <Label>Supplier *</Label>
                                        <CreateSupplierDialog
                                            onSuccess={handleSupplierCreated}
                                            trigger={
                                                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs">
                                                    + Add New
                                                </Button>
                                            }
                                        />
                                    </div>
                                    <Select onValueChange={(v) => setValue("supplierId", v)} value={watch("supplierId")}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {localSuppliers.map((s) => (
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
                        orgId={selectedProject?.organizationId}
                        projectId={watch("projectId")}
                    />
                )}

                {/* Step 5: Review */}
                {currentStep === "review" && (
                    <div className="space-y-4">
                        <ComplianceValidator
                            data={complianceData}
                            onNavigateToStep={(step) => setCurrentStep(step)}
                            onUpdateValue={(field, value) => {
                                if (field === "totalValue" && typeof value === "number") {
                                    setValue("totalValue", value);
                                }
                            }}
                        />

                        <Card>
                            <CardHeader>
                                <CardTitle>Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p><strong>PO Number:</strong> {watch("poNumber")}</p>
                                <p><strong>Total Value:</strong> {currency} {(totalValue ?? 0).toLocaleString()}</p>
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
                                    {mode === "edit" ? "Updating..." : "Creating..."}
                                </>
                            ) : (
                                mode === "edit" ? "Save Changes" : "Publish PO"
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
