"use server";

import db from "@/db/drizzle";
import { ncrComment, ncrMagicLink, ncr, auditLog, supplier, user, project } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import crypto from "crypto";
import { sendNCRResponseNotification, sendNCRCommentNotification } from "@/lib/services/email";

// ============================================================================
// TYPES
// ============================================================================

interface AddCommentInput {
    ncrId: string;
    userId?: string; // Optional if via magic link
    magicLinkToken?: string;
    content?: string;
    attachmentUrls?: string[];
    voiceNoteUrl?: string;
    authorRole: string;
    isInternal?: boolean;
    authorName?: string; // For display in emails
}

interface CreateMagicLinkInput {
    ncrId: string;
    supplierId: string;
    expiresInHours?: number;
}

// ============================================================================
// COMMENT MANAGEMENT
// ============================================================================

/**
 * Add a comment to an NCR thread
 */
export async function addComment(input: AddCommentInput) {
    try {
        // Validate that either userId or magicLinkToken is provided
        if (!input.userId && !input.magicLinkToken) {
            return { success: false, error: "Either userId or magicLinkToken is required" };
        }

        // Validate content
        if (!input.content && !input.attachmentUrls?.length && !input.voiceNoteUrl) {
            return { success: false, error: "Comment must have content, attachments, or voice note" };
        }

        // If via magic link, validate the token
        if (input.magicLinkToken) {
            const linkValid = await validateMagicLink(input.magicLinkToken, input.ncrId);
            if (!linkValid.success) {
                return { success: false, error: linkValid.error };
            }
        }

        const [newComment] = await db.insert(ncrComment).values({
            ncrId: input.ncrId,
            userId: input.userId,
            magicLinkToken: input.magicLinkToken,
            content: input.content,
            attachmentUrls: input.attachmentUrls,
            voiceNoteUrl: input.voiceNoteUrl,
            authorRole: input.authorRole,
            isInternal: input.isInternal || false,
        }).returning();

        // Get NCR data for status update and email notification
        const existingNCR = await db.query.ncr.findFirst({
            where: eq(ncr.id, input.ncrId),
            with: {
                supplier: true,
                project: true,
            },
        });

        // Update NCR status if supplier responded
        if (input.authorRole === "SUPPLIER") {
            if (existingNCR?.status === "OPEN") {
                await db.update(ncr)
                    .set({ status: "SUPPLIER_RESPONDED", updatedAt: new Date() })
                    .where(eq(ncr.id, input.ncrId));
            }
        }

        // Log audit
        await db.insert(auditLog).values({
            userId: input.userId || "MAGIC_LINK",
            action: "NCR_COMMENT_ADDED",
            entityType: "NCR_COMMENT",
            entityId: newComment.id,
            metadata: JSON.stringify({
                ncrId: input.ncrId,
                hasAttachments: !!input.attachmentUrls?.length,
                hasVoiceNote: !!input.voiceNoteUrl,
                isInternal: input.isInternal,
            }),
        });

        // Send email notifications (only for non-internal comments)
        if (!input.isInternal && existingNCR) {
            await sendNCRCommentEmailNotification({
                ncrId: input.ncrId,
                ncrNumber: existingNCR.ncrNumber,
                ncrTitle: existingNCR.title,
                severity: existingNCR.severity as "MINOR" | "MAJOR" | "CRITICAL",
                projectName: existingNCR.project?.name || "Project",
                supplierId: existingNCR.supplierId,
                supplierName: existingNCR.supplier?.name || "Supplier",
                supplierEmail: existingNCR.supplier?.contactEmail,
                reportedBy: existingNCR.reportedBy,
                authorRole: input.authorRole,
                authorName: input.authorName,
                userId: input.userId,
                commentContent: input.content || "",
                hasAttachments: !!input.attachmentUrls?.length,
                hasVoiceNote: !!input.voiceNoteUrl,
            });
        }

        return { success: true, data: newComment };
    } catch (error) {
        console.error("[ADD_COMMENT]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to add comment" };
    }
}

/**
 * Get comment thread for an NCR
 */
export async function getCommentThread(ncrId: string, includeInternal = false) {
    try {
        const comments = await db.query.ncrComment.findMany({
            where: includeInternal
                ? eq(ncrComment.ncrId, ncrId)
                : and(eq(ncrComment.ncrId, ncrId), eq(ncrComment.isInternal, false)),
            orderBy: [desc(ncrComment.createdAt)],
            with: {
                user: true,
            },
        });

        return { success: true, data: comments };
    } catch (error) {
        console.error("[GET_COMMENT_THREAD]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch comments", data: [] };
    }
}

// ============================================================================
// MAGIC LINK MANAGEMENT
// ============================================================================

/**
 * Generate a secure magic link token
 */
function generateSecureToken(): string {
    return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a magic link for supplier access
 */
export async function createMagicLink(input: CreateMagicLinkInput) {
    try {
        const token = generateSecureToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (input.expiresInHours || 72)); // Default 3 days

        const [link] = await db.insert(ncrMagicLink).values({
            ncrId: input.ncrId,
            supplierId: input.supplierId,
            token,
            expiresAt,
        }).returning();

        const magicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/ncr/reply?token=${token}`;

        return {
            success: true,
            data: {
                ...link,
                magicUrl,
            }
        };
    } catch (error) {
        console.error("[CREATE_MAGIC_LINK]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to create magic link" };
    }
}

/**
 * Validate a magic link token
 */
export async function validateMagicLink(token: string, ncrId: string) {
    try {
        const link = await db.query.ncrMagicLink.findFirst({
            where: and(
                eq(ncrMagicLink.token, token),
                eq(ncrMagicLink.ncrId, ncrId),
            ),
        });

        if (!link) {
            return { success: false, error: "Invalid or expired link" };
        }

        if (new Date(link.expiresAt) < new Date()) {
            return { success: false, error: "Link has expired" };
        }

        // Mark as viewed if first time
        if (!link.viewedAt) {
            await db.update(ncrMagicLink)
                .set({ viewedAt: new Date() })
                .where(eq(ncrMagicLink.id, link.id));

            // Log audit
            await db.insert(auditLog).values({
                userId: "MAGIC_LINK",
                action: "NCR_MAGIC_LINK_VIEWED",
                entityType: "NCR_MAGIC_LINK",
                entityId: link.id,
                metadata: JSON.stringify({ ncrId, supplierId: link.supplierId }),
            });
        }

        return { success: true, data: link };
    } catch (error) {
        console.error("[VALIDATE_MAGIC_LINK]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to validate link" };
    }
}

/**
 * Record action on magic link (for audit trail)
 */
export async function recordMagicLinkAction(token: string) {
    try {
        const link = await db.query.ncrMagicLink.findFirst({
            where: eq(ncrMagicLink.token, token),
        });

        if (!link) return;

        await db.update(ncrMagicLink)
            .set({
                lastActionAt: new Date(),
                actionsCount: (link.actionsCount || 0) + 1,
            })
            .where(eq(ncrMagicLink.id, link.id));
    } catch (error) {
        console.error("[RECORD_MAGIC_LINK_ACTION]", error);
    }
}

/**
 * Get NCR details via magic link (supplier-safe view)
 */
export async function getNCRViaMagicLink(token: string) {
    try {
        const link = await db.query.ncrMagicLink.findFirst({
            where: eq(ncrMagicLink.token, token),
            with: {
                ncr: {
                    with: {
                        purchaseOrder: true,
                        affectedBoqItem: true,
                        comments: {
                            where: eq(ncrComment.isInternal, false),
                            orderBy: [desc(ncrComment.createdAt)],
                        },
                        attachments: true,
                    },
                },
            },
        });

        if (!link) {
            return { success: false, error: "Invalid link" };
        }

        if (new Date(link.expiresAt) < new Date()) {
            return { success: false, error: "Link has expired" };
        }

        return { success: true, data: link.ncr, supplierId: link.supplierId };
    } catch (error) {
        console.error("[GET_NCR_VIA_MAGIC_LINK]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch NCR" };
    }
}

// ============================================================================
// EMAIL NOTIFICATION HELPERS
// ============================================================================

interface NCRCommentEmailContext {
    ncrId: string;
    ncrNumber: string;
    ncrTitle: string;
    severity: "MINOR" | "MAJOR" | "CRITICAL";
    projectName: string;
    supplierId: string;
    supplierName: string;
    supplierEmail?: string | null;
    reportedBy: string;
    authorRole: string;
    authorName?: string;
    userId?: string;
    commentContent: string;
    hasAttachments: boolean;
    hasVoiceNote: boolean;
}

/**
 * Send email notification when a comment is added to NCR thread
 * - If supplier comments → notify PM (reportedBy)
 * - If PM/QA comments → notify supplier
 */
async function sendNCRCommentEmailNotification(context: NCRCommentEmailContext) {
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    try {
        // Get commenter name
        let commenterName = context.authorName || context.authorRole;
        if (context.userId && !context.authorName) {
            const commenterUser = await db.query.user.findFirst({
                where: eq(user.id, context.userId),
            });
            commenterName = commenterUser?.name || context.authorRole;
        }

        if (context.authorRole === "SUPPLIER") {
            // Supplier commented → notify PM
            const pmUser = await db.query.user.findFirst({
                where: eq(user.id, context.reportedBy),
            });

            if (!pmUser?.email) {
                console.warn(`[NCR_COMMENT_EMAIL] No email for PM ${context.reportedBy}`);
                return;
            }

            // First response from supplier - send the response-specific email
            await sendNCRResponseNotification(pmUser.email, {
                recipientName: pmUser.name,
                ncrNumber: context.ncrNumber,
                supplierName: context.supplierName,
                responsePreview: context.commentContent,
                hasAttachments: context.hasAttachments,
                hasVoiceNote: context.hasVoiceNote,
                dashboardUrl: `${APP_URL}/dashboard/ncr?id=${context.ncrId}`,
            });

            console.log(`[NCR_COMMENT_EMAIL] Sent supplier response notification to ${pmUser.email}`);
        } else {
            // PM/QA/internal user commented → notify supplier
            // Get supplier's email (contact email or linked user)
            let supplierEmail = context.supplierEmail;

            if (!supplierEmail) {
                const supplierData = await db.query.supplier.findFirst({
                    where: eq(supplier.id, context.supplierId),
                });
                supplierEmail = supplierData?.contactEmail;

                // Try linked user
                if (!supplierEmail && supplierData?.userId) {
                    const supplierUser = await db.query.user.findFirst({
                        where: eq(user.id, supplierData.userId),
                    });
                    supplierEmail = supplierUser?.email;
                }
            }

            if (!supplierEmail) {
                console.warn(`[NCR_COMMENT_EMAIL] No email for supplier ${context.supplierId}`);
                return;
            }

            // Create magic link for easy response
            const magicLinkResult = await createMagicLink({
                ncrId: context.ncrId,
                supplierId: context.supplierId,
                expiresInHours: 72,
            });

            const responseUrl = magicLinkResult.success && magicLinkResult.data
                ? magicLinkResult.data.magicUrl
                : `${APP_URL}/ncr/reply?ncrId=${context.ncrId}`;

            await sendNCRCommentNotification(supplierEmail, {
                recipientName: context.supplierName,
                ncrNumber: context.ncrNumber,
                ncrTitle: context.ncrTitle,
                severity: context.severity,
                commenterName,
                commenterRole: context.authorRole,
                commentPreview: context.commentContent,
                hasAttachments: context.hasAttachments,
                hasVoiceNote: context.hasVoiceNote,
                projectName: context.projectName,
                responseUrl,
                isSupplierRecipient: true,
            });

            console.log(`[NCR_COMMENT_EMAIL] Sent comment notification to supplier at ${supplierEmail}`);
        }
    } catch (error) {
        // Don't fail the comment if email fails
        console.error("[NCR_COMMENT_EMAIL] Failed to send notification:", error);
    }
}
