/**
 * Email Queue Processing Cron Job
 * Processes pending emails through OCR/AI extraction
 * 
 * GET /api/cron/process-emails
 * 
 * Schedule: Every 5 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { processEmailQueue } from "@/lib/services/email-processor";

// Verify cron secret
function verifyCronAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // For Vercel Cron
    if (request.headers.get("x-vercel-cron") === "1") {
        return true;
    }

    // For manual triggers with secret
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
        return true;
    }

    // Dev mode - allow without auth
    if (process.env.NODE_ENV === "development") {
        return true;
    }

    return false;
}

export async function GET(request: NextRequest) {
    // Auth check
    if (!verifyCronAuth(request)) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    console.log("[CRON] Starting email queue processing...");

    try {
        const result = await processEmailQueue(20); // Process up to 20 emails

        console.log(`[CRON] Email processing complete:`, result);

        return NextResponse.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[CRON] Email processing error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Processing failed",
            },
            { status: 500 }
        );
    }
}

// Vercel cron config
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds max
