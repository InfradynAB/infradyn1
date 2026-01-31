"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    parseExcelPreview,
    parseExcelWithMapping,
    importBOQItems,
} from "@/lib/actions/boq";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    UploadSimpleIcon,
    SpinnerGap,
    FileXlsIcon,
    CheckCircleIcon,
    WarningIcon,
} from "@phosphor-icons/react/dist/ssr";

interface ImportBOQDialogProps {
    purchaseOrderId: string;
}

interface ColumnMapping {
    itemNumber: string;
    description: string;
    unit: string;
    quantity: string;
    unitPrice: string;
    totalPrice?: string;
}

interface ParsedRow {
    itemNumber: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

export function ImportBOQDialog({ purchaseOrderId }: ImportBOQDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<Step>("upload");
    const [error, setError] = useState<string | null>(null);

    // File data
    const [fileData, setFileData] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>("");

    // Column data
    const [columns, setColumns] = useState<string[]>([]);
    const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
    const [totalRows, setTotalRows] = useState(0);

    // Mapping
    const [mapping, setMapping] = useState<ColumnMapping>({
        itemNumber: "",
        description: "",
        unit: "",
        quantity: "",
        unitPrice: "",
        totalPrice: "",
    });

    // Parsed rows
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [parseErrors, setParseErrors] = useState<string[]>([]);

    // Import result
    const [importedCount, setImportedCount] = useState(0);

    const resetState = useCallback(() => {
        setStep("upload");
        setError(null);
        setFileData(null);
        setFileName("");
        setColumns([]);
        setPreviewData([]);
        setTotalRows(0);
        setMapping({
            itemNumber: "",
            description: "",
            unit: "",
            quantity: "",
            unitPrice: "",
            totalPrice: "",
        });
        setParsedRows([]);
        setParseErrors([]);
        setImportedCount(0);
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setFileName(file.name);

        // Read file as base64
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = (event.target?.result as string)?.split(",")[1];
            if (!base64) {
                setError("Failed to read file");
                return;
            }

            setFileData(base64);

            // Parse preview
            const result = await parseExcelPreview(base64);
            if (result.success && result.data) {
                setColumns(result.data.columns);
                setPreviewData(result.data.preview);
                setTotalRows(result.data.totalRows);

                // Auto-detect common column names
                autoDetectMapping(result.data.columns);

                setStep("mapping");
            } else {
                setError(result.error || "Failed to parse Excel file");
            }
        };
        reader.readAsDataURL(file);
    };

    const autoDetectMapping = (cols: string[]) => {
        const lowerCols = cols.map((c) => c.toLowerCase());
        const newMapping: ColumnMapping = { ...mapping };

        // Common patterns for each field
        const patterns: Record<keyof ColumnMapping, string[]> = {
            itemNumber: ["item", "no", "number", "#", "id", "code"],
            description: ["description", "desc", "name", "item name", "material"],
            unit: ["unit", "uom", "measure"],
            quantity: ["qty", "quantity", "amount", "count"],
            unitPrice: ["unit price", "price", "rate", "unit cost", "cost"],
            totalPrice: ["total", "total price", "amount", "value", "line total"],
        };

        Object.entries(patterns).forEach(([field, keywords]) => {
            const match = cols.find((col) =>
                keywords.some((kw) => col.toLowerCase().includes(kw))
            );
            if (match) {
                newMapping[field as keyof ColumnMapping] = match;
            }
        });

        setMapping(newMapping);
    };

    const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
        setMapping((prev) => ({ ...prev, [field]: value }));
    };

    const handleParseWithMapping = async () => {
        if (!fileData) return;

        // Validate required mappings
        if (!mapping.description || !mapping.quantity || !mapping.unitPrice) {
            setError("Please map Description, Quantity, and Unit Price columns");
            return;
        }

        setError(null);
        const result = await parseExcelWithMapping(fileData, mapping);

        if (result.success && result.data) {
            setParsedRows(result.data.rows);
            setParseErrors(result.data.errors);
            setStep("preview");
        } else {
            setError(result.error || "Failed to parse with mapping");
        }
    };

    const handleImport = async () => {
        setStep("importing");
        setError(null);

        const result = await importBOQItems({
            purchaseOrderId,
            rows: parsedRows,
        });

        if (result.success && result.data) {
            setImportedCount(result.data.count);
            setStep("done");
            router.refresh();
        } else {
            setError(result.error || "Failed to import items");
            setStep("preview");
        }
    };

    const handleClose = () => {
        setOpen(false);
        setTimeout(resetState, 300);
    };

    const isMappingValid =
        mapping.description && mapping.quantity && mapping.unitPrice;

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline">
                    <UploadSimpleIcon className="mr-2 h-4 w-4" />
                    Import BOQ
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                {/* Step 1: Upload */}
                {step === "upload" && (
                    <>
                        <SheetHeader>
                            <SheetTitle>Import BOQ from Excel</SheetTitle>
                            <SheetDescription>
                                Upload an Excel file (.xlsx, .xls) containing your Bill of
                                Quantities.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="py-8">
                            <Label
                                htmlFor="boq-file"
                                className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                            >
                                <FileXlsIcon className="h-16 w-16 text-muted-foreground mb-4" />
                                <span className="text-sm text-muted-foreground font-medium">
                                    Click to upload or drag and drop
                                </span>
                                <span className="text-xs text-muted-foreground mt-2">
                                    Excel files only (.xlsx, .xls)
                                </span>
                                <Input
                                    id="boq-file"
                                    type="file"
                                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </Label>
                            {error && (
                                <p className="text-sm text-destructive mt-4 text-center">
                                    {error}
                                </p>
                            )}
                        </div>
                        <SheetFooter>
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                        </SheetFooter>
                    </>
                )}

                {/* Step 2: Column Mapping */}
                {step === "mapping" && (
                    <>
                        <SheetHeader>
                            <SheetTitle>Map Columns</SheetTitle>
                            <SheetDescription>
                                {fileName} • {totalRows} rows found. Map Excel columns to BOQ
                                fields.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-4 py-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Item # (optional)</Label>
                                    <Select
                                        value={mapping.itemNumber || "__none__"}
                                        onValueChange={(v) =>
                                            handleMappingChange("itemNumber", v === "__none__" ? "" : v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">None (auto-generate)</SelectItem>
                                            {columns.map((col) => (
                                                <SelectItem key={col} value={col}>
                                                    {col}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>
                                        Description <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={mapping.description}
                                        onValueChange={(v) =>
                                            handleMappingChange("description", v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {columns.map((col) => (
                                                <SelectItem key={col} value={col}>
                                                    {col}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit (optional)</Label>
                                    <Select
                                        value={mapping.unit || "__none__"}
                                        onValueChange={(v) => handleMappingChange("unit", v === "__none__" ? "" : v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">None (default: EA)</SelectItem>
                                            {columns.map((col) => (
                                                <SelectItem key={col} value={col}>
                                                    {col}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>
                                        Quantity <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={mapping.quantity}
                                        onValueChange={(v) =>
                                            handleMappingChange("quantity", v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {columns.map((col) => (
                                                <SelectItem key={col} value={col}>
                                                    {col}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>
                                        Unit Price <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={mapping.unitPrice}
                                        onValueChange={(v) =>
                                            handleMappingChange("unitPrice", v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {columns.map((col) => (
                                                <SelectItem key={col} value={col}>
                                                    {col}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Total Price (optional)</Label>
                                    <Select
                                        value={mapping.totalPrice || "__none__"}
                                        onValueChange={(v) =>
                                            handleMappingChange("totalPrice", v === "__none__" ? "" : v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">None (auto-calculate)</SelectItem>
                                            {columns.map((col) => (
                                                <SelectItem key={col} value={col}>
                                                    {col}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Preview table */}
                            <div className="mt-4">
                                <Label className="mb-2 block">Data Preview (first 5 rows)</Label>
                                <div className="border rounded-lg overflow-x-auto max-h-48">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {columns.slice(0, 6).map((col) => (
                                                    <TableHead key={col} className="whitespace-nowrap">
                                                        {col}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewData.slice(0, 5).map((row, i) => (
                                                <TableRow key={i}>
                                                    {columns.slice(0, 6).map((col) => (
                                                        <TableCell key={col} className="text-sm">
                                                            {String(row[col] || "")}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}
                        </div>
                        <SheetFooter className="gap-2 sm:gap-2">
                            <Button variant="outline" onClick={() => setStep("upload")}>
                                Back
                            </Button>
                            <Button onClick={handleParseWithMapping} disabled={!isMappingValid}>
                                Continue to Preview
                            </Button>
                        </SheetFooter>
                    </>
                )}

                {/* Step 3: Preview Parsed Data */}
                {step === "preview" && (
                    <>
                        <SheetHeader>
                            <SheetTitle>Review Import</SheetTitle>
                            <SheetDescription>
                                {parsedRows.length} items parsed successfully.
                                {parseErrors.length > 0 && (
                                    <span className="text-amber-600 ml-2">
                                        {parseErrors.length} warnings
                                    </span>
                                )}
                            </SheetDescription>
                        </SheetHeader>
                        <div className="py-6">
                            {parseErrors.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium mb-1">
                                        <WarningIcon className="h-4 w-4" />
                                        Parse Warnings
                                    </div>
                                    <ul className="text-xs text-amber-600 dark:text-amber-500 list-disc list-inside">
                                        {parseErrors.slice(0, 3).map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                        {parseErrors.length > 3 && (
                                            <li>...and {parseErrors.length - 3} more</li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            <div className="border rounded-lg overflow-x-auto max-h-64">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item #</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Unit</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedRows.slice(0, 20).map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{row.itemNumber}</TableCell>
                                                <TableCell className="max-w-[200px] truncate">
                                                    {row.description}
                                                </TableCell>
                                                <TableCell>{row.unit}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {(row.quantity ?? 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {(row.unitPrice ?? 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {(row.totalPrice ?? 0).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {parsedRows.length > 20 && (
                                <p className="text-xs text-muted-foreground text-center mt-2">
                                    Showing 20 of {parsedRows.length} items
                                </p>
                            )}

                            {error && (
                                <p className="text-sm text-destructive mt-4">{error}</p>
                            )}
                        </div>
                        <SheetFooter className="gap-2 sm:gap-2">
                            <Button variant="outline" onClick={() => setStep("mapping")}>
                                Back
                            </Button>
                            <Button onClick={handleImport}>
                                Import {parsedRows.length} Items
                            </Button>
                        </SheetFooter>
                    </>
                )}

                {/* Step 4: Importing */}
                {step === "importing" && (
                    <div className="py-16 text-center">
                        <SpinnerGap className="h-12 w-12 animate-spin mx-auto text-primary" />
                        <p className="mt-4 text-muted-foreground">
                            Importing {parsedRows.length} items...
                        </p>
                    </div>
                )}

                {/* Step 5: Done */}
                {step === "done" && (
                    <>
                        <div className="py-16 text-center">
                            <CheckCircleIcon className="h-20 w-20 text-green-500 mx-auto" />
                            <h3 className="text-xl font-semibold mt-4">Import Complete!</h3>
                            <p className="text-muted-foreground mt-2">
                                Successfully imported {importedCount} BOQ items.
                            </p>
                        </div>
                        <SheetFooter>
                            <Button onClick={handleClose}>Done</Button>
                        </SheetFooter>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
