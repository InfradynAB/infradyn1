import { NextRequest, NextResponse } from 'next/server';
import { processMaerskWebhook, checkEtaDrift } from '@/lib/actions/maersk-api-connector';
import { MaerskWebhookPayload } from '@/lib/utils/maersk-utils';
import { checkAndCreateDelayConflict } from '@/lib/actions/logistics-engine';
import db from '@/db/drizzle';
import { shipment } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Phase 6: Maersk Webhook Handler
 * 
 * Receives container tracking events from Maersk and updates shipments.
 * Validates webhook signature for security.
 */

// Verify Maersk webhook signature
function verifyWebhookSignature(
    payload: string,
    signature: string | null,
    secret: string
): boolean {
    if (!signature || !secret) {
        console.warn("Missing webhook signature or secret");
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('x-maersk-signature');
        const webhookSecret = process.env.MAERSK_WEBHOOK_SECRET;

        // Verify signature in production
        if (process.env.NODE_ENV === 'production' && webhookSecret) {
            const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
            if (!isValid) {
                console.error("Invalid Maersk webhook signature");
                return NextResponse.json(
                    { error: "Invalid signature" },
                    { status: 401 }
                );
            }
        }

        const payload: MaerskWebhookPayload = JSON.parse(rawBody);

        console.log(`📦 Received Maersk webhook for container: ${payload.containerNumber}`);
        console.log(`   Event: ${payload.event.eventType} at ${payload.event.eventDateTime}`);

        // Process the webhook
        const result = await processMaerskWebhook(payload);

        if (!result.success) {
            console.error(`Failed to process Maersk webhook: ${result.error}`);
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        // Check for Vessel Delay (VSD) event
        if (payload.event.eventType === 'VSD' && result.shipmentId) {
            console.log(`⚠️ Vessel Delay detected for shipment ${result.shipmentId}`);

            // Create delay conflict
            await checkAndCreateDelayConflict(result.shipmentId);
        }

        // Check ETA drift if we have a new ETA
        if (result.shipmentId) {
            const shipmentData = await db.query.shipment.findFirst({
                where: eq(shipment.id, result.shipmentId),
            });

            if (shipmentData?.logisticsEta) {
                const driftCheck = await checkEtaDrift(
                    result.shipmentId,
                    new Date(shipmentData.logisticsEta)
                );

                if (driftCheck.shouldAlert) {
                    console.log(`🚨 ETA drift of ${driftCheck.driftHours.toFixed(1)}h detected for shipment ${result.shipmentId}`);
                    await checkAndCreateDelayConflict(result.shipmentId);
                }
            }
        }

        return NextResponse.json({
            success: true,
            shipmentId: result.shipmentId,
            message: `Processed ${payload.event.eventType} event`,
        });

    } catch (error) {
        console.error("Error processing Maersk webhook:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Health check endpoint
export async function GET() {
    return NextResponse.json({
        status: "ok",
        service: "Maersk Webhook Handler",
        timestamp: new Date().toISOString(),
    });
}
