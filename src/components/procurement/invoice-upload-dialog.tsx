"use client";

/**
 * Invoice Upload Dialog
 * 
 * Flow per user journey:
 * 1. Supplier uploads invoice document (PDF/image)
 * 2. System extracts data via AI (invoice number, amount, dates)
 * 3. Supplier selects milestone to link
 * 4. System validates invoice amount vs milestone
 * 5. Submit for PM approval
 */

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import {
    Upload,
    CircleNotch,
    FileText,
    Warning,
    CheckCircle,
    XCircle,
    CloudArrowUp,
    MagicWand,
    CurrencyDollar,
    Calendar,
    Hash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Milestone {
    id: string;
    title: string;
    amount?: string;
    paymentPercentage: string;
    status: string;
}

interface ExtractedInvoiceData {
    invoiceNumber: string | null;
    vendorName: string | null;
    date: string | null;
    dueDate: string | null;
    totalAmount: number | null;
    currency: string | null;
    confidence: number;
}

interface InvoiceUploadDialogProps {
    purchaseOrderId: string;
    supplierId: string;
    milestones: Milestone[];
    poTotalValue: number;
    currency?: string;
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function InvoiceUploadDialog({
    purchaseOrderId,
    supplierId,
    milestones,
    poTotalValue,
    currency = "USD",
    onSuccess,
    trigger,
}: InvoiceUploadDialogProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(null);
    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | undefined>();

    const [validationResult, setValidationResult] = useState<{
        status: "PASSED" | "MISMATCH" | "FAILED" | null;
        reason?: string;
    }>({ status: null });

    // Editable fields - these can be modified by user if AI extraction fails or is wrong
    const [editableInvoiceNumber, setEditableInvoiceNumber] = useState("");
    const [editableAmount, setEditableAmount] = useState("");
    const [editableDate, setEditableDate] = useState("");
    const [editableDueDate, setEditableDueDate] = useState("");

    // File dropzone
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const selectedFile = acceptedFiles[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setExtractedData(null);
        setValidationResult({ status: null });

        // Upload file to S3
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("purchaseOrderId", purchaseOrderId);
            formData.append("documentType", "INVOICE");

            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const uploadResponse = await fetch("/api/documents/upload", {
                method: "POST",
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (!uploadResponse.ok) {
                throw new Error("Upload failed");
            }

            const { document } = await uploadResponse.json();
            setDocumentUrl(document.fileUrl);

            // Now extract invoice data
            setIsExtracting(true);

            const extractResponse = await fetch("/api/invoices/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileUrl: document.fileUrl }),
            });

            if (!extractResponse.ok) {
                throw new Error("Extraction failed");
            }

            const { data } = await extractResponse.json();
            setExtractedData(data);

            // Initialize editable fields from extracted data
            setEditableInvoiceNumber(data.invoiceNumber || "");
            setEditableAmount(data.totalAmount ? String(data.totalAmount) : "");
            setEditableDate(data.date ? data.date.split("T")[0] : "");
            setEditableDueDate(data.dueDate ? data.dueDate.split("T")[0] : "");

            toast.success("Invoice data extracted successfully!");

        } catch (error) {
            console.error("Upload/extraction error:", error);
            toast.error("Failed to process invoice");
        } finally {
            setIsUploading(false);
            setIsExtracting(false);
        }
    }, [purchaseOrderId]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
        },
        maxFiles: 1,
        disabled: isUploading || isExtracting,
    });

    // Validate invoice amount against milestone
    const validateAgainstMilestone = useCallback((msId: string, invoiceAmount: number | null) => {
        if (!invoiceAmount) {
            setValidationResult({ status: null });
            return;
        }

        const milestone = milestones.find((m) => m.id === msId);
        if (!milestone) {
            setValidationResult({ status: null });
            return;
        }

        // Calculate expected amount from milestone percentage
        const percentage = parseFloat(milestone.paymentPercentage);
        const expectedAmount = (percentage / 100) * poTotalValue;

        // Allow 1% tolerance for rounding
        const tolerance = expectedAmount * 0.01;
        const diff = Math.abs(invoiceAmount - expectedAmount);

        if (diff <= tolerance) {
            setValidationResult({
                status: "PASSED",
                reason: `Invoice matches milestone: ${currency} ${expectedAmount.toLocaleString()}`,
            });
        } else if (invoiceAmount < expectedAmount) {
            setValidationResult({
                status: "MISMATCH",
                reason: `Invoice (${currency} ${invoiceAmount.toLocaleString()}) is less than milestone (${currency} ${expectedAmount.toLocaleString()})`,
            });
        } else {
            setValidationResult({
                status: "FAILED",
                reason: `Invoice (${currency} ${invoiceAmount.toLocaleString()}) exceeds milestone (${currency} ${expectedAmount.toLocaleString()})`,
            });
        }
    }, [milestones, poTotalValue, currency]);

    // Handle milestone selection
    const handleMilestoneChange = (milestoneId: string) => {
        setSelectedMilestoneId(milestoneId);
        if (editableAmount) {
            validateAgainstMilestone(milestoneId, parseFloat(editableAmount));
        }
    };

    // Submit invoice for approval
    const handleSubmit = async () => {
        if (!documentUrl) {
            toast.error("Please upload an invoice first");
            return;
        }

        if (!editableInvoiceNumber || !editableAmount) {
            toast.error("Invoice number and amount are required");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "submitForApproval",
                    purchaseOrderId,
                    supplierId,
                    invoiceNumber: editableInvoiceNumber,
                    amount: parseFloat(editableAmount),
                    invoiceDate: editableDate || new Date().toISOString().split("T")[0],
                    dueDate: editableDueDate || null,
                    milestoneId: selectedMilestoneId,
                    documentUrl,
                    extractedData,
                    validationStatus: validationResult.status || "PENDING",
                    validationNotes: validationResult.reason,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Submission failed");
            }

            toast.success("Invoice submitted for approval!", {
                description: "The Project Manager will review and approve.",
            });

            setOpen(false);
            resetForm();
            onSuccess?.();
        } catch (error) {
            console.error("Submit error:", error);
            toast.error("Failed to submit invoice", {
                description: error instanceof Error ? error.message : undefined,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setExtractedData(null);
        setDocumentUrl(null);
        setSelectedMilestoneId(undefined);
        setValidationResult({ status: null });
        setUploadProgress(0);
        // Clear editable fields
        setEditableInvoiceNumber("");
        setEditableAmount("");
        setEditableDate("");
        setEditableDueDate("");
    };

    const approvedMilestones = milestones.filter(
        (m) => m.status === "APPROVED" || m.status === "INVOICED" || m.status === "PARTIALLY_PAID"
    );

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Invoice
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Upload Invoice</DialogTitle>
                    <DialogDescription>
                        Upload an invoice document. The system will extract the data automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Step 1: File Upload */}
                    {!extractedData && (
                        <div
                            {...getRootProps()}
                            className={cn(
                                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                                (isUploading || isExtracting) && "pointer-events-none opacity-50"
                            )}
                        >
                            <input {...getInputProps()} />

                            {isUploading ? (
                                <div className="space-y-3">
                                    <CloudArrowUp size={40} className="mx-auto text-primary animate-bounce" />
                                    <p className="text-sm">Uploading...</p>
                                    <Progress value={uploadProgress} className="w-2/3 mx-auto" />
                                </div>
                            ) : isExtracting ? (
                                <div className="space-y-3">
                                    <MagicWand size={40} className="mx-auto text-primary animate-pulse" />
                                    <p className="text-sm">Extracting invoice data with AI...</p>
                                    <CircleNotch size={24} className="mx-auto animate-spin text-primary" />
                                </div>
                            ) : (
                                <>
                                    <FileText size={40} className="mx-auto text-muted-foreground mb-3" />
                                    <p className="text-sm text-muted-foreground">
                                        {isDragActive ? "Drop the invoice here" : "Drag & drop an invoice, or click to select"}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Supports: PDF, PNG, JPG
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 2: Extracted Data Display - Editable Fields */}
                    {extractedData && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium flex items-center gap-2">
                                    <MagicWand size={16} className="text-primary" />
                                    Extracted Data
                                </h4>
                                <Badge variant={extractedData.confidence > 0.8 ? "default" : "secondary"}>
                                    {Math.round(extractedData.confidence * 100)}% confidence
                                </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Review and edit any fields that weren&apos;t extracted correctly.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Invoice Number */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <Hash size={12} />
                                        Invoice Number *
                                    </label>
                                    <input
                                        type="text"
                                        value={editableInvoiceNumber}
                                        onChange={(e) => setEditableInvoiceNumber(e.target.value)}
                                        placeholder="Enter invoice number"
                                        className={cn(
                                            "w-full px-3 py-2 text-sm border rounded-md bg-background",
                                            !editableInvoiceNumber && "border-amber-500 bg-amber-50/50"
                                        )}
                                    />
                                </div>

                                {/* Amount */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <CurrencyDollar size={12} />
                                        Amount ({currency}) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editableAmount}
                                        onChange={(e) => {
                                            setEditableAmount(e.target.value);
                                            // Re-validate if milestone selected
                                            if (selectedMilestoneId && e.target.value) {
                                                validateAgainstMilestone(selectedMilestoneId, parseFloat(e.target.value));
                                            }
                                        }}
                                        placeholder="0.00"
                                        className={cn(
                                            "w-full px-3 py-2 text-sm border rounded-md bg-background",
                                            !editableAmount && "border-amber-500 bg-amber-50/50"
                                        )}
                                    />
                                </div>

                                {/* Invoice Date */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <Calendar size={12} />
                                        Invoice Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editableDate}
                                        onChange={(e) => setEditableDate(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                                    />
                                </div>

                                {/* Due Date */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <Calendar size={12} />
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editableDueDate}
                                        onChange={(e) => setEditableDueDate(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                                    />
                                </div>
                            </div>

                            {/* Re-upload button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetForm}
                                className="text-muted-foreground"
                            >
                                <Upload size={14} className="mr-2" />
                                Upload different file
                            </Button>
                        </div>
                    )}


                    {/* Step 3: Milestone Selection */}
                    {extractedData && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Link to Milestone (Optional)</label>
                            <Select value={selectedMilestoneId} onValueChange={handleMilestoneChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select milestone to link" />
                                </SelectTrigger>
                                <SelectContent>
                                    {approvedMilestones.length === 0 ? (
                                        <SelectItem value="none" disabled>
                                            No approved milestones available
                                        </SelectItem>
                                    ) : (
                                        approvedMilestones.map((ms) => (
                                            <SelectItem key={ms.id} value={ms.id}>
                                                {ms.title} ({ms.paymentPercentage}% - {currency} {((parseFloat(ms.paymentPercentage) / 100) * poTotalValue).toLocaleString()})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Linking to a milestone enables automatic amount validation.
                            </p>
                        </div>
                    )}

                    {/* Validation Result */}
                    {validationResult.status && (
                        <div className={cn(
                            "flex items-start gap-3 p-3 rounded-lg",
                            validationResult.status === "PASSED" && "bg-green-500/10 text-green-600",
                            validationResult.status === "MISMATCH" && "bg-amber-500/10 text-amber-600",
                            validationResult.status === "FAILED" && "bg-red-500/10 text-red-600"
                        )}>
                            {validationResult.status === "PASSED" && <CheckCircle size={20} weight="fill" />}
                            {validationResult.status === "MISMATCH" && <Warning size={20} weight="fill" />}
                            {validationResult.status === "FAILED" && <XCircle size={20} weight="fill" />}
                            <p className="text-sm">{validationResult.reason}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    {extractedData && (
                        <div className="flex gap-3 pt-4 border-t">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !editableInvoiceNumber || !editableAmount}
                            >
                                {isSubmitting && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                                Submit for Approval
                            </Button>

                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
