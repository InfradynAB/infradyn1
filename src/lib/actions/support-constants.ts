/**
 * Support ticket label maps — kept separate from the "use server" actions file
 * because "use server" modules may only export async functions.
 */

export type TicketCategory =
    | "TECHNICAL"
    | "BILLING"
    | "ACCESS_ISSUE"
    | "BUG_REPORT"
    | "DATA_ISSUE"
    | "FEATURE_REQUEST"
    | "GENERAL"
    | "OTHER";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "AWAITING_USER" | "RESOLVED" | "CLOSED";

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
    TECHNICAL: "Technical Issue",
    BILLING: "Billing",
    ACCESS_ISSUE: "Access / Permissions",
    BUG_REPORT: "Bug Report",
    DATA_ISSUE: "Data Issue",
    FEATURE_REQUEST: "Feature Request",
    GENERAL: "General Enquiry",
    OTHER: "Other",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    URGENT: "Urgent",
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    AWAITING_USER: "Awaiting User",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
};
