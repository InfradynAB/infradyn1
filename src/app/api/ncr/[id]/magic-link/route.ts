import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { ncrMagicLink, ncr, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: ncrId } = await params;

        // Get NCR with supplier info
        const ncrData = await db.query.ncr.findFirst({
            where: eq(ncr.id, ncrId),
            with: {
                supplier: true,
                purchaseOrder: true,
            },
        });

        if (!ncrData) {
            return NextResponse.json({ error: "NCR not found" }, { status: 404 });
        }

        if (!ncrData.supplier) {
            return NextResponse.json(
                { error: "No supplier associated with this NCR" },
                { status: 400 }
            );
        }

        const supplierEmail = ncrData.supplier.contactEmail;
        if (!supplierEmail) {
            return NextResponse.json(
                { error: "Supplier has no email address" },
                { status: 400 }
            );
        }

        // Generate secure token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create magic link record
        const [magicLink] = await db.insert(ncrMagicLink).values({
            ncrId,
            supplierId: ncrData.supplier.id,
            token,
            expiresAt,
            actionsCount: 0,
        }).returning();

        // Build the magic link URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const magicLinkUrl = `${baseUrl}/ncr/respond/${token}`;

        // Log the action
        await db.insert(auditLog).values({
            entityType: "NCR",
            entityId: ncrId,
            action: "MAGIC_LINK_SENT",
            userId: session.user.id,
            metadata: JSON.stringify({
                sentTo: supplierEmail,
                magicLinkId: magicLink.id,
            }),
        });

        // Update NCR status if it was OPEN
        if (ncrData.status === "OPEN") {
            await db.update(ncr)
                .set({ status: "REVIEW" })
                .where(eq(ncr.id, ncrId));
        }

        // Note: Email sending would be integrated with your email service
        // For now, return the magic link URL for manual sharing or testing
        console.log(`[NCR_MAGIC_LINK] Link generated for ${supplierEmail}: ${magicLinkUrl}`);

        return NextResponse.json({
            success: true,
            data: {
                magicLinkId: magicLink.id,
                expiresAt,
                sentTo: supplierEmail,
                // Include URL for development/testing
                magicLinkUrl: process.env.NODE_ENV === "development" ? magicLinkUrl : undefined,
            },
            message: `Magic link generated for ${supplierEmail}`,
        });
    } catch (error) {
        console.error("[NCR_MAGIC_LINK]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to send magic link" },
            { status: 500 }
        );
    }
}
