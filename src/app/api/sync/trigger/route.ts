/**
 * Sync Trigger API
 * Triggers a manual sync for an external sync configuration
 * 
 * POST /api/sync/trigger
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { externalSync } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { syncSheetToPO } from "@/lib/services/smartsheet";

export async function POST(request: NextRequest) {
    try {
        // Auth check
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { syncId, purchaseOrderId } = body;

        if (!syncId) {
            return NextResponse.json(
                { error: "Missing syncId" },
                { status: 400 }
            );
        }

        // Get sync config
        const syncConfig = await db.query.externalSync.findFirst({
            where: eq(externalSync.id, syncId),
        });

        if (!syncConfig) {
            return NextResponse.json(
                { error: "Sync configuration not found" },
                { status: 404 }
            );
        }

        if (!syncConfig.isActive) {
            return NextResponse.json(
                { error: "Sync is disabled" },
                { status: 400 }
            );
        }

        // Determine target PO
        const targetPoId = purchaseOrderId || syncConfig.targetProjectId;

        if (!targetPoId) {
            return NextResponse.json(
                { error: "No target purchase order specified" },
                { status: 400 }
            );
        }

        // Trigger sync based on provider
        if (syncConfig.provider === "SMARTSHEET") {
            const result = await syncSheetToPO(syncId, targetPoId);

            return NextResponse.json({
                success: result.success,
                itemsProcessed: result.itemsProcessed,
                itemsCreated: result.itemsCreated,
                itemsUpdated: result.itemsUpdated,
                itemsFailed: result.itemsFailed,
                errors: result.errors,
                durationMs: result.durationMs,
            });
        }

        return NextResponse.json(
            { error: `Provider ${syncConfig.provider} not supported` },
            { status: 400 }
        );
    } catch (error) {
        console.error("[SYNC TRIGGER] Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Sync failed"
            },
            { status: 500 }
        );
    }
}
