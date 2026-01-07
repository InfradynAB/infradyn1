/**
 * Google Sheets Service
 * Integrates with Google Sheets API for BOQ data import
 */

import { google } from "googleapis";
import type { ExtractedBOQItem } from "./ai-extraction";

// Default column mappings (Sheet column header -> our field)
const DEFAULT_COLUMN_MAPPINGS: Record<string, string[]> = {
    itemNumber: ["Item", "Item #", "Item No", "Line", "No.", "#", "No"],
    description: ["Description", "Item Description", "Desc", "Name", "Material", "Product"],
    quantity: ["Quantity", "Qty", "Amount", "Count", "Qty.", "QTY"],
    unit: ["Unit", "UOM", "Units", "Unit of Measure"],
    unitPrice: ["Unit Price", "Price", "Rate", "Cost", "Unit Cost", "Unit Rate"],
    totalPrice: ["Total", "Amount", "Total Price", "Line Total", "Extended", "Value"],
    rosDate: ["ROS Date", "Required On Site", "Delivery Date", "Due Date", "Date Required"],
};

interface GoogleSheetsConfig {
    spreadsheetId: string;
    sheetName?: string; // Defaults to first sheet
    range?: string; // e.g., "A1:G100"
}

interface ParseResult {
    items: ExtractedBOQItem[];
    warnings: string[];
    sheetName: string;
    rowsProcessed: number;
}

/**
 * Get authenticated Google Sheets client
 */
function getGoogleSheetsClient() {
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!clientEmail || !privateKey) {
        throw new Error("Google Sheets credentials not configured");
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    return google.sheets({ version: "v4", auth });
}

/**
 * Extract spreadsheet ID from Google Sheets URL
 */
export function extractSpreadsheetId(url: string): string | null {
    // Matches: https://docs.google.com/spreadsheets/d/{spreadsheetId}/...
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

/**
 * Find column index by field name using mappings
 */
function findColumnIndex(
    headers: string[],
    fieldName: string,
    customMappings?: Record<string, string>
): number {
    const normalizedHeaders = headers.map(h => h?.toLowerCase().trim() || "");

    // Check custom mappings first
    if (customMappings?.[fieldName]) {
        const idx = normalizedHeaders.indexOf(customMappings[fieldName].toLowerCase());
        if (idx !== -1) return idx;
    }

    // Check default mappings
    const mappings = DEFAULT_COLUMN_MAPPINGS[fieldName] || [];
    for (const mapping of mappings) {
        const idx = normalizedHeaders.indexOf(mapping.toLowerCase());
        if (idx !== -1) return idx;
    }

    return -1;
}

/**
 * Fetch and parse BOQ items from a Google Sheet
 */
export async function importBOQFromGoogleSheet(
    config: GoogleSheetsConfig,
    customMappings?: Record<string, string>
): Promise<ParseResult> {
    const sheets = getGoogleSheetsClient();
    const warnings: string[] = [];
    const items: ExtractedBOQItem[] = [];

    try {
        // Get spreadsheet metadata to find sheet names
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: config.spreadsheetId,
        });

        const sheetsList = spreadsheet.data.sheets || [];
        if (sheetsList.length === 0) {
            throw new Error("No sheets found in spreadsheet");
        }

        // Use specified sheet or first sheet
        const targetSheet = config.sheetName
            ? sheetsList.find(s => s.properties?.title === config.sheetName)
            : sheetsList[0];

        if (!targetSheet) {
            throw new Error(`Sheet "${config.sheetName}" not found`);
        }

        const sheetName = targetSheet.properties?.title || "Sheet1";
        const range = config.range || `${sheetName}!A:Z`;

        // Fetch data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: config.spreadsheetId,
            range,
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            return {
                items: [],
                warnings: ["No data found in sheet (needs header row and at least one data row)"],
                sheetName,
                rowsProcessed: 0,
            };
        }

        // First row is headers
        const headers = rows[0] as string[];
        const dataRows = rows.slice(1);

        // Find column indices
        const colMap = {
            itemNumber: findColumnIndex(headers, "itemNumber", customMappings),
            description: findColumnIndex(headers, "description", customMappings),
            quantity: findColumnIndex(headers, "quantity", customMappings),
            unit: findColumnIndex(headers, "unit", customMappings),
            unitPrice: findColumnIndex(headers, "unitPrice", customMappings),
            totalPrice: findColumnIndex(headers, "totalPrice", customMappings),
            rosDate: findColumnIndex(headers, "rosDate", customMappings),
        };

        // Check required columns
        if (colMap.description === -1) {
            warnings.push("Could not find Description column");
        }

        // Parse rows
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            if (!row || row.length === 0) continue;

            const description = colMap.description !== -1 ? String(row[colMap.description] || "").trim() : "";
            if (!description) continue; // Skip empty rows

            const quantity = colMap.quantity !== -1 ? parseFloat(row[colMap.quantity]) || 1 : 1;
            const unitPrice = colMap.unitPrice !== -1 ? parseFloat(row[colMap.unitPrice]) || 0 : 0;
            const totalPrice = colMap.totalPrice !== -1
                ? parseFloat(row[colMap.totalPrice]) || quantity * unitPrice
                : quantity * unitPrice;

            const item: ExtractedBOQItem = {
                itemNumber: colMap.itemNumber !== -1 ? String(row[colMap.itemNumber] || i + 1) : String(i + 1),
                description,
                quantity,
                unit: colMap.unit !== -1 ? String(row[colMap.unit] || "pcs") : "pcs",
                unitPrice,
                totalPrice,
            };

            items.push(item);
        }

        if (items.length === 0) {
            warnings.push("No valid BOQ items found in sheet");
        }

        return {
            items,
            warnings,
            sheetName,
            rowsProcessed: dataRows.length,
        };
    } catch (error) {
        console.error("[Google Sheets Import Error]:", error);
        throw error;
    }
}

/**
 * Test connection to a Google Sheet
 */
export async function testGoogleSheetConnection(spreadsheetId: string): Promise<{
    success: boolean;
    sheetName?: string;
    rowCount?: number;
    error?: string;
}> {
    try {
        const sheets = getGoogleSheetsClient();

        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        const firstSheet = spreadsheet.data.sheets?.[0];
        const sheetName = firstSheet?.properties?.title || "Unknown";
        const rowCount = firstSheet?.properties?.gridProperties?.rowCount || 0;

        return {
            success: true,
            sheetName,
            rowCount,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || "Failed to connect to Google Sheet",
        };
    }
}

/**
 * List sheets in a spreadsheet
 */
export async function listSheetsInSpreadsheet(spreadsheetId: string): Promise<{
    success: boolean;
    sheets?: Array<{ name: string; rowCount: number }>;
    error?: string;
}> {
    try {
        const sheets = getGoogleSheetsClient();

        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        const sheetsList = spreadsheet.data.sheets?.map(s => ({
            name: s.properties?.title || "Unknown",
            rowCount: s.properties?.gridProperties?.rowCount || 0,
        })) || [];

        return {
            success: true,
            sheets: sheetsList,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || "Failed to list sheets",
        };
    }
}
