/**
 * Shipment Document Extraction API Route
 *
 * Proxy endpoint that accepts file uploads from the frontend,
 * forwards them to the Python extraction service, and returns
 * structured shipment/packing list data.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";

function resolvePythonServiceUrl(): string {
    const configuredUrl = process.env.PYTHON_SERVICE_URL?.trim();

    if (!configuredUrl) {
        return "http://localhost:8000";
    }

    if (/^https?:\/\//i.test(configuredUrl)) {
        return configuredUrl.replace(/\/+$/, "");
    }

    const normalizedWithScheme = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/i.test(configuredUrl)
        ? `http://${configuredUrl}`
        : `https://${configuredUrl}`;

    return normalizedWithScheme.replace(/\/+$/, "");
}

const PYTHON_SERVICE_URL = resolvePythonServiceUrl();

function resolveExtractionTimeoutMs(): number {
    const raw = process.env.PYTHON_EXTRACTION_TIMEOUT_MS?.trim();
    if (!raw) return 120000; // 2 minutes
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return 120000;
    return parsed;
}

const EXTRACTION_TIMEOUT_MS = resolveExtractionTimeoutMs();

function isConnectionRefusedError(error: unknown) {
    if (!error || typeof error !== "object") return false;
    const maybeAny = error as { cause?: unknown; code?: unknown };
    if (maybeAny.code === "ECONNREFUSED") return true;
    const cause = maybeAny.cause as { code?: unknown } | undefined;
    return cause?.code === "ECONNREFUSED";
}

function isTimeoutError(error: unknown) {
    if (!error || typeof error !== "object") return false;
    const anyErr = error as { name?: unknown; code?: unknown };
    // Node/undici uses TimeoutError, and the thrown object here can also carry a DOMException-like code.
    return anyErr.name === "TimeoutError" || anyErr.code === 23;
}

export async function POST(request: NextRequest) {
    try {
        // Auth check
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Read the uploaded file from the request
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        const allowedExtensions = [".pdf", ".xlsx", ".xls", ".docx"];
        const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            return NextResponse.json(
                { success: false, error: "Unsupported file type. Please upload PDF, Excel, or Word documents." },
                { status: 400 }
            );
        }

        // Max file size: 50MB
        const MAX_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { success: false, error: "File too large. Maximum size is 50MB." },
                { status: 400 }
            );
        }

        console.log(
            `[Shipment Extract] User ${session.user.id} uploading: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`
        );

        // Forward to Python service
        const pythonFormData = new FormData();
        pythonFormData.append("file", file);

        let response: Response;
        try {
            response = await fetch(
                `${PYTHON_SERVICE_URL}/api/extraction/upload?document_type=shipment`,
                {
                    method: "POST",
                    body: pythonFormData,
                    signal: AbortSignal.timeout(EXTRACTION_TIMEOUT_MS),
                }
            );
        } catch (fetchError) {
            if (isConnectionRefusedError(fetchError)) {
                console.error("[Shipment Extract] Python service unreachable (ECONNREFUSED)", {
                    pythonServiceUrl: PYTHON_SERVICE_URL,
                });
                return NextResponse.json(
                    {
                        success: false,
                        error: "Extraction service is unavailable right now. If you're running locally, start the Python service on port 8000 and try again.",
                    },
                    { status: 503 }
                );
            }

            if (isTimeoutError(fetchError)) {
                console.error("[Shipment Extract] Python service request timed out", {
                    pythonServiceUrl: PYTHON_SERVICE_URL,
                    timeoutMs: EXTRACTION_TIMEOUT_MS,
                });
                return NextResponse.json(
                    {
                        success: false,
                        error: `Extraction timed out after ${Math.round(EXTRACTION_TIMEOUT_MS / 1000)}s. Try a smaller file, or increase PYTHON_EXTRACTION_TIMEOUT_MS.`,
                    },
                    { status: 504 }
                );
            }

            console.error("[Shipment Extract] Python service fetch failed:", fetchError);
            return NextResponse.json(
                { success: false, error: "Failed to reach extraction service. Please try again." },
                { status: 503 }
            );
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Shipment Extract] Python service error:", errorText);
            return NextResponse.json(
                { success: false, error: "Extraction service error. Please try again." },
                { status: 502 }
            );
        }

        const result = await response.json();

        console.log("[Shipment Extract] Result:", {
            success: result.success,
            itemCount: result.data?.items?.length ?? 0,
            confidence: result.data?.confidence,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("[Shipment Extract] Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 }
        );
    }
}
