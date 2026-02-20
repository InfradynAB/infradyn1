import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { z } from "zod";
import {
    importBOQFromGoogleSheet,
    extractSpreadsheetId,
    testGoogleSheetConnection,
    listSheetsInSpreadsheet
} from "@/lib/services/google-sheets";
import { categorizeBOQItemsWithOptions } from "@/lib/services/boq-categorization";

const importSchema = z.object({
    spreadsheetUrl: z.string().url().optional(),
    spreadsheetId: z.string().optional(),
    sheetName: z.string().optional(),
}).refine(data => data.spreadsheetUrl || data.spreadsheetId, {
    message: "Either spreadsheetUrl or spreadsheetId is required",
});

const testSchema = z.object({
    spreadsheetUrl: z.string().url().optional(),
    spreadsheetId: z.string().optional(),
    action: z.enum(["test", "list-sheets"]),
}).refine(data => data.spreadsheetUrl || data.spreadsheetId, {
    message: "Either spreadsheetUrl or spreadsheetId is required",
});

/**
 * POST /api/boq/import-sheets
 * Import BOQ items from a Google Sheet
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
        const validated = importSchema.parse(body);

        // Extract spreadsheet ID from URL if provided
        let spreadsheetId = validated.spreadsheetId;
        if (validated.spreadsheetUrl) {
            spreadsheetId = extractSpreadsheetId(validated.spreadsheetUrl) || undefined;
        }

        if (!spreadsheetId) {
            return NextResponse.json({
                error: "Invalid Google Sheets URL or ID",
            }, { status: 400 });
        }

        // Import BOQ items
        const result = await importBOQFromGoogleSheet({
            spreadsheetId,
            sheetName: validated.sheetName,
        });

        let categorized = result.items;
        try {
            categorized = await categorizeBOQItemsWithOptions(result.items, { requireAll: true });
        } catch (e) {
            console.warn("[Google Sheets Import] Categorization failed; returning uncategorized items", e);
        }

        return NextResponse.json({
            success: true,
            items: categorized,
            sheetName: result.sheetName,
            rowsProcessed: result.rowsProcessed,
            warnings: result.warnings,
        });

    } catch (error: any) {
        console.error("[Google Sheets Import Error]:", error);

        // Handle specific Google API errors
        if (error.code === 404) {
            return NextResponse.json({
                error: "Spreadsheet not found. Make sure it's shared with the service account.",
            }, { status: 404 });
        }

        if (error.code === 403) {
            return NextResponse.json({
                error: "Access denied. Please share the spreadsheet with the app's service account email.",
            }, { status: 403 });
        }

        return NextResponse.json({
            error: error.message || "Failed to import from Google Sheets",
        }, { status: 500 });
    }
}

/**
 * GET /api/boq/import-sheets?action=test|list-sheets&spreadsheetId=xxx
 * Test connection or list sheets
 */
export async function GET(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "test";
    const spreadsheetUrl = searchParams.get("spreadsheetUrl");
    const spreadsheetIdParam = searchParams.get("spreadsheetId");

    let spreadsheetId = spreadsheetIdParam;
    if (spreadsheetUrl) {
        spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    }

    if (!spreadsheetId) {
        return NextResponse.json({
            error: "spreadsheetId or spreadsheetUrl is required",
        }, { status: 400 });
    }

    try {
        if (action === "list-sheets") {
            const result = await listSheetsInSpreadsheet(spreadsheetId);
            return NextResponse.json(result);
        }

        // Default: test connection
        const result = await testGoogleSheetConnection(spreadsheetId);
        return NextResponse.json(result);

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message || "Failed to connect",
        }, { status: 500 });
    }
}
