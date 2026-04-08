"use server";

/**
 * Support Ticketing Actions
 *
 * Covers:
 *  - Any authenticated user can raise a ticket
 *  - Users can view only their own tickets (unless SUPER_ADMIN)
 *  - Users and support agents can post messages on a ticket
 *  - SUPER_ADMIN can view all tickets, respond, update status and assign
 */

import db from "@/db/drizzle";
import {
    supportTicket,
    supportTicketMessage,
    user,
} from "@/db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getActiveOrganizationId } from "@/lib/utils/org-context";
import { logAuditEvent } from "@/lib/audit/log-audit-event";
import {
    sendTicketCreatedToUser,
    sendTicketAdminNotify,
    sendTicketResponseToUser,
} from "@/lib/services/email";

// ─────────────────────────────────────────────────────────────────────────────
// Types & labels (re-exported from the non-server constants module)
// ─────────────────────────────────────────────────────────────────────────────
export type { TicketCategory, TicketPriority, TicketStatus } from "./support-constants";
import type { TicketCategory, TicketPriority, TicketStatus } from "./support-constants";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "./support-constants";

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper
// ─────────────────────────────────────────────────────────────────────────────

async function requireAuth() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthenticated");
    return session.user;
}

async function requireSuperAdmin() {
    const u = await requireAuth();
    if (u.role !== "SUPER_ADMIN") throw new Error("Forbidden: SUPER_ADMIN only");
    return u;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticket number generator
// ─────────────────────────────────────────────────────────────────────────────

async function generateTicketNumber(): Promise<string> {
    const count = await db.$count(supportTicket);
    const next = (count ?? 0) + 1;
    return `TKT-${String(next).padStart(5, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create a new support ticket
// ─────────────────────────────────────────────────────────────────────────────

export async function createSupportTicket(formData: FormData): Promise<{ success: boolean; ticketId?: string; error?: string }> {
    try {
        const currentUser = await requireAuth();
        const orgId = await getActiveOrganizationId();

        const subject = (formData.get("subject") as string)?.trim();
        const description = (formData.get("description") as string)?.trim();
        const category = (formData.get("category") as TicketCategory) ?? "GENERAL";
        const priority = (formData.get("priority") as TicketPriority) ?? "MEDIUM";
        const attachmentUrl = formData.get("attachmentUrl") as string | null;
        const attachmentName = formData.get("attachmentName") as string | null;

        if (!subject || !description) {
            return { success: false, error: "Subject and description are required." };
        }

        const ticketNumber = await generateTicketNumber();

        const ticket = await db.transaction(async (tx) => {
            const [createdTicket] = await tx
                .insert(supportTicket)
                .values({
                    ticketNumber,
                    raisedBy: currentUser.id,
                    organizationId: orgId ?? undefined,
                    category,
                    priority,
                    status: "OPEN",
                    subject,
                    description,
                    lastActivityAt: new Date(),
                })
                .returning();

            if (attachmentUrl && attachmentName) {
                await tx.insert(supportTicketMessage).values({
                    ticketId: createdTicket.id,
                    senderId: currentUser.id,
                    content: description,
                    isFromSupport: false,
                    isInternal: false,
                    attachmentUrl,
                    attachmentName,
                    attachmentType: formData.get("attachmentType") as string | null ?? undefined,
                });
            }

            await logAuditEvent({
                executor: tx,
                action: "support_ticket.created",
                entityType: "support_ticket",
                entityId: createdTicket.id,
                organizationId: createdTicket.organizationId ?? orgId ?? null,
                actor: {
                    id: currentUser.id,
                    name: currentUser.name,
                    email: currentUser.email,
                    role: currentUser.role,
                },
                target: {
                    entityType: "support_ticket",
                    entityId: createdTicket.id,
                    label: createdTicket.ticketNumber,
                    userId: createdTicket.raisedBy,
                },
                sourceModule: "support-actions",
                metadata: {
                    ticketNumber: createdTicket.ticketNumber,
                    category,
                    priority,
                    status: "OPEN",
                    subject,
                    hasAttachment: Boolean(attachmentUrl && attachmentName),
                },
            });

            return createdTicket;
        });

        // ── Emails ────────────────────────────────────────────────────────────
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

        // 1. Confirm to the user who raised it
        await sendTicketCreatedToUser({
            to: currentUser.email,
            userName: currentUser.name,
            ticketNumber,
            subject,
            category: CATEGORY_LABELS[category] ?? category,
            priority: PRIORITY_LABELS[priority] ?? priority,
            ticketUrl: `${appUrl}/dashboard/support/${ticket.id}`,
        });

        // 2. Notify all super admins
        const superAdmins = await db.query.user.findMany({
            where: and(eq(user.role, "SUPER_ADMIN"), eq(user.isDeleted, false)),
            columns: { email: true, name: true },
        });

        if (superAdmins.length > 0) {
            await sendTicketAdminNotify({
                to: superAdmins.map((a) => a.email),
                ticketNumber,
                subject,
                category: CATEGORY_LABELS[category] ?? category,
                priority: PRIORITY_LABELS[priority] ?? priority,
                raisedByName: currentUser.name,
                raisedByEmail: currentUser.email,
                description: description.slice(0, 300) + (description.length > 300 ? "…" : ""),
                ticketUrl: `${appUrl}/dashboard/support/${ticket.id}`,
            });
        }

        revalidatePath("/dashboard/support");
        return { success: true, ticketId: ticket.id };
    } catch (err: unknown) {
        console.error("[SUPPORT] createSupportTicket:", err);
        return { success: false, error: err instanceof Error ? err.message : "Failed to create ticket." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get current user's own tickets
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyTickets() {
    const currentUser = await requireAuth();

    const tickets = await db.query.supportTicket.findMany({
        where: and(
            eq(supportTicket.raisedBy, currentUser.id),
            eq(supportTicket.isDeleted, false)
        ),
        with: {
            messages: {
                where: and(
                    eq(supportTicketMessage.isDeleted, false),
                    eq(supportTicketMessage.isInternal, false)
                ),
                orderBy: [desc(supportTicketMessage.createdAt)],
                limit: 1,
            },
        },
        orderBy: [desc(supportTicket.lastActivityAt)],
    });

    return tickets;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get a single ticket with full message thread
// ─────────────────────────────────────────────────────────────────────────────

export type TicketWithThread = NonNullable<Awaited<ReturnType<typeof getTicketWithThread>>>;

export async function getTicketWithThread(ticketId: string) {
    const currentUser = await requireAuth();

    const ticket = await db.query.supportTicket.findFirst({
        where: and(eq(supportTicket.id, ticketId), eq(supportTicket.isDeleted, false)),
        with: {
            raiser: true,
            assignee: true,
            messages: {
                where: eq(supportTicketMessage.isDeleted, false),
                with: { sender: true },
                orderBy: [asc(supportTicketMessage.createdAt)],
            },
        },
    });

    if (!ticket) return null;

    // Non-super-admins can only see their own tickets
    if (currentUser.role !== "SUPER_ADMIN" && ticket.raisedBy !== currentUser.id) {
        return null;
    }

    // Filter internal notes for non-admins
    if (currentUser.role !== "SUPER_ADMIN") {
        const filtered = {
            ...ticket,
            messages: ticket.messages.filter((m) => !m.isInternal),
        };
        return filtered;
    }

    return ticket;
}

// ─────────────────────────────────────────────────────────────────────────────
// Post a reply on a ticket (user or support)
// ─────────────────────────────────────────────────────────────────────────────

export async function addTicketReply(formData: FormData): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = await requireAuth();
        const ticketId = formData.get("ticketId") as string;
        const content = (formData.get("content") as string)?.trim();
        const isInternal = formData.get("isInternal") === "true"; // super admin only
        const attachmentUrl = formData.get("attachmentUrl") as string | null;
        const attachmentName = formData.get("attachmentName") as string | null;

        if (!content) return { success: false, error: "Message cannot be empty." };

        const ticket = await db.query.supportTicket.findFirst({
            where: and(eq(supportTicket.id, ticketId), eq(supportTicket.isDeleted, false)),
            with: { raiser: true },
        });

        if (!ticket) return { success: false, error: "Ticket not found." };

        // Permission check
        if (currentUser.role !== "SUPER_ADMIN" && ticket.raisedBy !== currentUser.id) {
            return { success: false, error: "Access denied." };
        }

        const isFromSupport = currentUser.role === "SUPER_ADMIN";

        const newStatus: TicketStatus = isFromSupport
            ? (ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status) as TicketStatus
            : "OPEN"; // user replied — reopen from AWAITING_USER

        await db.transaction(async (tx) => {
            const [message] = await tx.insert(supportTicketMessage).values({
                ticketId,
                senderId: currentUser.id,
                content,
                isFromSupport,
                isInternal: isFromSupport ? isInternal : false,
                attachmentUrl: attachmentUrl ?? undefined,
                attachmentName: attachmentName ?? undefined,
                attachmentType: formData.get("attachmentType") as string | null ?? undefined,
            }).returning();

            await tx
                .update(supportTicket)
                .set({
                    lastActivityAt: new Date(),
                    status: newStatus,
                    updatedAt: new Date(),
                })
                .where(eq(supportTicket.id, ticketId));

            await logAuditEvent({
                executor: tx,
                action: isFromSupport
                    ? (isInternal ? "support_ticket.internal_reply_added" : "support_ticket.reply_added_by_support")
                    : "support_ticket.reply_added_by_user",
                entityType: "support_ticket",
                entityId: ticketId,
                organizationId: ticket.organizationId ?? null,
                actor: {
                    id: currentUser.id,
                    name: currentUser.name,
                    email: currentUser.email,
                    role: currentUser.role,
                },
                target: {
                    entityType: "support_ticket",
                    entityId: ticketId,
                    label: ticket.ticketNumber,
                    userId: ticket.raisedBy,
                },
                sourceModule: "support-actions",
                metadata: {
                    messageId: message.id,
                    previousStatus: ticket.status,
                    newStatus,
                    isFromSupport,
                    isInternal: isFromSupport ? isInternal : false,
                    hasAttachment: Boolean(attachmentUrl && attachmentName),
                    attachmentName: attachmentName ?? null,
                    contentPreview: content.slice(0, 200),
                },
            });
        });

        // ── Email: notify user when support responds ──────────────────────────
        if (isFromSupport && !isInternal && ticket.raiser) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
            await sendTicketResponseToUser({
                to: ticket.raiser.email,
                userName: ticket.raiser.name,
                ticketNumber: ticket.ticketNumber,
                subject: ticket.subject,
                responsePreview: content.slice(0, 300) + (content.length > 300 ? "…" : ""),
                ticketUrl: `${appUrl}/dashboard/support/${ticketId}`,
            });
        }

        revalidatePath(`/dashboard/support/${ticketId}`);
        revalidatePath("/dashboard/support");
        return { success: true };
    } catch (err: unknown) {
        console.error("[SUPPORT] addTicketReply:", err);
        return { success: false, error: err instanceof Error ? err.message : "Failed to send reply." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN: Get all tickets
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllTickets(statusFilter?: TicketStatus) {
    await requireSuperAdmin();

    const tickets = await db.query.supportTicket.findMany({
        where: and(
            eq(supportTicket.isDeleted, false),
            statusFilter ? eq(supportTicket.status, statusFilter) : undefined
        ),
        with: {
            raiser: { columns: { id: true, name: true, email: true, role: true } },
            assignee: { columns: { id: true, name: true } },
            messages: {
                where: eq(supportTicketMessage.isDeleted, false),
                orderBy: [desc(supportTicketMessage.createdAt)],
                limit: 1,
            },
        },
        orderBy: [desc(supportTicket.lastActivityAt)],
    });

    return tickets;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN: Update ticket status
// ─────────────────────────────────────────────────────────────────────────────

export async function updateTicketStatus(
    ticketId: string,
    status: TicketStatus
): Promise<{ success: boolean; error?: string }> {
    try {
        const admin = await requireSuperAdmin();
        const existingTicket = await db.query.supportTicket.findFirst({
            where: and(eq(supportTicket.id, ticketId), eq(supportTicket.isDeleted, false)),
            columns: {
                id: true,
                ticketNumber: true,
                organizationId: true,
                status: true,
                raisedBy: true,
            },
        });

        if (!existingTicket) {
            return { success: false, error: "Ticket not found." };
        }

        const updates: Partial<typeof supportTicket.$inferInsert> = {
            status,
            updatedAt: new Date(),
        };

        if (status === "RESOLVED") updates.resolvedAt = new Date();
        if (status === "CLOSED") updates.closedAt = new Date();

        await db.transaction(async (tx) => {
            await tx
                .update(supportTicket)
                .set(updates)
                .where(eq(supportTicket.id, ticketId));

            await logAuditEvent({
                executor: tx,
                action: "support_ticket.status_changed",
                entityType: "support_ticket",
                entityId: ticketId,
                organizationId: existingTicket.organizationId ?? null,
                actor: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                },
                target: {
                    entityType: "support_ticket",
                    entityId: ticketId,
                    label: existingTicket.ticketNumber,
                    userId: existingTicket.raisedBy,
                },
                sourceModule: "support-actions",
                metadata: {
                    previousStatus: existingTicket.status,
                    newStatus: status,
                },
            });
        });

        revalidatePath(`/dashboard/support/${ticketId}`);
        revalidatePath("/dashboard/support");
        return { success: true };
    } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : "Failed to update ticket status." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN: Assign ticket to a super admin
// ─────────────────────────────────────────────────────────────────────────────

export async function assignTicket(
    ticketId: string,
    assignToUserId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const admin = await requireSuperAdmin();
        const existingTicket = await db.query.supportTicket.findFirst({
            where: and(eq(supportTicket.id, ticketId), eq(supportTicket.isDeleted, false)),
            columns: {
                id: true,
                ticketNumber: true,
                organizationId: true,
                assignedTo: true,
                raisedBy: true,
            },
        });

        if (!existingTicket) {
            return { success: false, error: "Ticket not found." };
        }

        await db.transaction(async (tx) => {
            await tx
                .update(supportTicket)
                .set({ assignedTo: assignToUserId, updatedAt: new Date() })
                .where(eq(supportTicket.id, ticketId));

            await logAuditEvent({
                executor: tx,
                action: "support_ticket.assignment_changed",
                entityType: "support_ticket",
                entityId: ticketId,
                organizationId: existingTicket.organizationId ?? null,
                actor: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                },
                target: {
                    entityType: "support_ticket",
                    entityId: ticketId,
                    label: existingTicket.ticketNumber,
                    userId: existingTicket.raisedBy,
                },
                sourceModule: "support-actions",
                metadata: {
                    previousAssignedTo: existingTicket.assignedTo ?? null,
                    assignedTo: assignToUserId,
                },
            });
        });

        revalidatePath(`/dashboard/support/${ticketId}`);
        return { success: true };
    } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : "Failed to assign ticket." };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN: Dashboard stats
// ─────────────────────────────────────────────────────────────────────────────

export async function getSupportStats() {
    await requireSuperAdmin();

    const all = await db.query.supportTicket.findMany({
        where: eq(supportTicket.isDeleted, false),
        columns: { status: true, priority: true, createdAt: true },
    });

    return {
        total: all.length,
        open: all.filter((t) => t.status === "OPEN").length,
        inProgress: all.filter((t) => t.status === "IN_PROGRESS").length,
        awaitingUser: all.filter((t) => t.status === "AWAITING_USER").length,
        resolved: all.filter((t) => t.status === "RESOLVED").length,
        closed: all.filter((t) => t.status === "CLOSED").length,
        urgent: all.filter((t) => t.priority === "URGENT" && !["RESOLVED", "CLOSED"].includes(t.status ?? "")).length,
    };
}
