/**
 * Sync Connection Test API
 * Tests external sync connections (Smartsheet, etc.)
 * 
 * POST /api/sync/test-connection
 */

import { NextRequest, NextResponse } from "next/server";
import { listSheets, testConnection, type SmartsheetConfig } from "@/lib/services/smartsheet";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { provider, apiKey, sheetId } = body;

        if (!provider || !apiKey) {
            return NextResponse.json(
                { success: false, error: "Missing provider or API key" },
                { status: 400 }
            );
        }

        if (provider === "SMARTSHEET") {
            // If sheetId provided, test specific connection
            if (sheetId) {
                const config: SmartsheetConfig = {
                    apiKey,
                    sheetId,
                };

                const result = await testConnection(config);

                if (result.success) {
                    return NextResponse.json({
                        success: true,
                        sheetName: result.sheetName,
                        columnCount: result.columnCount,
                        rowCount: result.rowCount,
                    });
                } else {
                    return NextResponse.json(
                        { success: false, error: result.error },
                        { status: 422 }
                    );
                }
            }

            // Otherwise list available sheets
            const result = await listSheets(apiKey);

            if (result.success) {
                return NextResponse.json({
                    success: true,
                    sheets: result.sheets?.map(s => ({
                        id: String(s.id),
                        name: s.name,
                    })),
                });
            } else {
                return NextResponse.json(
                    { success: false, error: result.error },
                    { status: 422 }
                );
            }
        }

        if (provider === "GOOGLE_SHEETS") {
            // TODO: Implement Google Sheets connection test
            return NextResponse.json(
                { success: false, error: "Google Sheets not yet supported" },
                { status: 501 }
            );
        }

        return NextResponse.json(
            { success: false, error: `Unknown provider: ${provider}` },
            { status: 400 }
        );
    } catch (error) {
        console.error("[SYNC TEST] Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Connection test failed"
            },
            { status: 500 }
        );
    }
}
