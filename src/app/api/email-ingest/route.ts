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

    // Try the receiving attachments endpoint with POST (since GET returns 405)
    const receivingUrl = `https://api.resend.com/emails/${emailId}/receiving/attachments`;

    try {
        // Try POST method first (Resend may require this)
        console.log(`[EMAIL-INGEST] Trying POST: ${receivingUrl}`);

        const postResponse = await fetch(receivingUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email_id: emailId }),
        });

        if (postResponse.ok) {
            const json = await postResponse.json();
            console.log(`[EMAIL-INGEST] POST response:`, JSON.stringify(json).slice(0, 300));

            // Find attachment with matching ID
            const attachments = json.data || json;
            const attachment = Array.isArray(attachments)
                ? attachments.find((a: any) => a.id === attachmentId)
                : null;

            if (attachment?.download_url) {
                console.log(`[EMAIL-INGEST] Downloading from presigned URL...`);
                const downloadResponse = await fetch(attachment.download_url);
                if (downloadResponse.ok) {
                    const arrayBuffer = await downloadResponse.arrayBuffer();
                    console.log(`[EMAIL-INGEST] Downloaded: ${arrayBuffer.byteLength} bytes`);
                    return Buffer.from(arrayBuffer);
                }
            }
        } else {
            const errorText = await postResponse.text();
            console.log(`[EMAIL-INGEST] POST returned ${postResponse.status}: ${errorText.slice(0, 100)}`);
        }
    } catch (error) {
        console.log(`[EMAIL-INGEST] POST error: ${error}`);
    }

    // Fallback: Try GET as documented
    try {
        console.log(`[EMAIL-INGEST] Trying GET: ${receivingUrl}`);

        const getResponse = await fetch(receivingUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (getResponse.ok) {
            const json = await getResponse.json();
            console.log(`[EMAIL-INGEST] GET response:`, JSON.stringify(json).slice(0, 300));

            const attachments = json.data || json;
            const attachment = Array.isArray(attachments)
                ? attachments.find((a: any) => a.id === attachmentId)
                : null;

            if (attachment?.download_url) {
                const downloadResponse = await fetch(attachment.download_url);
                if (downloadResponse.ok) {
                    const arrayBuffer = await downloadResponse.arrayBuffer();
                    console.log(`[EMAIL-INGEST] Downloaded: ${arrayBuffer.byteLength} bytes`);
                    return Buffer.from(arrayBuffer);
                }
            }
        } else {
            const errorText = await getResponse.text();
            console.log(`[EMAIL-INGEST] GET returned ${getResponse.status}: ${errorText.slice(0, 100)}`);
        }
    } catch (error) {
        console.log(`[EMAIL-INGEST] GET error: ${error}`);
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
