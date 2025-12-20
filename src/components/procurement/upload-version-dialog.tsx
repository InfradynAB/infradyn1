"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addPOVersion } from "@/lib/actions/procurement";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadSimpleIcon, SpinnerGap, FilePdfIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";

interface UploadVersionDialogProps {
    purchaseOrderId: string;
    organizationId: string;
    projectId: string;
    nextVersionNumber: number;
}

export function UploadVersionDialog({
    purchaseOrderId,
    organizationId,
    projectId,
    nextVersionNumber,
}: UploadVersionDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<
        "idle" | "uploading" | "done" | "error"
    >("idle");
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [changeDescription, setChangeDescription] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;

        setIsSubmitting(true);
        setError(null);
        setUploadProgress("uploading");

        const toastId = toast.loading("Uploading new version...");

        try {
            // 1. Get Presigned URL
            const contentType = selectedFile.type || "application/pdf";
            const presignResponse = await fetch("/api/upload/presign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: selectedFile.name,
                    contentType,
                    docType: "po",
                    orgId: organizationId,
                    projectId: projectId,
                }),
            });

            if (!presignResponse.ok) {
                throw new Error("Failed to get upload URL");
            }

            const { uploadUrl, fileUrl } = await presignResponse.json();

            // 2. Upload to S3
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": contentType },
                body: selectedFile,
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload file to storage");
            }

            // 3. Register Version in DB
            const result = await addPOVersion({
                purchaseOrderId,
                fileUrl,
                changeDescription: changeDescription.trim() || undefined,
            });

            if (result.success) {
                toast.success("New version uploaded successfully", { id: toastId });
                setOpen(false);
                setSelectedFile(null);
                setChangeDescription("");
                setUploadProgress("idle");
                router.refresh();
            } else {
                const msg = result.error || "Failed to save version";
                setError(msg);
                toast.error(msg, { id: toastId });
                setUploadProgress("error");
            }
        } catch (err) {
            console.error(err);
            const msg = err instanceof Error ? err.message : "An unexpected error occurred";
            setError(msg);
            toast.error(msg, { id: toastId });
            setUploadProgress("error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UploadSimpleIcon className="mr-2 h-4 w-4" />
                    Upload New Version
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Upload Version {nextVersionNumber}</DialogTitle>
                        <DialogDescription>
                            Upload a new version of this Purchase Order document.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="file">Document (PDF) *</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    id="file"
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={handleFileChange}
                                    disabled={isSubmitting}
                                    className="cursor-pointer"
                                />
                            </div>
                        </div>

                        {selectedFile && (
                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm text-muted-foreground">
                                <FilePdfIcon className="h-4 w-4 text-red-500" />
                                <span className="truncate">{selectedFile.name}</span>
                                <span className="ml-auto text-xs">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="description">Change Description</Label>
                            <Textarea
                                id="description"
                                placeholder="E.g. Updated prices, Added signature..."
                                value={changeDescription}
                                onChange={(e) => setChangeDescription(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        {error && (
                            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!selectedFile || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                "Upload Version"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
