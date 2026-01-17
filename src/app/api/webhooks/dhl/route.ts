import { NextRequest, NextResponse } from 'next/server';
import { processDHLWebhook, DHLWebhookPayload } from '@/lib/actions/dhl-api-connector';
import { checkAndCreateDelayConflict } from '@/lib/actions/logistics-engine';
import db from '@/db/drizzle';
import { shipment } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Phase 6: DHL Webhook Handler
 * 
 * Handles DHL push notifications for shipment status updates.
 * Supports webhook verification handshake and event processing.
 */

/**
 * GET: DHL Webhook Verification Handshake
 * 
 * When you first register your webhook URL, DHL sends a GET request
 * with a validation token. Return that token to prove you own the server.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    // DHL sends a validation challenge token
    const token = searchParams.get('challenge') || searchParams.get('validationToken');

    if (token) {
        console.log('✅ DHL webhook verification handshake received');

        // Return the token as plain text to complete verification
        return new Response(token, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    // Health check endpoint
    return NextResponse.json({
        status: "ok",
        service: "DHL Webhook Handler",
        timestamp: new Date().toISOString(),
    });
}

/**
 * POST: Process DHL Shipment Events
 */
export async function POST(request: NextRequest) {
    try {
        const payload: DHLWebhookPayload = await request.json();

        // Validate payload structure
        if (!payload['event-type'] || !payload.shipments) {
            console.error("Invalid DHL webhook payload structure");
            return NextResponse.json(
                { error: "Invalid payload structure" },
                { status: 400 }
            );
        }

        console.log(`📦 Received DHL webhook: ${payload.shipments.length} shipment(s)`);

        // Process the webhook
        const result = await processDHLWebhook(payload);

        // Check for exceptions and create conflicts if needed
        for (const dhlShipment of payload.shipments) {
            if (dhlShipment.status.statusCode === 'failure') {
                // Find our shipment and create conflict
                const existingShipment = await db.query.shipment.findFirst({
                    where: eq(shipment.waybillNumber, dhlShipment.id),
                });

                if (existingShipment) {
                    console.log(`⚠️ DHL Exception detected for ${dhlShipment.id}: ${dhlShipment.status.description}`);
                    await checkAndCreateDelayConflict(existingShipment.id);
                }
            }

            // Check for customs hold
            if (dhlShipment.status.description?.toLowerCase().includes('customs')) {
                const existingShipment = await db.query.shipment.findFirst({
                    where: eq(shipment.waybillNumber, dhlShipment.id),
                });

                if (existingShipment) {
                    console.log(`🛃 Customs hold detected for ${dhlShipment.id}`);
                    await checkAndCreateDelayConflict(existingShipment.id);
                }
            }
        }

        return NextResponse.json({
            success: result.success,
            processed: result.processed,
            errors: result.errors,
        });

    } catch (error) {
        console.error("Error processing DHL webhook:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
