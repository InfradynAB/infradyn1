import { NextRequest, NextResponse } from "next/server";
import { processChaseQueue } from "@/lib/actions/progress-engine";

/**
 * Cron endpoint for chase queue processing
 * Run every 4 hours to send reminders based on risk level
 * 
 * Setup in vercel.json:
 * { "crons": [{ "path": "/api/cron/chase", "schedule": "0 0,4,8,12,16,20 * * *" }] }
 */
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("[CRON:CHASE] Starting chase queue processing...");

        const result = await processChaseQueue();

        if (!result.success) {
            console.error("[CRON:CHASE] Failed:", result.error);
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        console.log(`[CRON:CHASE] Processed ${result.data?.processed || 0} chase items`);

        return NextResponse.json({
            success: true,
            processed: result.data?.processed || 0,
            escalations: result.data?.escalations || 0,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error("[CRON:CHASE] Error:", error);
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
