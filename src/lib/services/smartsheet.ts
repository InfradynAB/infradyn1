/**
 * Smartsheet Sync Service
 * Integrates with Smartsheet API for BOQ/progress data sync
 */

import db from "@/db/drizzle";
import { externalSync, syncLog, boqItem, purchaseOrder } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ExtractedBOQItem } from "./ai-extraction";

// Smartsheet API base URL
const SMARTSHEET_API_BASE = "https://api.smartsheet.com/2.0";

export interface SmartsheetConfig {
    apiKey: string;
    sheetId: string;
    columnMappings?: Record<string, string>; // field -> column title
}

export interface SmartsheetRow {
    id: number;
    rowNumber: number;
    cells: Array<{
        columnId: number;
        value: any;
        displayValue?: string;
    }>;
}

export interface SmartsheetSheet {
    id: number;
    name: string;
    columns: Array<{
        id: number;
        title: string;
        type: string;
        index: number;
    }>;
    rows: SmartsheetRow[];
}

export interface SyncResult {
    success: boolean;
    itemsProcessed: number;
    itemsCreated: number;
    itemsUpdated: number;
    itemsFailed: number;
    errors: string[];
    durationMs: number;
}

// Default column mappings (Smartsheet column title -> our field)
const DEFAULT_COLUMN_MAPPINGS: Record<string, string[]> = {
    itemNumber: ["Item", "Item #", "Item No", "Line", "No."],
    description: ["Description", "Item Description", "Name", "Task", "Material"],
    unit: ["Unit", "UoM", "Unit of Measure"],
    quantity: ["Quantity", "Qty", "Amount", "Count"],
    unitPrice: ["Unit Price", "Rate", "Price", "Unit Cost"],
    totalPrice: ["Total", "Total Price", "Amount", "Line Total"],
    // Progress tracking columns
    percentComplete: ["% Complete", "Progress", "Percent Complete", "Done %"],
    status: ["Status", "State"],
    notes: ["Notes", "Comments", "Remarks"],
};

/**
 * Make an authenticated request to Smartsheet API
 */
async function smartsheetRequest<T>(
    endpoint: string,
    apiKey: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${SMARTSHEET_API_BASE}${endpoint}`, {
        ...options,
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Smartsheet API error: ${response.status} - ${error}`);
    }

    return response.json();
}

/**
 * Fetch a sheet with all its data
 */
export async function fetchSheet(config: SmartsheetConfig): Promise<SmartsheetSheet> {
    return smartsheetRequest<SmartsheetSheet>(
        `/sheets/${config.sheetId}`,
        config.apiKey
    );
}

/**
 * Find column ID by field name using mappings
 */
function findColumnId(
    columns: SmartsheetSheet["columns"],
    fieldName: string,
    customMappings?: Record<string, string>
): number | null {
    // Check custom mapping first
    if (customMappings?.[fieldName]) {
        const col = columns.find(c => c.title === customMappings[fieldName]);
        if (col) return col.id;
    }

    // Fall back to default mappings
    const variations = DEFAULT_COLUMN_MAPPINGS[fieldName] || [];
    for (const variation of variations) {
        const col = columns.find(c =>
            c.title.toLowerCase() === variation.toLowerCase()
        );
        if (col) return col.id;
    }

    return null;
}

/**
 * Extract cell value by column ID
 */
function getCellValue(row: SmartsheetRow, columnId: number): any {
    const cell = row.cells.find(c => c.columnId === columnId);
    return cell?.value ?? cell?.displayValue ?? null;
}

/**
 * Parse rows into BOQ items
 */
export function parseRowsToBOQ(
    sheet: SmartsheetSheet,
    customMappings?: Record<string, string>
): { items: ExtractedBOQItem[]; warnings: string[] } {
    const items: ExtractedBOQItem[] = [];
    const warnings: string[] = [];

    // Find column IDs
    const columnIds = {
        itemNumber: findColumnId(sheet.columns, "itemNumber", customMappings),
        description: findColumnId(sheet.columns, "description", customMappings),
        unit: findColumnId(sheet.columns, "unit", customMappings),
        quantity: findColumnId(sheet.columns, "quantity", customMappings),
        unitPrice: findColumnId(sheet.columns, "unitPrice", customMappings),
        totalPrice: findColumnId(sheet.columns, "totalPrice", customMappings),
    };

    if (!columnIds.description) {
        warnings.push("Could not find Description column");
        return { items, warnings };
    }

    for (const row of sheet.rows) {
        const description = getCellValue(row, columnIds.description!);
        if (!description) continue;

        const item: ExtractedBOQItem = {
            itemNumber: columnIds.itemNumber
                ? String(getCellValue(row, columnIds.itemNumber) || items.length + 1)
                : String(items.length + 1),
            description: String(description),
            unit: columnIds.unit
                ? String(getCellValue(row, columnIds.unit) || "EA")
                : "EA",
            quantity: columnIds.quantity
                ? Number(getCellValue(row, columnIds.quantity)) || 0
                : 0,
            unitPrice: columnIds.unitPrice
                ? Number(getCellValue(row, columnIds.unitPrice)) || 0
                : 0,
            totalPrice: 0,
        };

        // Calculate or use provided total
        if (columnIds.totalPrice) {
            item.totalPrice = Number(getCellValue(row, columnIds.totalPrice)) || 0;
        }
        if (!item.totalPrice) {
            item.totalPrice = item.quantity * item.unitPrice;
        }

        items.push(item);
    }

    return { items, warnings };
}

/**
 * Sync a Smartsheet to a Purchase Order
 */
export async function syncSheetToPO(
    syncId: string,
    purchaseOrderId: string
): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsProcessed = 0;
    let itemsCreated = 0;
    let itemsUpdated = 0;
    let itemsFailed = 0;

    try {
        // Get sync config
        const syncConfig = await db.query.externalSync.findFirst({
            where: eq(externalSync.id, syncId),
        });

        if (!syncConfig) {
            throw new Error("Sync configuration not found");
        }

        const config = syncConfig.config as SmartsheetConfig;
        if (!config?.apiKey || !config?.sheetId) {
            throw new Error("Invalid Smartsheet configuration");
        }

        // Fetch sheet data
        const sheet = await fetchSheet(config);
        const { items, warnings } = parseRowsToBOQ(sheet, config.columnMappings);
        errors.push(...warnings);

        // Get existing BOQ items for this PO
        const existingItems = await db.query.boqItem.findMany({
            where: eq(boqItem.purchaseOrderId, purchaseOrderId),
        });

        const existingByNumber = new Map(
            existingItems.map(item => [item.itemNumber, item])
        );

        // Process each item
        for (const item of items) {
            itemsProcessed++;
            try {
                const existing = existingByNumber.get(item.itemNumber);

                if (existing) {
                    // Update existing item
                    await db.update(boqItem)
                        .set({
                            description: item.description,
                            unit: item.unit,
                            quantity: String(item.quantity),
                            unitPrice: String(item.unitPrice),
                            totalPrice: String(item.totalPrice),
                            updatedAt: new Date(),
                        })
                        .where(eq(boqItem.id, existing.id));
                    itemsUpdated++;
                } else {
                    // Create new item
                    await db.insert(boqItem).values({
                        purchaseOrderId,
                        itemNumber: item.itemNumber,
                        description: item.description,
                        unit: item.unit,
                        quantity: String(item.quantity),
                        unitPrice: String(item.unitPrice),
                        totalPrice: String(item.totalPrice),
                    });
                    itemsCreated++;
                }
            } catch (err) {
                itemsFailed++;
                errors.push(`Failed to process item ${item.itemNumber}: ${err}`);
            }
        }

        const durationMs = Date.now() - startTime;

        // Log the sync
        await db.insert(syncLog).values({
            externalSyncId: syncId,
            status: itemsFailed > 0 ? "PARTIAL" : "SUCCESS",
            itemsProcessed,
            itemsCreated,
            itemsUpdated,
            itemsFailed,
            errorDetails: errors.length > 0 ? errors : null,
            durationMs,
        });

        // Update sync metadata
        await db.update(externalSync)
            .set({
                lastSyncAt: new Date(),
                lastSyncStatus: itemsFailed > 0 ? "PARTIAL" : "SUCCESS",
                itemsSynced: itemsProcessed,
                updatedAt: new Date(),
            })
            .where(eq(externalSync.id, syncId));

        return {
            success: true,
            itemsProcessed,
            itemsCreated,
            itemsUpdated,
            itemsFailed,
            errors,
            durationMs,
        };
    } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : "Sync failed";

        // Log the failure
        await db.insert(syncLog).values({
            externalSyncId: syncId,
            status: "FAILED",
            itemsProcessed,
            itemsCreated,
            itemsUpdated,
            itemsFailed,
            errorDetails: [errorMessage, ...errors],
            durationMs,
        });

        await db.update(externalSync)
            .set({
                lastSyncAt: new Date(),
                lastSyncStatus: "FAILED",
                lastSyncError: errorMessage,
                updatedAt: new Date(),
            })
            .where(eq(externalSync.id, syncId));

        return {
            success: false,
            itemsProcessed,
            itemsCreated,
            itemsUpdated,
            itemsFailed,
            errors: [errorMessage, ...errors],
            durationMs,
        };
    }
}

/**
 * Test Smartsheet connection
 */
export async function testConnection(config: SmartsheetConfig): Promise<{
    success: boolean;
    sheetName?: string;
    columnCount?: number;
    rowCount?: number;
    error?: string;
}> {
    try {
        const sheet = await fetchSheet(config);
        return {
            success: true,
            sheetName: sheet.name,
            columnCount: sheet.columns.length,
            rowCount: sheet.rows.length,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Connection failed",
        };
    }
}

/**
 * List available sheets for an API key
 */
export async function listSheets(apiKey: string): Promise<{
    success: boolean;
    sheets?: Array<{ id: number; name: string }>;
    error?: string;
}> {
    try {
        const response = await smartsheetRequest<{
            data: Array<{ id: number; name: string }>;
        }>("/sheets", apiKey);

        return {
            success: true,
            sheets: response.data.map(s => ({ id: s.id, name: s.name })),
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to list sheets",
        };
    }
}
