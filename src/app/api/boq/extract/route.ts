import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { importFromExcel, generateBOQTemplate } from "@/lib/services/excel-importer";
import { getDownloadPresignedUrl } from "@/lib/services/s3";
import * as XLSX from "xlsx";

const requestSchema = z.object({
    fileUrl: z.string().url(),
});

/**
 * Extract S3 key from a full S3 URL
 */
function extractS3Key(url: string): string | null {
    // Match: https://bucket.s3.region.amazonaws.com/key or https://s3.region.amazonaws.com/bucket/key
    const match = url.match(/s3[.-].*?\.amazonaws\.com\/(.+)$/);
    if (match) return match[1];

    // Also handle direct bucket URLs
    const bucketMatch = url.match(/infradyn-storage\.s3\..*?\.amazonaws\.com\/(.+)$/);
    return bucketMatch ? bucketMatch[1] : null;
}

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

        console.log("[BOQ Extract] Processing file:", fileUrl);

        // If it's an S3 URL, generate a signed URL for access
        let fetchUrl = fileUrl;
        const s3Key = extractS3Key(fileUrl);
        if (s3Key) {
            console.log("[BOQ Extract] S3 key detected:", s3Key);
            try {
                fetchUrl = await getDownloadPresignedUrl(s3Key);
                console.log("[BOQ Extract] Using signed URL for S3 access");
            } catch (e) {
                console.error("[BOQ Extract] Failed to generate signed URL:", e);
            }
        }

        // Fetch the file
        const response = await fetch(fetchUrl);
        if (!response.ok) {
            console.error("[BOQ Extract] Failed to fetch file:", response.status, response.statusText);
            return NextResponse.json({
                success: false,
                error: `Failed to fetch file: ${response.status}`,
                items: [],
            }, { status: 200 }); // Return 200 with success: false to not block extraction
        }

        const contentType = response.headers.get("content-type") || "";
        const buffer = await response.arrayBuffer();

        console.log("[BOQ Extract] File type:", contentType, "URL ends with xlsx:", fileUrl.endsWith(".xlsx"));

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

        // For PDF or Word files, use AI extraction via PO extract endpoint
        if (
            contentType.includes("pdf") ||
            fileUrl.endsWith(".pdf") ||
            contentType.includes("msword") ||
            contentType.includes("wordprocessingml") ||
            fileUrl.endsWith(".doc") ||
            fileUrl.endsWith(".docx")
        ) {
            console.log("[BOQ Extract] Processing PDF/Word for BOQ extraction");

            // Get incoming headers to forward auth cookies
            const reqHeaders = await headers();
            const cookie = reqHeaders.get("cookie") || "";

            // Call the existing PO extraction which includes BOQ
            const extractResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/po/extract`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Cookie": cookie, // Forward auth cookies
                },
                body: JSON.stringify({ fileUrl }),
            });

            const extractResult = await extractResponse.json();
            console.log("[BOQ Extract] PO extraction result:", extractResult.success, "BOQ items:", extractResult.data?.boqItems?.length || 0);

            if (extractResult.success && extractResult.data?.boqItems && extractResult.data.boqItems.length > 0) {
                return NextResponse.json({
                    success: true,
                    items: extractResult.data.boqItems,
                    source: "ai-pdf",
                    rowCount: extractResult.data.boqItems.length,
                });
            }

            // Return empty but success to not block other extractions
            return NextResponse.json({
                success: false,
                error: "No BOQ items found in PDF",
                items: [],
            });
        }

        return NextResponse.json({
            success: false,
            error: "Unsupported file type. Please upload Excel (.xlsx) or PDF",
            items: [],
        });

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
