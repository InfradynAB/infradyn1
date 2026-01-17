"use server";

/**
 * Email Ingestion Server Actions
 * Fetch and manage inbound email data for UI display
 */

import db from "@/db/drizzle";
import { emailIngestion, emailAttachment, member } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@/auth";
import { headers } from "next/headers";

// Helper to get session and organizationId
async function getAuthContext() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
        return { session: null, organizationId: null };
    }

    // Fetch organizationId from member table
    const membership = await db.query.member.findFirst({
        where: eq(member.userId, session.user.id),
    });

    return { session, organizationId: membership?.organizationId || null };
}

interface EmailIngestionItem {
    id: string;
    fromEmail: string;
    subject: string;
    status: string;
    matchedSupplierName?: string;
    matchedPoNumber?: string;
    attachmentCount: number;
    createdAt: string;
    processedAt?: string;
}

export async function listEmailIngestions(limit: number = 20): Promise<{
    success: boolean;
    data: EmailIngestionItem[];
    error?: string;
}> {
    try {
        const { organizationId } = await getAuthContext();
        if (!organizationId) {
            return { success: false, data: [], error: "Unauthorized" };
        }

        const emails = await db.query.emailIngestion.findMany({
            where: eq(emailIngestion.organizationId, organizationId),
            with: {
                matchedSupplier: true,
                matchedPo: true,
                attachments: true,
            },
            orderBy: [desc(emailIngestion.createdAt)],
            limit,
        });

        return {
            success: true,
            data: emails.map(e => ({
                id: e.id,
                fromEmail: e.fromEmail,
                subject: e.subject || "(No Subject)",
                status: e.status,
                matchedSupplierName: e.matchedSupplier?.name,
                matchedPoNumber: e.matchedPo?.poNumber,
                attachmentCount: e.attachments?.length || 0,
                createdAt: e.createdAt?.toISOString() || "",
                processedAt: e.processedAt?.toISOString(),
            })),
        };
    } catch (error) {
        console.error("[LIST EMAILS] Error:", error);
        return { success: false, data: [], error: "Failed to fetch emails" };
    }
}

export async function getEmailIngestionStats(): Promise<{
    total: number;
    pending: number;
    processed: number;
    failed: number;
}> {
    try {
        const { organizationId } = await getAuthContext();
        if (!organizationId) {
            return { total: 0, pending: 0, processed: 0, failed: 0 };
        }

        const emails = await db.query.emailIngestion.findMany({
            where: eq(emailIngestion.organizationId, organizationId),
            columns: { status: true },
        });

        return {
            total: emails.length,
            pending: emails.filter(e => e.status === "PENDING" || e.status === "PROCESSING").length,
            processed: emails.filter(e => e.status === "PROCESSED").length,
            failed: emails.filter(e => e.status === "FAILED").length,
        };
    } catch {
        return { total: 0, pending: 0, processed: 0, failed: 0 };
    }
}

