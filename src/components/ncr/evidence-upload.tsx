"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, Image as ImageIcon, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface UploadedFile {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
}

interface EvidenceUploadProps {
    ncrId: string;
    onUploadComplete: (files: UploadedFile[]) => void;
    maxFiles?: number;
    accept?: Record<string, string[]>;
}

export function EvidenceUpload({
    ncrId,
    onUploadComplete,
    maxFiles = 5,
    accept = {
        "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
        "application/pdf": [".pdf"],
    },
}: EvidenceUploadProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
        setFiles(newFiles);
    }, [files, maxFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxFiles: maxFiles - files.length,
        disabled: uploading,
    });

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setUploadProgress(0);

        const uploaded: UploadedFile[] = [];
        const totalFiles = files.length;

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Get presigned URL
                const presignRes = await fetch(`/api/ncr/${ncrId}/upload`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                    }),
                });

                const { uploadUrl, fileUrl, key, attachmentId } = await presignRes.json();

                if (!uploadUrl) {
                    throw new Error(`Failed to get upload URL for ${file.name}`);
                }

                // Upload to S3
                await fetch(uploadUrl, {
                    method: "PUT",
                    body: file,
                    headers: {
                        "Content-Type": file.type,
                    },
                });

                uploaded.push({
                    id: attachmentId || key, // Use attachment UUID, fallback to key
                    name: file.name,
                    url: fileUrl,
                    type: file.type,
                    size: file.size,
                });

                setUploadProgress(((i + 1) / totalFiles) * 100);
            }

            setUploadedFiles([...uploadedFiles, ...uploaded]);
            onUploadComplete([...uploadedFiles, ...uploaded]);
            setFiles([]);
            toast.success(`${uploaded.length} file(s) uploaded successfully`);
        } catch (error) {
            toast.error("Failed to upload files");
            console.error("Upload error:", error);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith("image/")) {
            return <ImageIcon className="h-5 w-5 text-blue-500" />;
        }
        return <FileText className="h-5 w-5 text-orange-500" />;
    };

    return (
        <div className="space-y-3">
            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50"
                    } ${uploading ? "pointer-events-none opacity-50" : ""}`}
            >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                {isDragActive ? (
                    <p className="text-sm text-primary">Drop files here...</p>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground">
                            Drag & drop photos or PDFs, or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Max {maxFiles} files
                        </p>
                    </>
                )}
            </div>

            {/* Pending Files */}
            {files.length > 0 && (
                <Card className="p-3">
                    <p className="text-sm font-medium mb-2">Ready to upload ({files.length})</p>
                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                {getFileIcon(file.type)}
                                <span className="flex-1 truncate">{file.name}</span>
                                <span className="text-muted-foreground">
                                    {formatFileSize(file.size)}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(index)}
                                    disabled={uploading}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {uploading && (
                        <Progress value={uploadProgress} className="mt-3" />
                    )}

                    <Button
                        onClick={uploadFiles}
                        disabled={uploading}
                        className="w-full mt-3"
                        size="sm"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload {files.length} file(s)
                            </>
                        )}
                    </Button>
                </Card>
            )}

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Uploaded ({uploadedFiles.length})
                    </p>
                    {uploadedFiles.map((file) => (
                        <div key={file.id} className="flex items-center gap-2 text-sm bg-green-50 p-2 rounded">
                            {getFileIcon(file.type)}
                            <span className="flex-1 truncate">{file.name}</span>
                            <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline text-xs"
                            >
                                View
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
