"use client";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    FileText,
    CloudArrowUp,
    CircleNotch,
    CheckCircle,
    Envelope,
    Buildings,
    HardHat,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ClientInstructionUploadProps {
    projectId: string;
    onSuccess?: (instruction: any) => void;
    trigger?: React.ReactNode;
}

const INSTRUCTION_TYPES = [
    { value: "SITE_INSTRUCTION", label: "Site Instruction", icon: HardHat },
    { value: "ARCHITECT_INSTRUCTION", label: "Architect's Instruction", icon: Buildings },
    { value: "EMAIL_VARIATION", label: "Email Variation", icon: Envelope },
];

export function ClientInstructionUpload({
    projectId,
    onSuccess,
    trigger,
}: ClientInstructionUploadProps) {
    const [open, setOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    // Form fields
    const [instructionNumber, setInstructionNumber] = useState("");
    const [type, setType] = useState<string>("");
    const [dateReceived, setDateReceived] = useState(format(new Date(), "yyyy-MM-dd"));
    const [description, setDescription] = useState("");

    // File dropzone
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setFileName(file.name);
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("projectId", projectId);
            formData.append("documentType", "CLIENT_INSTRUCTION");

            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const response = await fetch("/api/documents/upload", {
                method: "POST",
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            const { document } = await response.json();
            setUploadedUrl(document.fileUrl);
            toast.success("File uploaded successfully");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload file");
            setUploadedUrl(null);
            setFileName(null);
        } finally {
            setIsUploading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"],
        },
        maxFiles: 1,
        disabled: isUploading,
    });

    const handleSubmit = async () => {
        if (!uploadedUrl) {
            toast.error("Please upload the client instruction document");
            return;
        }

        if (!instructionNumber || !type) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/client-instructions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    instructionNumber,
                    type,
                    dateReceived: new Date(dateReceived),
                    description,
                    attachmentUrl: uploadedUrl,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Client Instruction Created", {
                    description: `${instructionNumber} has been registered`,
                });
                resetForm();
                setOpen(false);
                onSuccess?.(result.data);
            } else {
                toast.error("Failed to create instruction", {
                    description: result.error,
                });
            }
        } catch (error) {
            toast.error("Error creating client instruction");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setInstructionNumber("");
        setType("");
        setDateReceived(format(new Date(), "yyyy-MM-dd"));
        setDescription("");
        setUploadedUrl(null);
        setFileName(null);
        setUploadProgress(0);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        Register Client Instruction
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Register Client Instruction</DialogTitle>
                    <DialogDescription>
                        Upload a client instruction letter/email to initiate a variation order.
                        A document attachment is required for legal traceability.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* File Upload */}
                    <div className="space-y-2">
                        <Label>Instruction Document *</Label>
                        {!uploadedUrl ? (
                            <div
                                {...getRootProps()}
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                                    isUploading && "pointer-events-none opacity-50"
                                )}
                            >
                                <input {...getInputProps()} />
                                {isUploading ? (
                                    <div className="space-y-2">
                                        <CloudArrowUp size={32} className="mx-auto text-primary animate-bounce" />
                                        <p className="text-sm">Uploading {fileName}...</p>
                                        <Progress value={uploadProgress} className="w-2/3 mx-auto" />
                                    </div>
                                ) : (
                                    <>
                                        <FileText size={32} className="mx-auto text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                            Drag & drop the instruction document, or click to select
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Supports: PDF, PNG, JPG
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle size={24} className="text-green-600" weight="fill" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-green-700">{fileName}</p>
                                    <p className="text-xs text-green-600">Uploaded successfully</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setUploadedUrl(null);
                                        setFileName(null);
                                    }}
                                >
                                    Change
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Instruction Number */}
                    <div className="space-y-2">
                        <Label htmlFor="instructionNumber">Instruction Number *</Label>
                        <Input
                            id="instructionNumber"
                            value={instructionNumber}
                            onChange={(e) => setInstructionNumber(e.target.value)}
                            placeholder="e.g., CVI-001, AI-045"
                        />
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                        <Label>Instruction Type *</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select instruction type" />
                            </SelectTrigger>
                            <SelectContent>
                                {INSTRUCTION_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        <div className="flex items-center gap-2">
                                            <t.icon size={16} />
                                            {t.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Received */}
                    <div className="space-y-2">
                        <Label htmlFor="dateReceived">Date Received *</Label>
                        <Input
                            id="dateReceived"
                            type="date"
                            value={dateReceived}
                            onChange={(e) => setDateReceived(e.target.value)}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief summary of the instruction..."
                            rows={2}
                        />
                    </div>

                    {/* Actions */}
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
                            disabled={isSubmitting || !uploadedUrl || !instructionNumber || !type}
                        >
                            {isSubmitting && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                            Register Instruction
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
