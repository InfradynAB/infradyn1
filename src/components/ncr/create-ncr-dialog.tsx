"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AIScanDialog } from "./ai-scan-dialog";

interface CreateNCRDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
    projectId: string;
    purchaseOrderId: string;
    supplierId: string;
    onSuccess?: () => void;
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

const ISSUE_TYPES = [
    { value: "DAMAGED", label: "Damaged" },
    { value: "WRONG_SPEC", label: "Wrong Specification" },
    { value: "DOC_MISSING", label: "Documentation Missing" },
    { value: "QUANTITY_SHORT", label: "Quantity Short" },
    { value: "QUALITY_DEFECT", label: "Quality Defect" },
    { value: "OTHER", label: "Other" },
];

const SEVERITY_LEVELS = [
    { value: "MINOR", label: "Minor", description: "Low impact, 7-day SLA", color: "text-yellow-500" },
    { value: "MAJOR", label: "Major", description: "Medium impact, 72-hour SLA", color: "text-orange-500" },
    { value: "CRITICAL", label: "Critical", description: "High impact, 24-hour SLA", color: "text-red-500" },
];

export function CreateNCRDialog({
    open,
    onOpenChange,
    organizationId,
    projectId,
    purchaseOrderId,
    supplierId,
    onSuccess,
}: CreateNCRDialogProps) {
    const [loading, setLoading] = useState(false);
    const [showAIScan, setShowAIScan] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        severity: "",
        issueType: "",
        batchId: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.severity || !formData.issueType) {
            toast.error("Please fill in all required fields");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/ncr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationId,
                    projectId,
                    purchaseOrderId,
                    supplierId,
                    title: formData.title,
                    description: formData.description,
                    severity: formData.severity,
                    issueType: formData.issueType,
                    batchId: formData.batchId || undefined,
                }),
            });

            const result = await res.json();

            if (result.success) {
                toast.success(`NCR ${result.data.ncrNumber} created successfully`);
                setFormData({
                    title: "",
                    description: "",
                    severity: "",
                    issueType: "",
                    batchId: "",
                });
                onOpenChange(false);
                onSuccess?.();
            } else {
                toast.error(result.error || "Failed to create NCR");
            }
        } catch (error) {
            toast.error("An error occurred while creating NCR");
        } finally {
            setLoading(false);
        }
    };

    const handleAIExtracted = (data: ExtractedData) => {
        setFormData({
            title: data.title || formData.title,
            description: data.description || formData.description,
            severity: data.severity || formData.severity,
            issueType: data.issueType || formData.issueType,
            batchId: data.batchId || formData.batchId,
        });
        toast.success("AI extracted data applied to form");
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                Create Non-Conformance Report
                            </DialogTitle>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAIScan(true)}
                                className="gap-1.5"
                            >
                                <Sparkles className="h-4 w-4 text-purple-500" />
                                AI Scan
                            </Button>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                placeholder="Brief description of the issue"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        {/* Issue Type & Severity */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Issue Type *</Label>
                                <Select
                                    value={formData.issueType}
                                    onValueChange={(value) => setFormData({ ...formData, issueType: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ISSUE_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Severity *</Label>
                                <Select
                                    value={formData.severity}
                                    onValueChange={(value) => setFormData({ ...formData, severity: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select severity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SEVERITY_LEVELS.map((level) => (
                                            <SelectItem key={level.value} value={level.value}>
                                                <div className="flex items-center gap-2">
                                                    <span className={level.color}>●</span>
                                                    <span>{level.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Severity hint */}
                        {formData.severity && (
                            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                                {SEVERITY_LEVELS.find(s => s.value === formData.severity)?.description}
                            </div>
                        )}

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Detailed description of the non-conformance..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                            />
                        </div>

                        {/* Batch ID */}
                        <div className="space-y-2">
                            <Label htmlFor="batchId">Batch/Lot ID (optional)</Label>
                            <Input
                                id="batchId"
                                placeholder="e.g., BATCH-2024-001"
                                value={formData.batchId}
                                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create NCR
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* AI Scan Dialog */}
            <AIScanDialog
                open={showAIScan}
                onOpenChange={setShowAIScan}
                onDataExtracted={handleAIExtracted}
            />
        </>
    );
}
