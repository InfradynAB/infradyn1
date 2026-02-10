"use client";

/**
 * Shipment Document Upload Step
 *
 * Drag-and-drop file upload zone for packing list / commercial invoice PDFs.
 * Shows upload progress and extraction status with animated feedback.
 */

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShipmentUploadStepProps {
    onExtractionComplete: (data: ExtractedShipmentResult) => void;
    onSkip: () => void;
    isExtracting: boolean;
    setIsExtracting: (v: boolean) => void;
}

export interface ExtractedShipmentResult {
    orderNumber?: string | null;
    project?: string | null;
    invoiceNumber?: string | null;
    invoiceDate?: string | null;
    supplierName?: string | null;
    customerName?: string | null;
    deliveryConditions?: string | null;
    deliveryAddress?: string | null;
    origin?: string | null;
    destination?: string | null;
    currency?: string | null;
    totalExclVat?: number | null;
    totalInclVat?: number | null;
    totalGrossWeightKg?: number | null;
    totalNetWeightKg?: number | null;
    items: ExtractedItemResult[];
    confidence: number;
}

export interface ExtractedItemResult {
    id: string; // client-side ID for editing
    articleNumber: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number | null;
    totalPrice: number | null;
    weightKg: number | null;
    hsCode: string | null;
    countryOfOrigin: string | null;
    deliveryNote: string | null;
    packages: {
        packageNo: string;
        lengthM: number | null;
        quantity: number;
        totalAreaM2: number | null;
        grossWeightKg: number | null;
    }[];
}

const ACCEPTED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const EXTRACTION_STATUSES = [
    "Uploading document...",
    "Extracting text from pages...",
    "Analyzing document structure...",
    "Identifying items and packages...",
    "Parsing weights and dimensions...",
    "Finalizing extraction...",
];

export function ShipmentUploadStep({
    onExtractionComplete,
    onSkip,
    isExtracting,
    setIsExtracting,
}: ShipmentUploadStepProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusIndex, setStatusIndex] = useState(0);

    const validateFile = (file: File): string | null => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            const ext = file.name.split(".").pop()?.toLowerCase();
            if (!["pdf", "xlsx", "xls", "docx"].includes(ext || "")) {
                return "Unsupported file type. Please upload PDF, Excel, or Word documents.";
            }
        }
        if (file.size > MAX_FILE_SIZE) {
            return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB.`;
        }
        return null;
    };

    const handleFileSelect = useCallback((file: File) => {
        setError(null);
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }
        setSelectedFile(file);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelect(file);
        },
        [handleFileSelect]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
        },
        [handleFileSelect]
    );

    const handleExtract = async () => {
        if (!selectedFile) return;

        setIsExtracting(true);
        setError(null);
        setStatusIndex(0);

        // Cycle through status messages while extracting
        const statusInterval = setInterval(() => {
            setStatusIndex((prev) =>
                prev < EXTRACTION_STATUSES.length - 1 ? prev + 1 : prev
            );
        }, 3000);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);

            const response = await fetch("/api/extraction/shipment", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || "Extraction failed");
            }

            // Convert snake_case → camelCase and add client IDs
            const data = result.data;
            const extractedResult: ExtractedShipmentResult = {
                orderNumber: data.order_number,
                project: data.project,
                invoiceNumber: data.invoice_number,
                invoiceDate: data.invoice_date,
                supplierName: data.supplier_name,
                customerName: data.customer_name,
                deliveryConditions: data.delivery_conditions,
                deliveryAddress: data.delivery_address,
                origin: data.origin,
                destination: data.destination,
                currency: data.currency,
                totalExclVat: data.total_excl_vat,
                totalInclVat: data.total_incl_vat,
                totalGrossWeightKg: data.total_gross_weight_kg,
                totalNetWeightKg: data.total_net_weight_kg,
                items: (data.items || []).map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (item: any, idx: number): ExtractedItemResult => ({
                        id: `ext-${idx}-${Date.now()}`,
                        articleNumber: item.article_number || "",
                        description: item.description || "",
                        quantity: item.quantity || 0,
                        unit: item.unit || "",
                        unitPrice: item.unit_price,
                        totalPrice: item.total_price,
                        weightKg: item.weight_kg,
                        hsCode: item.hs_code,
                        countryOfOrigin: item.country_of_origin,
                        deliveryNote: item.delivery_note,
                        packages: (item.packages || []).map(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (pkg: any) => ({
                                packageNo: pkg.package_no || "",
                                lengthM: pkg.length_m,
                                quantity: pkg.quantity || 0,
                                totalAreaM2: pkg.total_area_m2,
                                grossWeightKg: pkg.gross_weight_kg,
                            })
                        ),
                    })
                ),
                confidence: data.confidence || 0,
            };

            onExtractionComplete(extractedResult);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to extract document"
            );
        } finally {
            clearInterval(statusInterval);
            setIsExtracting(false);
        }
    };

    return (
        <div className="space-y-4 py-4">
            {/* Extraction in progress */}
            {isExtracting && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="relative">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-sm font-medium text-foreground">
                            {EXTRACTION_STATUSES[statusIndex]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            This may take 15–30 seconds for large documents
                        </p>
                    </div>
                    {/* Progress dots */}
                    <div className="flex items-center gap-1.5">
                        {EXTRACTION_STATUSES.map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "h-1.5 w-1.5 rounded-full transition-colors",
                                    i <= statusIndex
                                        ? "bg-blue-500"
                                        : "bg-muted"
                                )}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Upload zone */}
            {!isExtracting && (
                <>
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                            isDragOver
                                ? "border-blue-500 bg-blue-500/5"
                                : selectedFile
                                    ? "border-green-500/50 bg-green-500/5"
                                    : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
                        )}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.xlsx,.xls,.docx"
                            onChange={handleInputChange}
                            className="hidden"
                        />

                        {selectedFile ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30">
                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">{selectedFile.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFile(null);
                                    }}
                                    className="text-xs text-muted-foreground"
                                >
                                    <X className="h-3 w-3 mr-1" /> Remove
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                        Drop your packing list here or click to browse
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        PDF, Excel, or Word — up to 50MB
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onSkip}
                            className="text-muted-foreground text-xs"
                        >
                            Skip — enter items manually
                        </Button>

                        {selectedFile && (
                            <Button onClick={handleExtract} className="gap-2">
                                <FileText className="h-4 w-4" />
                                Extract Data
                            </Button>
                        )}
                    </div>

                    {/* Features note */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        {["Multilingual", "Package Details", "HS Codes", "Weights"].map(
                            (feat) => (
                                <Badge key={feat} variant="secondary" className="text-xs font-normal">
                                    {feat}
                                </Badge>
                            )
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
