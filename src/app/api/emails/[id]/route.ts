/**
 * Email Actions API
 * Handles delete and manual process actions for emails
 * 
 * DELETE /api/emails/[id] - Delete an email
 * POST /api/emails/[id]/process - Manually process a pending email
 */

import { NextRequest, NextResponse } from "next/server";
import db from "@/db/drizzle";
import { emailIngestion, emailAttachment } from "@/db/schema";
import { eq } from "drizzle-orm";
import { processEmailQueue } from "@/lib/services/email-processor";

// Delete an email
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // First delete attachments
        await db.delete(emailAttachment)
            .where(eq(emailAttachment.emailIngestionId, id));

        // Then delete the email
        const [deleted] = await db.delete(emailIngestion)
            .where(eq(emailIngestion.id, id))
            .returning();

        if (!deleted) {
            return NextResponse.json(
                { error: "Email not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, deleted: deleted.id });
    } catch (error) {
        console.error("[API] Delete email error:", error);
        return NextResponse.json(
            { error: "Failed to delete email" },
            { status: 500 }
        );
    }
}
