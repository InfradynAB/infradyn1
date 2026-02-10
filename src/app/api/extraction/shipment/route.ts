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

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

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

        const response = await fetch(
            `${PYTHON_SERVICE_URL}/api/extraction/upload?document_type=shipment`,
            {
                method: "POST",
                body: pythonFormData,
            }
        );

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
