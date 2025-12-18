"use client";

import { useState, useCallback } from "react";

interface UseS3UploadOptions {
    orgId: string;
    projectId: string;
    docType: "po" | "boq" | "invoice" | "packing-list";
}

interface UploadState {
    status: "idle" | "getting-url" | "uploading" | "done" | "error";
    progress: number;
    fileUrl: string | null;
    error: string | null;
}

export function useS3Upload({ orgId, projectId, docType }: UseS3UploadOptions) {
    const [state, setState] = useState<UploadState>({
        status: "idle",
        progress: 0,
        fileUrl: null,
        error: null,
    });

    const upload = useCallback(
        async (file: File): Promise<string | null> => {
            setState({
                status: "getting-url",
                progress: 0,
                fileUrl: null,
                error: null,
            });

            try {
                // Step 1: Get presigned URL from our API
                const presignResponse = await fetch("/api/upload/presign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fileName: file.name,
                        contentType: file.type || "application/pdf",
                        docType,
                        orgId,
                        projectId,
                    }),
                });

                if (!presignResponse.ok) {
                    const error = await presignResponse.json();
                    throw new Error(error.error || "Failed to get upload URL");
                }

                const { uploadUrl, fileUrl } = await presignResponse.json();

                // Step 2: Upload directly to S3
                setState((prev) => ({ ...prev, status: "uploading", progress: 10 }));

                const uploadResponse = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: {
                        "Content-Type": file.type || "application/pdf",
                    },
                    body: file,
                });

                if (!uploadResponse.ok) {
                    throw new Error("Failed to upload file to S3");
                }

                setState({
                    status: "done",
                    progress: 100,
                    fileUrl,
                    error: null,
                });

                return fileUrl;
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Upload failed";
                setState({
                    status: "error",
                    progress: 0,
                    fileUrl: null,
                    error: errorMessage,
                });
                return null;
            }
        },
        [orgId, projectId, docType]
    );

    const reset = useCallback(() => {
        setState({
            status: "idle",
            progress: 0,
            fileUrl: null,
            error: null,
        });
    }, []);

    return {
        upload,
        reset,
        ...state,
    };
}
