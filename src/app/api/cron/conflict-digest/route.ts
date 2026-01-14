import { NextResponse } from "next/server";
import { runConflictDigest } from "@/lib/jobs/conflict-digest";

/**
 * Cron endpoint for conflict digest emails
 * Endpoint: /api/cron/conflict-digest
 * Vercel cron schedule: "0 8 * * *" (daily at 8 AM)
 */

export async function GET(request: Request) {
    try {
        // Verify cron secret for security (optional but recommended)
        const authHeader = request.headers.get("authorization");
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("[Cron] Starting conflict digest...");
        const result = await runConflictDigest();
        console.log(`[Cron] Conflict digest complete: ${result.emailsSent} emails sent for ${result.conflictCount} conflicts`);

        return NextResponse.json({
            success: result.success,
            recipientCount: result.recipientCount,
            conflictCount: result.conflictCount,
            emailsSent: result.emailsSent,
            errors: result.errors,
        });
    } catch (error) {
        console.error("[Cron] Conflict digest error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
