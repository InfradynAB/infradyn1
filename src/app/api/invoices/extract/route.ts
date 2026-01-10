/**
 * Invoice Extraction API
 * Extracts invoice data from uploaded documents using AI
 * 
 * POST /api/invoices/extract
 */

import { NextRequest, NextResponse } from "next/server";
import { extractInvoiceFromS3 } from "@/lib/services/ai-extraction";

export async function POST(request: NextRequest) {
    try {
        const { fileUrl } = await request.json();

        if (!fileUrl) {
            return NextResponse.json(
                { error: "fileUrl is required" },
                { status: 400 }
            );
        }

        console.log("[INVOICE-EXTRACT] Starting extraction for:", fileUrl);

        const result = await extractInvoiceFromS3(fileUrl);

        if (!result.success) {
            console.error("[INVOICE-EXTRACT] Extraction failed:", result.error);
            return NextResponse.json(
                { error: result.error || "Extraction failed" },
                { status: 500 }
            );
        }

        console.log("[INVOICE-EXTRACT] Extraction successful:", {
            invoiceNumber: result.data?.invoiceNumber,
            amount: result.data?.totalAmount,
            confidence: result.data?.confidence,
        });

        return NextResponse.json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        console.error("[INVOICE-EXTRACT] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
