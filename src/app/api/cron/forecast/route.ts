import { NextRequest, NextResponse } from "next/server";
import { generateForecastRecords } from "@/lib/actions/progress-engine";

/**
 * Cron endpoint for gap forecasting
 * Run daily to create forecast records for milestones without recent updates
 * 
 * Setup in vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/forecast", "schedule": "0 0 * * *" }]
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("[CRON:FORECAST] Starting daily forecast generation...");

        const result = await generateForecastRecords();

        if (!result.success) {
            console.error("[CRON:FORECAST] Failed:", result.error);
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        console.log(`[CRON:FORECAST] Generated ${result.data?.generated || 0} forecast records`);

        return NextResponse.json({
            success: true,
            generated: result.data?.generated || 0,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error("[CRON:FORECAST] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Allow GET for manual testing in development
export async function GET(request: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }
    return POST(request);
}
