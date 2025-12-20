"use server";

import { auth } from "@/auth";
import { boqItem } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import db from "@/db/drizzle";

// Types
interface ActionResult<T = void> {
    success: boolean;
    data?: T;
    error?: string;
}

interface ParsedBOQRow {
    itemNumber: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

interface ColumnMapping {
    itemNumber: string;
    description: string;
    unit: string;
    quantity: string;
    unitPrice: string;
    totalPrice?: string; // Optional - can be calculated
}

interface ImportBOQInput {
    purchaseOrderId: string;
    rows: ParsedBOQRow[];
}

// Helper to get authenticated user
async function getAuthenticatedUser() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        throw new Error("Unauthorized");
    }
    return session.user;
}

/**
 * Parse Excel file buffer and extract sheet names
 */
export async function parseExcelSheets(
    base64Data: string
): Promise<ActionResult<{ sheetNames: string[] }>> {
    try {
        await getAuthenticatedUser();

        const buffer = Buffer.from(base64Data, "base64");
        const workbook = XLSX.read(buffer, { type: "buffer" });

        return {
            success: true,
            data: { sheetNames: workbook.SheetNames },
        };
    } catch (error) {
        console.error("[parseExcelSheets] Error:", error);
        return { success: false, error: "Failed to parse Excel file" };
    }
}

/**
 * Parse Excel file and return column headers + preview rows
 */
export async function parseExcelPreview(
    base64Data: string,
    sheetName?: string
): Promise<
    ActionResult<{
        columns: string[];
        preview: Record<string, unknown>[];
        totalRows: number;
    }>
> {
    try {
        await getAuthenticatedUser();

        const buffer = Buffer.from(base64Data, "base64");
        const workbook = XLSX.read(buffer, { type: "buffer" });

        const targetSheet = sheetName || workbook.SheetNames[0];
        const sheet = workbook.Sheets[targetSheet];

        if (!sheet) {
            return { success: false, error: `Sheet "${targetSheet}" not found` };
        }

        // Convert to JSON with header row
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: "",
        });

        // Serialize to plain objects (removes any xlsx internal properties)
        const jsonData: Record<string, unknown>[] = JSON.parse(JSON.stringify(rawData));

        if (jsonData.length === 0) {
            return { success: false, error: "Sheet is empty" };
        }

        // Extract column names from first row
        const columns = Object.keys(jsonData[0]);

        // Return first 10 rows as preview
        const preview = jsonData.slice(0, 10);

        return {
            success: true,
            data: {
                columns,
                preview,
                totalRows: jsonData.length,
            },
        };
    } catch (error) {
        console.error("[parseExcelPreview] Error:", error);
        return { success: false, error: "Failed to parse Excel preview" };
    }
}

/**
 * Parse Excel file with column mapping and return structured BOQ rows
 */
export async function parseExcelWithMapping(
    base64Data: string,
    mapping: ColumnMapping,
    sheetName?: string
): Promise<ActionResult<{ rows: ParsedBOQRow[]; errors: string[] }>> {
    try {
        await getAuthenticatedUser();

        const buffer = Buffer.from(base64Data, "base64");
        const workbook = XLSX.read(buffer, { type: "buffer" });

        const targetSheet = sheetName || workbook.SheetNames[0];
        const sheet = workbook.Sheets[targetSheet];

        if (!sheet) {
            return { success: false, error: `Sheet "${targetSheet}" not found` };
        }

        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: "",
        });

        const rows: ParsedBOQRow[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
            try {
                const quantity = parseFloat(String(row[mapping.quantity] || 0));
                const unitPrice = parseFloat(String(row[mapping.unitPrice] || 0));

                // Calculate totalPrice if not mapped
                let totalPrice: number;
                if (mapping.totalPrice && row[mapping.totalPrice]) {
                    totalPrice = parseFloat(String(row[mapping.totalPrice]));
                } else {
                    totalPrice = quantity * unitPrice;
                }

                // Skip rows with empty description (likely header or empty row)
                const description = String(row[mapping.description] || "").trim();
                if (!description) {
                    return;
                }

                rows.push({
                    itemNumber: String(row[mapping.itemNumber] || `${index + 1}`),
                    description,
                    unit: String(row[mapping.unit] || "EA"),
                    quantity: isNaN(quantity) ? 0 : quantity,
                    unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
                    totalPrice: isNaN(totalPrice) ? 0 : totalPrice,
                });
            } catch (err) {
                errors.push(`Row ${index + 2}: ${err instanceof Error ? err.message : "Parse error"}`);
            }
        });

        return {
            success: true,
            data: { rows, errors },
        };
    } catch (error) {
        console.error("[parseExcelWithMapping] Error:", error);
        return { success: false, error: "Failed to parse Excel with mapping" };
    }
}

/**
 * Import BOQ items into database
 */
export async function importBOQItems(
    input: ImportBOQInput
): Promise<ActionResult<{ count: number }>> {
    try {
        await getAuthenticatedUser();

        const { purchaseOrderId, rows } = input;

        if (rows.length === 0) {
            return { success: false, error: "No items to import" };
        }

        // Delete existing BOQ items for this PO (replace strategy)
        await db.delete(boqItem).where(eq(boqItem.purchaseOrderId, purchaseOrderId));

        // Insert new items
        const values = rows.map((row) => ({
            purchaseOrderId,
            itemNumber: row.itemNumber,
            description: row.description,
            unit: row.unit,
            quantity: String(row.quantity),
            unitPrice: String(row.unitPrice),
            totalPrice: String(row.totalPrice),
        }));

        await db.insert(boqItem).values(values);

        revalidatePath(`/dashboard/procurement/${purchaseOrderId}`);

        return {
            success: true,
            data: { count: rows.length },
        };
    } catch (error) {
        console.error("[importBOQItems] Error:", error);
        return { success: false, error: "Failed to import BOQ items" };
    }
}

/**
 * Get BOQ items for a purchase order
 */
export async function getBOQItems(
    purchaseOrderId: string
): Promise<ActionResult<typeof boqItem.$inferSelect[]>> {
    try {
        await getAuthenticatedUser();

        const items = await db.query.boqItem.findMany({
            where: eq(boqItem.purchaseOrderId, purchaseOrderId),
        });

        return { success: true, data: items };
    } catch (error) {
        console.error("[getBOQItems] Error:", error);
        return { success: false, error: "Failed to fetch BOQ items" };
    }
}
