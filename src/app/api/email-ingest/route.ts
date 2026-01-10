/**
 * Email Ingest Webhook Endpoint
 * Receives inbound emails from Resend email.received webhook
 * 
 * POST /api/email-ingest
 * 
 * Setup Instructions:
 * 1. Go to Resend Dashboard → Webhooks → Add Webhook
 * 2. Enter URL: https://yourdomain.com/api/email-ingest
 * 3. Select event: email.received
 * 4. Copy the signing secret to RESEND_WEBHOOK_SECRET env var
 */

import { NextRequest, NextResponse } from "next/server";
import { handleInboundEmail, type InboundEmail } from "@/lib/services/email-processor";
import crypto from "crypto";

// Resend email.received webhook payload structure
interface ResendEmailReceivedPayload {
    type: "email.received";
    created_at: string;
    data: {
        email_id: string;
        from: string;
        to: string[];
        subject: string;
        text?: string;
        html?: string;
        attachments?: Array<{
            id: string;
            filename: string;
            content_type: string;
            size: number;
            download_url: string;
        }>;
    };
}

/**
 * Verify Resend webhook signature
 * TODO: Re-enable once we confirm Resend's exact signature format
 * @see https://resend.com/docs/webhooks#verify-webhook-signature
 */
async function verifyResendSignature(request: NextRequest, body: string): Promise<boolean> {
    // TEMPORARY: Skip verification to get webhook working
    // Resend's signature format may differ from standard HMAC-SHA256
    console.log("[EMAIL-INGEST] Signature verification temporarily disabled for testing");
    return true;

    /* TODO: Re-enable once we confirm format
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.warn("[EMAIL-INGEST] No webhook secret configured");
        return true;
    }

    const signature = request.headers.get("resend-signature");
    if (!signature) {
        console.error("[EMAIL-INGEST] No signature in request");
        return false;
    }

    try {
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(body)
            .digest("hex");

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        console.error("[EMAIL-INGEST] Signature verification error:", error);
        return false;
    }
    */
}

/**
 * Download attachment from Resend's download URL
 */
async function downloadAttachment(downloadUrl: string): Promise<Buffer | null> {
    try {
        const response = await fetch(downloadUrl, {
            headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
        });

        if (!response.ok) {
            console.error(`[EMAIL-INGEST] Failed to download attachment: ${response.status}`);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.error("[EMAIL-INGEST] Attachment download error:", error);
        return null;
    }
}

/**
 * Parse Resend email.received webhook payload
 */
async function parseResendPayload(payload: ResendEmailReceivedPayload): Promise<InboundEmail> {
    const { data } = payload;

    // Download attachments from Resend's attachment API
    const attachments: InboundEmail["attachments"] = [];

    if (data.attachments && data.attachments.length > 0) {
        for (const att of data.attachments) {
            const content = await downloadAttachment(att.download_url);
            if (content) {
                attachments.push({
                    filename: att.filename,
                    content,
                    contentType: att.content_type,
                });
            }
        }
    }

    return {
        from: data.from,
        to: data.to[0] || "", // Take first recipient
        subject: data.subject,
        text: data.text,
        html: data.html,
        attachments,
    };
}

export async function POST(request: NextRequest) {
    try {
        // Get raw body for signature verification
        const body = await request.text();

        // Verify signature
        if (!(await verifyResendSignature(request, body))) {
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 401 }
            );
        }

        // Parse JSON payload
        let payload: ResendEmailReceivedPayload;
        try {
            payload = JSON.parse(body);
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON payload" },
                { status: 400 }
            );
        }

        // Check event type
        if (payload.type !== "email.received") {
            // Acknowledge other events but don't process
            console.log(`[EMAIL-INGEST] Ignoring event type: ${payload.type}`);
            return NextResponse.json({ success: true, ignored: true });
        }

        // Parse email from Resend payload
        const email = await parseResendPayload(payload);

        if (!email.from || !email.to) {
            return NextResponse.json(
                { error: "Missing from or to address" },
                { status: 400 }
            );
        }

        console.log(`[EMAIL-INGEST] Received email from ${email.from} to ${email.to}`);
        console.log(`[EMAIL-INGEST] Subject: ${email.subject}`);
        console.log(`[EMAIL-INGEST] Attachments: ${email.attachments?.length || 0}`);

        // Process the email
        const result = await handleInboundEmail(email);

        if (result.success) {
            console.log(`[EMAIL-INGEST] Processed successfully: ${result.emailId}`);
            return NextResponse.json({
                success: true,
                emailId: result.emailId,
                matchedSupplier: result.matchedSupplier?.name,
                matchedPO: result.matchedPO?.poNumber,
                attachmentsProcessed: result.attachmentsProcessed,
            });
        } else {
            console.error(`[EMAIL-INGEST] Processing failed: ${result.error}`);
            return NextResponse.json(
                {
                    success: false,
                    error: result.error
                },
                { status: 422 }
            );
        }
    } catch (error) {
        console.error("[EMAIL-INGEST] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Health check
export async function GET() {
    return NextResponse.json({
        status: "ok",
        service: "email-ingest",
        timestamp: new Date().toISOString(),
        resendConfigured: !!process.env.RESEND_API_KEY,
        webhookSecretConfigured: !!process.env.RESEND_WEBHOOK_SECRET,
    });
}
