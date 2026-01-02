/**
 * Email Service
 * Handles transactional email sending via Resend
 */

import { render } from "@react-email/render";
import ChaseReminderEmail, { type ChaseReminderEmailProps } from "@/emails/chase-reminder-email";
import EscalationEmail, { type EscalationEmailProps } from "@/emails/escalation-email";

// Email configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "notifications@infradyn.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export interface EmailPayload {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
    if (!RESEND_API_KEY) {
        console.warn("[EMAIL] No RESEND_API_KEY configured, skipping email send");
        return { success: true }; // Don't fail in dev without API key
    }

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: payload.to,
                subject: payload.subject,
                html: payload.html,
                text: payload.text,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("[EMAIL] Send failed:", error);
            return { success: false, error };
        }

        console.log(`[EMAIL] Sent to ${Array.isArray(payload.to) ? payload.to.join(", ") : payload.to}`);
        return { success: true };
    } catch (error: any) {
        console.error("[EMAIL] Error:", error);
        return { success: false, error: error.message };
    }
}



export type ChaseReminderData = ChaseReminderEmailProps;
export type EscalationData = EscalationEmailProps;


/**
 * Build chase reminder email using React Email template
 */
export async function buildChaseReminderEmail(data: ChaseReminderData): Promise<EmailPayload> {
    const urgencyText = data.riskLevel === "HIGH" ? "URGENT" :
        data.riskLevel === "MEDIUM" ? "Action Needed" : "Reminder";

    const html = await render(ChaseReminderEmail(data));

    return {
        to: "",
        subject: `[${urgencyText}] Progress Update Required - ${data.poNumber}`,
        html,
        text: `Progress Update Required\n\nHi ${data.supplierName},\n\nWe haven't received a progress update for:\nPO: ${data.poNumber}\nMilestone: ${data.milestoneTitle}\nDays overdue: ${data.daysOverdue}\n\nPlease update: ${data.updateUrl}`,
    };
}

/**
 * Build escalation email using React Email template
 */
export async function buildEscalationEmail(data: EscalationData): Promise<EmailPayload> {
    const html = await render(EscalationEmail(data));

    return {
        to: "",
        subject: `[ESCALATION L${data.escalationLevel}] ${data.poNumber} - No Response from ${data.supplierName}`,
        html,
        text: `Escalation L${data.escalationLevel}: ${data.poNumber}\n\nSupplier ${data.supplierName} has not responded for ${data.daysOverdue} days.\nMilestone: ${data.milestoneTitle}\n\nPlease take action: ${data.dashboardUrl}`,
    };
}
