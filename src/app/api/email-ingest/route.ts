/**
 * Email Ingest Webhook Endpoint
 * Receives inbound emails from Resend or similar services
 * 
 * POST /api/email-ingest
 */

import { NextRequest, NextResponse } from "next/server";
import { handleInboundEmail, type InboundEmail } from "@/lib/services/email-processor";

// Verify webhook signature (for Resend)
function verifySignature(request: NextRequest): boolean {
    const signature = request.headers.get("x-resend-signature");
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // If no secret configured, skip verification (dev mode)
    if (!webhookSecret) {
        console.warn("[EMAIL-INGEST] No webhook secret configured, skipping verification");
        return true;
    }

    // TODO: Implement proper HMAC verification when Resend provides this
    // For now, just check signature exists
    return !!signature;
}

/**
 * Parse multipart form data for email with attachments
 */
async function parseEmailFromRequest(request: NextRequest): Promise<InboundEmail | null> {
    try {
        const contentType = request.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            // JSON format (Resend webhook)
            const data = await request.json();

            return {
                from: data.from || data.sender || "",
                to: data.to || data.recipient || "",
                subject: data.subject || "",
                text: data.text || data.plain || "",
                html: data.html || "",
                attachments: data.attachments?.map((att: any) => ({
                    filename: att.filename || att.name || "attachment",
                    content: Buffer.from(att.content || att.data, "base64"),
                    contentType: att.contentType || att.type || "application/octet-stream",
                })),
            };
        }

        if (contentType.includes("multipart/form-data")) {
            // Multipart form (SendGrid-style)
            const formData = await request.formData();

            const attachments: InboundEmail["attachments"] = [];

            // Process attachment files
            for (const [key, value] of formData.entries()) {
                if (key.startsWith("attachment") && value instanceof Blob) {
                    const buffer = Buffer.from(await value.arrayBuffer());
                    attachments.push({
                        filename: (value as File).name || "attachment",
                        content: buffer,
                        contentType: value.type || "application/octet-stream",
                    });
                }
            }

            return {
                from: formData.get("from") as string || "",
                to: formData.get("to") as string || "",
                subject: formData.get("subject") as string || "",
                text: formData.get("text") as string || "",
                html: formData.get("html") as string || "",
                attachments,
            };
        }

        console.error("[EMAIL-INGEST] Unsupported content type:", contentType);
        return null;
    } catch (error) {
        console.error("[EMAIL-INGEST] Parse error:", error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    // Verify signature
    if (!verifySignature(request)) {
        return NextResponse.json(
            { error: "Invalid signature" },
            { status: 401 }
        );
    }

    // Parse email
    const email = await parseEmailFromRequest(request);

    if (!email) {
        return NextResponse.json(
            { error: "Could not parse email" },
            { status: 400 }
        );
    }

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
}

// Health check
export async function GET() {
    return NextResponse.json({
        status: "ok",
        service: "email-ingest",
        timestamp: new Date().toISOString(),
    });
}
