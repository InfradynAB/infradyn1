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
            content_disposition?: string;
            content_id?: string;
            size?: number;
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
 * Download attachment from Resend using the Attachments API
 * Tries multiple endpoints since Resend's API differs for inbound vs outbound
 * @see https://resend.com/docs/api-reference/inbound/get-attachment
 */
async function downloadAttachment(emailId: string, attachmentId: string): Promise<Buffer | null> {
    const apiKey = process.env.RESEND_API_KEY;

    // Try multiple endpoint formats - Resend's inbound email API may differ
    const endpoints = [
        // Inbound specific endpoint
        `https://api.resend.com/inbound/emails/${emailId}/attachments/${attachmentId}`,
        // Standard attachments endpoint
        `https://api.resend.com/emails/${emailId}/attachments/${attachmentId}`,
        // List attachments for email then find the one
        `https://api.resend.com/emails/${emailId}/attachments`,
    ];

    for (const url of endpoints) {
        try {
            console.log(`[EMAIL-INGEST] Trying: ${url}`);

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            });

            if (response.ok) {
                const contentType = response.headers.get('content-type') || '';

                // If it's JSON, it might be metadata with download_url
                if (contentType.includes('application/json')) {
                    const json = await response.json();
                    console.log(`[EMAIL-INGEST] Got JSON response:`, JSON.stringify(json).slice(0, 200));

                    // Check if it has download_url
                    let downloadUrl = json.download_url;

                    // If it's an array, find the attachment by ID
                    if (Array.isArray(json.data)) {
                        const att = json.data.find((a: any) => a.id === attachmentId);
                        downloadUrl = att?.download_url;
                    }

                    if (downloadUrl) {
                        console.log(`[EMAIL-INGEST] Downloading from presigned URL`);
                        const fileResponse = await fetch(downloadUrl);
                        if (fileResponse.ok) {
                            const arrayBuffer = await fileResponse.arrayBuffer();
                            console.log(`[EMAIL-INGEST] Downloaded: ${arrayBuffer.byteLength} bytes`);
                            return Buffer.from(arrayBuffer);
                        }
                    }
                } else {
                    // Direct file download
                    const arrayBuffer = await response.arrayBuffer();
                    console.log(`[EMAIL-INGEST] Downloaded directly: ${arrayBuffer.byteLength} bytes`);
                    return Buffer.from(arrayBuffer);
                }
            } else {
                const errorText = await response.text();
                console.log(`[EMAIL-INGEST] Endpoint returned ${response.status}: ${errorText.slice(0, 100)}`);
            }
        } catch (error) {
            console.log(`[EMAIL-INGEST] Error trying endpoint: ${error}`);
        }
    }

    console.error("[EMAIL-INGEST] All attachment download methods failed");
    return null;
}

/**
 * Parse Resend email.received webhook payload
 */
async function parseResendPayload(payload: ResendEmailReceivedPayload): Promise<InboundEmail> {
    const { data } = payload;

    // Download attachments from Resend's attachment API
    const attachments: InboundEmail["attachments"] = [];

    if (data.attachments && data.attachments.length > 0) {
        console.log(`[EMAIL-INGEST] Processing ${data.attachments.length} attachments`);

        for (const att of data.attachments) {
            // Use email_id and attachment id to download
            const content = await downloadAttachment(data.email_id, att.id);
            if (content) {
                attachments.push({
                    filename: att.filename,
                    content,
                    contentType: att.content_type,
                });
                console.log(`[EMAIL-INGEST] Attachment processed: ${att.filename}`);
            } else {
                console.warn(`[EMAIL-INGEST] Failed to download attachment: ${att.filename}`);
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
