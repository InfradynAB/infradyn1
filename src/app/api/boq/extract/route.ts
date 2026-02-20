import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { importFromExcel, generateBOQTemplate } from "@/lib/services/excel-importer";
import { getDownloadPresignedUrl } from "@/lib/services/s3";
import { categorizeBOQItemsWithOptions } from "@/lib/services/boq-categorization";
import type { BOQLikeItem } from "@/lib/services/boq-categorization";
import { extractTextWithTextract } from "@/lib/services/ai-extraction";
import { parseBOQWithGPT } from "@/lib/services/boq-extraction";
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
                const rawItems: unknown[] = Array.isArray(result.data) ? (result.data as unknown[]) : [];
                const itemsForCategorization: BOQLikeItem[] = [];
                for (const it of rawItems) {
                    if (typeof it !== "object" || it === null) continue;
                    const obj = it as Record<string, unknown>;
                    itemsForCategorization.push({
                        itemNumber: typeof obj.itemNumber === "string" ? obj.itemNumber : undefined,
                        description: typeof obj.description === "string" ? obj.description : "",
                        unit: typeof obj.unit === "string" ? obj.unit : undefined,
                        quantity: typeof obj.quantity === "number" ? obj.quantity : undefined,
                        unitPrice: typeof obj.unitPrice === "number" ? obj.unitPrice : undefined,
                        totalPrice: typeof obj.totalPrice === "number" ? obj.totalPrice : undefined,
                        discipline:
                            typeof obj.discipline === "string" || obj.discipline === null
                                ? (obj.discipline as string | null)
                                : undefined,
                        materialClass:
                            typeof obj.materialClass === "string" || obj.materialClass === null
                                ? (obj.materialClass as string | null)
                                : undefined,
                    });
                }

                let categorized: unknown[] = rawItems;
                try {
                    categorized = await categorizeBOQItemsWithOptions(itemsForCategorization, { requireAll: true });
                } catch (e) {
                    console.warn("[BOQ Extract] Categorization failed; returning uncategorized items", e);
                }
                return NextResponse.json({
                    success: true,
                    items: categorized,
                    source: "excel",
                    rowCount: categorized.length,
                    confidence: result.structure.confidence,
                });
            }

            // If not detected as BOQ or failed, try to parse anyway
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

            // Manual parsing for common BOQ columns
            const num = (v: unknown, fallback: number) => {
                const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
                return Number.isFinite(n) ? n : fallback;
            };
            const str = (v: unknown, fallback: string) => {
                const s = typeof v === "string" ? v : String(v ?? "");
                const t = s.trim();
                return t ? t : fallback;
            };

            const items = rows
                .map((row, index) => {
                    const quantity = num(row["Quantity"] ?? row["Qty"] ?? row["QTY"], 1);
                    const unitPrice = num(row["Unit Price"] ?? row["Price"] ?? row["Rate"], 0);
                    const totalPrice = num(
                        row["Total"] ?? row["Amount"] ?? row["Total Price"],
                        quantity * unitPrice,
                    );

                    return {
                        itemNumber: str(row["Item"] ?? row["Item #"] ?? row["No."] ?? row["No"], String(index + 1)),
                        description: str(row["Description"] ?? row["Item Description"] ?? row["Material"], ""),
                        quantity,
                        unit: str(row["Unit"] ?? row["UOM"], "pcs"),
                        unitPrice,
                        totalPrice,
                    };
                })
                .filter((item) => item.description);

            let categorized = items;
            try {
                categorized = await categorizeBOQItemsWithOptions(items, { requireAll: true });
            } catch (e) {
                console.warn("[BOQ Extract] Categorization failed; returning uncategorized items", e);
            }

            return NextResponse.json({
                success: true,
                items: categorized,
                source: "excel-manual",
                rowCount: categorized.length,
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

            const s3KeyForTextract = extractS3Key(fileUrl);
            if (!s3KeyForTextract) {
                return NextResponse.json({
                    success: false,
                    error: "Could not determine S3 key for BOQ document",
                    items: [],
                }, { status: 200 });
            }

            const bucket = process.env.AWS_S3_BUCKET || "infradyn-storage";
            const textract = await extractTextWithTextract(bucket, s3KeyForTextract);

            if (!textract.success || !textract.text) {
                return NextResponse.json({
                    success: false,
                    error: textract.error || "Textract extraction failed",
                    items: [],
                }, { status: 200 });
            }

            const parsed = await parseBOQWithGPT(textract.text);
            if (!parsed.success) {
                return NextResponse.json({
                    success: false,
                    error: parsed.error || "Failed to parse BOQ items",
                    items: [],
                }, { status: 200 });
            }

            // Final pass: coerce to canonical taxonomy keys/classes and ensure fully categorized.
            let categorized = parsed.items;
            try {
                categorized = await categorizeBOQItemsWithOptions(categorized, { requireAll: true });
            } catch (e) {
                console.warn("[BOQ Extract] Categorization failed; returning GPT-extracted items", e);
            }

            return NextResponse.json({
                success: true,
                items: categorized,
                source: "boq-ai-pdf",
                rowCount: categorized.length,
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
