"use server";

import db from "@/db/drizzle";
import { notification, user, supplier, purchaseOrder, milestone } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
    sendEmail,
    buildChaseReminderEmail,
    buildEscalationEmail,
    type ChaseReminderData,
    type EscalationData
} from "@/lib/services/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ============================================================================
// NOTIFICATION ACTIONS
// ============================================================================

interface SendChaseReminderInput {
    milestoneId: string;
    supplierId: string;
    purchaseOrderId: string;
    daysOverdue: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

/**
 * Send a chase reminder to a supplier
 */
export async function sendChaseReminder(input: SendChaseReminderInput) {
    try {
        // Get supplier and PO details
        const [supplierData, milestoneData, poData] = await Promise.all([
            db.query.supplier.findFirst({
                where: eq(supplier.id, input.supplierId),
            }),
            db.query.milestone.findFirst({
                where: eq(milestone.id, input.milestoneId),
            }),
            db.query.purchaseOrder.findFirst({
                where: eq(purchaseOrder.id, input.purchaseOrderId),
            }),
        ]);

        if (!supplierData?.userId || !milestoneData || !poData) {
            console.warn("[CHASE_REMINDER] Missing data, skipping notification");
            return { success: false, error: "Missing data" };
        }

        // Fetch user separately
        const supplierUser = await db.query.user.findFirst({
            where: eq(user.id, supplierData.userId),
        });

        if (!supplierUser?.email) {
            console.warn("[CHASE_REMINDER] Supplier has no email");
            return { success: false, error: "No email" };
        }

        // Build email
        const emailData: ChaseReminderData = {
            supplierName: supplierData.name || supplierUser.name || "Supplier",
            poNumber: poData.poNumber,
            milestoneTitle: milestoneData.title,
            daysOverdue: input.daysOverdue,
            riskLevel: input.riskLevel,
            updateUrl: `${APP_URL}/dashboard/supplier/pos/${poData.id}`,
        };

        const email = await buildChaseReminderEmail(emailData);
        email.to = supplierUser.email;

        // Send email
        const result = await sendEmail(email);

        if (result.success) {
            // Create in-app notification
            await db.insert(notification).values({
                userId: supplierData.userId,
                title: `Progress Update Required: ${poData.poNumber}`,
                message: `Please update milestone "${milestoneData.title}" - ${input.daysOverdue} days since last update`,
                type: "CHASE_REMINDER",
            });
        }

        return result;
    } catch (error: any) {
        console.error("[CHASE_REMINDER]", error);
        return { success: false, error: error.message };
    }
}

interface SendEscalationInput {
    milestoneId: string;
    supplierId: string;
    purchaseOrderId: string;
    escalationLevel: number;
    recipientUserId: string;
    daysOverdue: number;
}

/**
 * Send escalation notification to PM or executive
 */
export async function sendEscalationNotification(input: SendEscalationInput) {
    try {
        const [recipient, supplierData, milestoneData, poData] = await Promise.all([
            db.query.user.findFirst({
                where: eq(user.id, input.recipientUserId),
            }),
            db.query.supplier.findFirst({
                where: eq(supplier.id, input.supplierId),
            }),
            db.query.milestone.findFirst({
                where: eq(milestone.id, input.milestoneId),
            }),
            db.query.purchaseOrder.findFirst({
                where: eq(purchaseOrder.id, input.purchaseOrderId),
            }),
        ]);

        if (!recipient?.email || !milestoneData || !poData) {
            console.warn("[ESCALATION] Missing data, skipping notification");
            return { success: false, error: "Missing data" };
        }

        const emailData: EscalationData = {
            recipientName: recipient.name || "Manager",
            poNumber: poData.poNumber,
            milestoneTitle: milestoneData.title,
            supplierName: supplierData?.name || "Unknown Supplier",
            escalationLevel: input.escalationLevel,
            daysOverdue: input.daysOverdue,
            dashboardUrl: `${APP_URL}/dashboard/procurement/${poData.id}`,
        };

        const email = await buildEscalationEmail(emailData);
        email.to = recipient.email;

        const result = await sendEmail(email);

        if (result.success) {
            await db.insert(notification).values({
                userId: input.recipientUserId,
                title: `Escalation: ${poData.poNumber}`,
                message: `Supplier not responding - Level ${input.escalationLevel} escalation`,
                type: "ESCALATION",
            });
        }

        return result;
    } catch (error: any) {
        console.error("[ESCALATION]", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string) {
    try {
        const notifications = await db.query.notification.findMany({
            where: and(
                eq(notification.userId, userId),
                // readAt is null means unread
            ),
            orderBy: (n, { desc }) => [desc(n.createdAt)],
            limit: 20,
        });

        return { success: true, data: notifications };
    } catch (error: any) {
        console.error("[GET_NOTIFICATIONS]", error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(notificationIds: string[]) {
    try {
        await Promise.all(
            notificationIds.map(id =>
                db.update(notification)
                    .set({ readAt: new Date() })
                    .where(eq(notification.id, id))
            )
        );

        return { success: true };
    } catch (error: any) {
        console.error("[MARK_READ]", error);
        return { success: false, error: error.message };
    }
}
