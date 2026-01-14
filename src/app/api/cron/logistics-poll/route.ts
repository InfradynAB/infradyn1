import { NextResponse } from "next/server";
import { runLogisticsPoller } from "@/lib/jobs/logistics-poller";

/**
 * Cron endpoint for logistics polling
 * Endpoint: /api/cron/logistics-poll
 * Vercel cron schedule: every 2 hours
 */

export async function GET(request: Request) {
    try {
        // Verify cron secret for security (optional but recommended)
        const authHeader = request.headers.get("authorization");
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("[Cron] Starting logistics poll...");
        const result = await runLogisticsPoller();
        console.log(`[Cron] Logistics poll complete: ${result.polled} polled, ${result.updated} updated, ${result.errors} errors`);

        return NextResponse.json({
            success: result.success,
            polled: result.polled,
            updated: result.updated,
            errors: result.errors,
            duration: result.duration,
        });
    } catch (error) {
        console.error("[Cron] Logistics poll error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
