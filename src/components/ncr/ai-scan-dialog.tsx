"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, CheckCircle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface AIScanDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDataExtracted: (data: ExtractedData) => void;
}

interface ExtractedData {
    poNumber?: string;
    issueType?: string;
    severity?: string;
    title?: string;
    description?: string;
    supplierName?: string;
    batchId?: string;
    confidence: number;
}

export function AIScanDialog({ open, onOpenChange, onDataExtracted }: AIScanDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [extracted, setExtracted] = useState<ExtractedData | null>(null);
    const [editedData, setEditedData] = useState<ExtractedData | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            // Validate it's an image
            if (!selected.type.startsWith("image/")) {
                toast.error("Please upload an image file (PNG, JPEG, or WEBP)");
                return;
            }
            setFile(selected);
            setExtracted(null);
            setEditedData(null);
            // Create preview
            const reader = new FileReader();
            reader.onload = () => setPreview(reader.result as string);
            reader.readAsDataURL(selected);
        }
    };

    const handleScan = async () => {
        if (!file || !preview) return;

        setScanning(true);
        try {
            const res = await fetch("/api/ncr/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl: preview,
                    fileName: file.name,
                }),
            });

            const result = await res.json();
            if (result.success && result.data) {
                setExtracted(result.data);
                setEditedData(result.data);
                toast.success("Document scanned successfully");
            } else {
                toast.error(result.error || "Failed to scan document");
            }
        } catch (error) {
            toast.error("Failed to scan document");
            console.error("Scan error:", error);
        } finally {
            setScanning(false);
        }
    };

    const handleUseData = () => {
        if (editedData) {
            onDataExtracted(editedData);
            onOpenChange(false);
            setFile(null);
            setPreview(null);
            setExtracted(null);
            setEditedData(null);
        }
    };

    const resetDialog = () => {
        onOpenChange(false);
        setFile(null);
        setPreview(null);
        setExtracted(null);
        setEditedData(null);
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 80) return "bg-green-500";
        if (confidence >= 50) return "bg-yellow-500";
        return "bg-red-500";
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        AI Document Scanner
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* File Upload */}
                    {!extracted && (
                        <div className="space-y-3">
                            <div>
                                <Label>Upload Photo of NCR Document</Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Take a photo or upload an image of the site report, inspection form, or defect photo.
                                    <br />
                                    <span className="text-purple-600 font-medium">Supported: PNG, JPEG, WEBP images only</span>
                                </p>
                            </div>
                            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="scan-file"
                                />
                                <label htmlFor="scan-file" className="cursor-pointer block">
                                    {file && preview ? (
                                        <div className="space-y-2">
                                            <img
                                                src={preview}
                                                alt="Preview"
                                                className="max-h-40 mx-auto rounded border"
                                            />
                                            <p className="text-sm font-medium truncate max-w-xs mx-auto">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">Click to change image</p>
                                        </div>
                                    ) : (
                                        <>
                                            <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                                            <p className="text-sm font-medium">Click to upload image</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                or drag and drop
                                            </p>
                                        </>
                                    )}
                                </label>
                            </div>

                            {file && (
                                <Button
                                    onClick={handleScan}
                                    disabled={scanning}
                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                >
                                    {scanning ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Analyzing with AI...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Scan Document
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Extracted Data Review */}
                    {extracted && editedData && (
                        <div className="space-y-4">
                            <Alert className="bg-purple-50 border-purple-200">
                                <Sparkles className="h-4 w-4 text-purple-500" />
                                <AlertDescription className="flex items-center justify-between">
                                    <span>AI Extraction Complete</span>
                                    <Badge className={`${getConfidenceColor(extracted.confidence)} text-white`}>
                                        {extracted.confidence}% confident
                                    </Badge>
                                </AlertDescription>
                            </Alert>

                            <p className="text-sm text-muted-foreground">
                                Review and edit the extracted data before using it.
                            </p>

                            {/* Editable Fields */}
                            <div className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>PO Number</Label>
                                        <Input
                                            value={editedData.poNumber || ""}
                                            onChange={(e) => setEditedData({ ...editedData, poNumber: e.target.value })}
                                            placeholder="e.g., PO-2024-001"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Batch ID</Label>
                                        <Input
                                            value={editedData.batchId || ""}
                                            onChange={(e) => setEditedData({ ...editedData, batchId: e.target.value })}
                                            placeholder="e.g., BATCH-001"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Issue Type</Label>
                                        <Select
                                            value={editedData.issueType || ""}
                                            onValueChange={(v) => setEditedData({ ...editedData, issueType: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DAMAGED">Damaged</SelectItem>
                                                <SelectItem value="WRONG_SPEC">Wrong Specification</SelectItem>
                                                <SelectItem value="DOC_MISSING">Documentation Missing</SelectItem>
                                                <SelectItem value="QUANTITY_SHORT">Quantity Short</SelectItem>
                                                <SelectItem value="QUALITY_DEFECT">Quality Defect</SelectItem>
                                                <SelectItem value="OTHER">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Severity</Label>
                                        <Select
                                            value={editedData.severity || ""}
                                            onValueChange={(v) => setEditedData({ ...editedData, severity: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select severity" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MINOR">Minor</SelectItem>
                                                <SelectItem value="MAJOR">Major</SelectItem>
                                                <SelectItem value="CRITICAL">Critical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input
                                        value={editedData.title || ""}
                                        onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                                        placeholder="Brief description of the issue"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={editedData.description || ""}
                                        onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                                        placeholder="Detailed description..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={resetDialog}>
                        Cancel
                    </Button>
                    {extracted && (
                        <Button onClick={handleUseData} className="bg-purple-600 hover:bg-purple-700">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Use This Data
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
