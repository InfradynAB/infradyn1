/**
 * Excel Importer Service
 * Handles Excel/CSV import with auto-detection of column structure
 */

import * as XLSX from "xlsx";
import type { ExtractedBOQItem, ExtractedMilestone } from "./ai-extraction";

// Common column name variations for auto-detection
const COLUMN_MAPPINGS: Record<string, string[]> = {
    itemNumber: ["item", "item no", "item number", "no", "#", "line", "line no", "pos", "sn"],
    description: ["description", "desc", "item description", "name", "material", "product", "particulars"],
    unit: ["unit", "uom", "unit of measure", "measure", "units"],
    quantity: ["quantity", "qty", "amount", "count", "no.", "qnt"],
    unitPrice: ["unit price", "price", "rate", "unit rate", "cost", "unit cost", "rate / ea"],
    totalPrice: ["total", "total price", "amount", "line total", "ext price", "extended price", "extended amount", "subtotal", "value"],
    // Milestone columns
    title: ["milestone", "title", "name", "phase", "stage"],
    paymentPercentage: ["payment", "percent", "percentage", "%", "payment %"],
    expectedDate: ["date", "due date", "expected date", "target date", "deadline"],
};

export interface DetectedStructure {
    type: "BOQ" | "MILESTONES" | "UNKNOWN";
    headers: string[];
    columnMap: Record<string, number>; // field name -> column index
    dataStartRow: number;
    confidence: number;
}

export interface ImportResult {
    success: boolean;
    data: ExtractedBOQItem[] | ExtractedMilestone[];
    structure: DetectedStructure;
    warnings: string[];
    error?: string;
}

/**
 * Read workbook from buffer
 */
function readWorkbook(buffer: Buffer): XLSX.WorkBook {
    return XLSX.read(buffer, { type: "buffer", cellDates: true });
}

/**
 * Normalize a header string for comparison
 */
function normalizeHeader(header: string): string {
    return header.toLowerCase().trim().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ");
}

/**
 * Find the best column match for a field
 */
function findColumnMatch(headers: string[], fieldVariations: string[]): number {
    for (let i = 0; i < headers.length; i++) {
        const normalized = normalizeHeader(headers[i]);
        for (const variation of fieldVariations) {
            if (normalized === variation || normalized.includes(variation)) {
                return i;
            }
        }
    }
    return -1;
}

/**
 * Detect the structure of an Excel sheet
 */
export function detectStructure(sheetData: any[][]): DetectedStructure {
    // Find header row (usually first non-empty row with mostly text)
    let headerRow = 0;
    for (let i = 0; i < Math.min(10, sheetData.length); i++) {
        const row = sheetData[i];
        if (!row) continue;

        const textCells = row.filter(cell =>
            cell && typeof cell === "string" && cell.trim().length > 0
        );

        if (textCells.length >= 3) {
            headerRow = i;
            break;
        }
    }

    const headers = (sheetData[headerRow] || []).map(h => String(h || ""));
    const columnMap: Record<string, number> = {};

    // Try to match columns
    for (const [field, variations] of Object.entries(COLUMN_MAPPINGS)) {
        const idx = findColumnMatch(headers, variations);
        if (idx >= 0) {
            columnMap[field] = idx;
        }
    }

    // Determine type based on matched columns
    const boqFields = ["itemNumber", "description", "quantity", "unitPrice"];
    const milestoneFields = ["title", "paymentPercentage"];

    const boqMatches = boqFields.filter(f => columnMap[f] !== undefined).length;
    const milestoneMatches = milestoneFields.filter(f => columnMap[f] !== undefined).length;

    let type: "BOQ" | "MILESTONES" | "UNKNOWN" = "UNKNOWN";
    let confidence = 0;

    if (boqMatches >= 3) {
        type = "BOQ";
        confidence = boqMatches / boqFields.length;
    } else if (milestoneMatches >= 2) {
        type = "MILESTONES";
        confidence = milestoneMatches / milestoneFields.length;
    }

    return {
        type,
        headers,
        columnMap,
        dataStartRow: headerRow + 1,
        confidence,
    };
}

/**
 * Extract value from cell, handling different types
 */
function extractCellValue(cell: any, type: "string" | "number" | "date"): any {
    if (cell === null || cell === undefined) return null;

    switch (type) {
        case "number":
            if (typeof cell === "number") return cell;
            const numMatch = String(cell).replace(/[^0-9.-]/g, "");
            return numMatch ? parseFloat(numMatch) : null;

        case "date":
            if (cell instanceof Date) return cell.toISOString().split("T")[0];
            if (typeof cell === "string") {
                const date = new Date(cell);
                return isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
            }
            return null;

        default:
            return String(cell || "").trim();
    }
}

/**
 * Import BOQ items from Excel
 */
export function importBOQItems(
    sheetData: any[][],
    structure: DetectedStructure
): { items: ExtractedBOQItem[]; warnings: string[] } {
    const items: ExtractedBOQItem[] = [];
    const warnings: string[] = [];
    const { columnMap, dataStartRow } = structure;

    for (let i = dataStartRow; i < sheetData.length; i++) {
        const row = sheetData[i];
        if (!row || row.every(c => !c)) continue; // Skip empty rows

        const description = extractCellValue(row[columnMap.description], "string");
        if (!description) continue; // Skip rows without description

        // Skip optional items
        if (description.toLowerCase().startsWith("optional")) continue;
        const itemNumber = extractCellValue(row[columnMap.itemNumber], "string") || String(items.length + 1);
        const unit = extractCellValue(row[columnMap.unit], "string") || "EA";
        const quantity = extractCellValue(row[columnMap.quantity], "number") || 0;
        const unitPrice = extractCellValue(row[columnMap.unitPrice], "number") || 0;
        let totalPrice = extractCellValue(row[columnMap.totalPrice], "number");

        // Calculate total if not provided
        if (totalPrice === null || totalPrice === undefined) {
            totalPrice = quantity * unitPrice;
        }

        // Validation warnings
        if (quantity <= 0) {
            warnings.push(`Row ${i + 1}: Invalid quantity`);
        }
        if (unitPrice <= 0) {
            warnings.push(`Row ${i + 1}: Invalid unit price`);
        }

        items.push({
            itemNumber,
            description,
            unit,
            quantity,
            unitPrice,
            totalPrice,
        });
    }

    return { items, warnings };
}

/**
 * Import milestones from Excel
 */
export function importMilestones(
    sheetData: any[][],
    structure: DetectedStructure
): { milestones: ExtractedMilestone[]; warnings: string[] } {
    const milestones: ExtractedMilestone[] = [];
    const warnings: string[] = [];
    const { columnMap, dataStartRow } = structure;

    for (let i = dataStartRow; i < sheetData.length; i++) {
        const row = sheetData[i];
        if (!row || row.every(c => !c)) continue;

        const title = extractCellValue(row[columnMap.title], "string");
        if (!title) continue;

        const paymentPercentage = extractCellValue(row[columnMap.paymentPercentage], "number") || 0;
        const description = columnMap.description !== undefined
            ? extractCellValue(row[columnMap.description], "string")
            : undefined;
        const expectedDate = columnMap.expectedDate !== undefined
            ? extractCellValue(row[columnMap.expectedDate], "date")
            : undefined;

        if (paymentPercentage <= 0 || paymentPercentage > 100) {
            warnings.push(`Row ${i + 1}: Invalid payment percentage`);
        }

        milestones.push({
            title,
            description,
            expectedDate,
            paymentPercentage,
        });
    }

    // Validate total percentage
    const totalPercent = milestones.reduce((sum, m) => sum + m.paymentPercentage, 0);
    if (totalPercent < 95 || totalPercent > 105) {
        warnings.push(`Total payment percentage is ${totalPercent}%, expected ~100%`);
    }

    return { milestones, warnings };
}

/**
 * Main import function - auto-detects structure and imports
 */
export async function importFromExcel(buffer: Buffer): Promise<ImportResult> {
    try {
        const workbook = readWorkbook(buffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: null
        }) as any[][];

        if (sheetData.length < 2) {
            return {
                success: false,
                data: [],
                structure: { type: "UNKNOWN", headers: [], columnMap: {}, dataStartRow: 0, confidence: 0 },
                warnings: [],
                error: "File appears to be empty",
            };
        }

        const structure = detectStructure(sheetData);

        if (structure.type === "UNKNOWN") {
            return {
                success: false,
                data: [],
                structure,
                warnings: [],
                error: "Could not detect file structure. Please use a template with standard column headers.",
            };
        }

        if (structure.type === "BOQ") {
            const { items, warnings } = importBOQItems(sheetData, structure);
            return {
                success: items.length > 0,
                data: items,
                structure,
                warnings,
                error: items.length === 0 ? "No valid items found" : undefined,
            };
        }

        if (structure.type === "MILESTONES") {
            const { milestones, warnings } = importMilestones(sheetData, structure);
            return {
                success: milestones.length > 0,
                data: milestones,
                structure,
                warnings,
                error: milestones.length === 0 ? "No valid milestones found" : undefined,
            };
        }

        return {
            success: false,
            data: [],
            structure,
            warnings: [],
            error: "Unknown structure type",
        };
    } catch (error) {
        console.error("[Excel Import] Error:", error);
        return {
            success: false,
            data: [],
            structure: { type: "UNKNOWN", headers: [], columnMap: {}, dataStartRow: 0, confidence: 0 },
            warnings: [],
            error: error instanceof Error ? error.message : "Import failed",
        };
    }
}

/**
 * Generate a sample template for BOQ
 */
export function generateBOQTemplate(): XLSX.WorkBook {
    const data = [
        ["Item No", "Description", "Unit", "Quantity", "Unit Price", "Total Price"],
        ["1", "Sample Item 1", "EA", 10, 100, 1000],
        ["2", "Sample Item 2", "M", 50, 25, 1250],
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "BOQ");
    return workbook;
}

/**
 * Generate a sample template for Milestones
 */
export function generateMilestoneTemplate(): XLSX.WorkBook {
    const data = [
        ["Milestone", "Description", "Payment %", "Expected Date"],
        ["Initial Payment", "Advance payment upon signing", 20, "2024-02-01"],
        ["Materials Delivered", "All materials on site", 40, "2024-03-15"],
        ["Installation Complete", "Full installation done", 30, "2024-04-30"],
        ["Final Sign-off", "Customer acceptance", 10, "2024-05-15"],
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Milestones");
    return workbook;
}
