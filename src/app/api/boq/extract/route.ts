import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { importFromExcel, generateBOQTemplate } from "@/lib/services/excel-importer";
import * as XLSX from "xlsx";

const requestSchema = z.object({
    fileUrl: z.string().url(),
});

/**
 * POST /api/boq/extract
 * Extract BOQ items from Excel/PDF file
 */
export async function POST(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { fileUrl } = requestSchema.parse(body);

        // Fetch the file
        const response = await fetch(fileUrl);
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch file" }, { status: 400 });
        }

        const contentType = response.headers.get("content-type") || "";
        const buffer = await response.arrayBuffer();

        // Check if it's an Excel file
        if (
            contentType.includes("spreadsheet") ||
            contentType.includes("excel") ||
            fileUrl.endsWith(".xlsx") ||
            fileUrl.endsWith(".xls")
        ) {
            // Use Excel importer
            const result = await importFromExcel(Buffer.from(buffer));

            if (result.success && result.structure.type === "BOQ") {
                return NextResponse.json({
                    success: true,
                    items: result.data,
                    source: "excel",
                    rowCount: (result.data as any[]).length,
                    confidence: result.structure.confidence,
                });
            }

            // If not detected as BOQ or failed, try to parse anyway
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet);

            // Manual parsing for common BOQ columns
            const items = rows.map((row: any, index: number) => ({
                itemNumber: row["Item"] || row["Item #"] || row["No."] || row["No"] || String(index + 1),
                description: row["Description"] || row["Item Description"] || row["Material"] || "",
                quantity: parseFloat(row["Quantity"] || row["Qty"] || row["QTY"] || 1),
                unit: row["Unit"] || row["UOM"] || "pcs",
                unitPrice: parseFloat(row["Unit Price"] || row["Price"] || row["Rate"] || 0),
                totalPrice: parseFloat(row["Total"] || row["Amount"] || row["Total Price"] || 0) ||
                    (parseFloat(row["Quantity"] || 1) * parseFloat(row["Unit Price"] || 0)),
            })).filter((item: any) => item.description);

            return NextResponse.json({
                success: true,
                items,
                source: "excel-manual",
                rowCount: items.length,
            });
        }

        // For PDF files, use AI extraction
        if (contentType.includes("pdf") || fileUrl.endsWith(".pdf")) {
            // Call the existing PO extraction which includes BOQ
            const extractResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/po/extract`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileUrl }),
            });

            const extractResult = await extractResponse.json();

            if (extractResult.success && extractResult.data?.boqItems) {
                return NextResponse.json({
                    success: true,
                    items: extractResult.data.boqItems,
                    source: "ai-pdf",
                    rowCount: extractResult.data.boqItems.length,
                });
            }

            return NextResponse.json({
                success: false,
                error: "Could not extract BOQ items from PDF",
                items: [],
            });
        }

        return NextResponse.json({
            error: "Unsupported file type. Please upload Excel (.xlsx) or PDF",
        }, { status: 400 });

    } catch (error) {
        console.error("[BOQ Extract Error]:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Extraction failed",
        }, { status: 500 });
    }
}

/**
 * GET /api/boq/extract
 * Returns a BOQ template Excel file
 */
export async function GET() {
    const workbook = generateBOQTemplate();
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="boq_template.xlsx"',
        },
    });
}
