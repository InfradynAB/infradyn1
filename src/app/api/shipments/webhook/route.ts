import { NextRequest, NextResponse } from "next/server";
import { processAfterShipWebhook, AfterShipWebhookPayload } from "@/lib/actions/logistics-api-connector";

/**
 * AfterShip Webhook Handler
 * 
 * Receives tracking updates from AfterShip and updates shipment status.
 * Configure webhook URL in AfterShip dashboard: https://your-domain.com/api/shipments/webhook
 */
export async function POST(request: NextRequest) {
    try {
        // Verify webhook signature (optional but recommended)
        const signature = request.headers.get("aftership-hmac-sha256");
        // TODO: Implement signature verification if AFTERSHIP_WEBHOOK_SECRET is configured

        const payload: AfterShipWebhookPayload = await request.json();

        // Process the webhook
        const result = await processAfterShipWebhook(payload);

        if (!result.success) {
            console.error("[AfterShip Webhook] Processing failed:", result.error);
            // Return 200 anyway to prevent AfterShip from retrying
            return NextResponse.json({ received: true, processed: false, error: result.error });
        }

        return NextResponse.json({
            received: true,
            processed: true,
            shipmentId: result.shipmentId
        });
    } catch (error) {
        console.error("[AfterShip Webhook] Error:", error);
        // Return 200 to prevent retries for malformed payloads
        return NextResponse.json({
            received: true,
            processed: false,
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
}

// AfterShip may send GET requests for verification
export async function GET() {
    return NextResponse.json({ status: "ok", endpoint: "AfterShip Webhook" });
}
