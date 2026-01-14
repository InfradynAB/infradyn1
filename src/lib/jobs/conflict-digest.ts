"use server";

/**
 * Phase 6I: Conflict Digest
 * 
 * Background job to send daily digest emails for unresolved conflicts.
 * Batches low/medium severity conflicts into daily summaries.
 * High severity conflicts trigger immediate alerts (handled elsewhere).
 * 
 * Cron schedule: Daily at 8 AM (configurable)
 * Endpoint: /api/cron/conflict-digest
 * Vercel cron schedule: "0 8 * * *" (daily at 8 AM)
 */

import db from "@/db/drizzle";
import { conflictRecord, user, project, purchaseOrder } from "@/db/schema";
import { and, eq, inArray, isNull, sql, desc } from "drizzle-orm";
import { getConfigTyped } from "@/lib/actions/config-engine";

// ============================================================================
// Types
// ============================================================================

export interface DigestResult {
    success: boolean;
    recipientCount: number;
    conflictCount: number;
    emailsSent: number;
    errors: string[];
}

export interface ConflictSummary {
    id: string;
    type: string;
    severity: string;
    description: string;
    poNumber: string;
    projectName: string;
    createdAt: Date;
    daysOpen: number;
}

export interface UserDigest {
    userId: string;
    email: string;
    name: string;
    conflicts: ConflictSummary[];
}

// ============================================================================
// Main Digest Function
// ============================================================================

/**
 * Generate and send daily conflict digest emails
 */
export async function runConflictDigest(): Promise<DigestResult> {
    const errors: string[] = [];
    let emailsSent = 0;

    try {
        // Check if digest is enabled
        const isEnabled = await getConfigTyped<boolean>("conflict_digest_enabled") ?? true;
        if (!isEnabled) {
            return {
                success: true,
                recipientCount: 0,
                conflictCount: 0,
                emailsSent: 0,
                errors: [],
            };
        }

        // Get all open conflicts that haven't been included in a digest today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const openConflicts = await db.query.conflictRecord.findMany({
            where: and(
                inArray(conflictRecord.state, ["OPEN", "REVIEW"]),
                // Not high severity (those get immediate alerts)
                inArray(conflictRecord.severity, ["LOW", "MEDIUM"]),
                // Not already in today's digest
                sql`(${conflictRecord.digestSentAt} IS NULL OR ${conflictRecord.digestSentAt} < ${today})`
            ),
            with: {
                purchaseOrder: {
                    columns: { poNumber: true, organizationId: true },
                },
                project: {
                    columns: { name: true },
                },
            },
            orderBy: [desc(conflictRecord.createdAt)],
            limit: 100,
        });

        if (openConflicts.length === 0) {
            return {
                success: true,
                recipientCount: 0,
                conflictCount: 0,
                emailsSent: 0,
                errors: [],
            };
        }

        // Group conflicts by organization
        const conflictsByOrg: Record<string, ConflictSummary[]> = {};
        for (const conflict of openConflicts) {
            const orgId = conflict.purchaseOrder?.organizationId;
            if (!orgId) continue;

            if (!conflictsByOrg[orgId]) {
                conflictsByOrg[orgId] = [];
            }

            const createdAt = typeof conflict.createdAt === "string"
                ? new Date(conflict.createdAt)
                : conflict.createdAt;
            const daysOpen = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

            conflictsByOrg[orgId].push({
                id: conflict.id,
                type: conflict.type,
                severity: conflict.severity || "MEDIUM",
                description: conflict.description || `${conflict.type} conflict`,
                poNumber: conflict.purchaseOrder?.poNumber || "Unknown PO",
                projectName: conflict.project?.name || "Unknown Project",
                createdAt,
                daysOpen,
            });
        }

        // Get PM users for each organization
        const orgIds = Object.keys(conflictsByOrg);
        const pmUsers = await db.query.user.findMany({
            where: and(
                inArray(user.organizationId, orgIds),
                eq(user.role, "PM")
            ),
            columns: {
                id: true,
                email: true,
                name: true,
                organizationId: true,
            },
        });

        // Build digests per user
        const userDigests: UserDigest[] = [];
        for (const pm of pmUsers) {
            if (!pm.organizationId || !pm.email) continue;
            const conflicts = conflictsByOrg[pm.organizationId] || [];
            if (conflicts.length > 0) {
                userDigests.push({
                    userId: pm.id,
                    email: pm.email,
                    name: pm.name || "Project Manager",
                    conflicts,
                });
            }
        }

        // Send emails
        for (const digest of userDigests) {
            try {
                await sendDigestEmail(digest);
                emailsSent++;
            } catch (error) {
                errors.push(`Failed to send email to ${digest.email}: ${error}`);
            }
        }

        // Mark conflicts as included in digest
        const conflictIds = openConflicts.map(c => c.id);
        await db.update(conflictRecord)
            .set({ digestSentAt: new Date() })
            .where(inArray(conflictRecord.id, conflictIds));

        return {
            success: true,
            recipientCount: userDigests.length,
            conflictCount: openConflicts.length,
            emailsSent,
            errors,
        };

    } catch (error) {
        console.error("[ConflictDigest] Fatal error:", error);
        return {
            success: false,
            recipientCount: 0,
            conflictCount: 0,
            emailsSent,
            errors: [error instanceof Error ? error.message : "Unknown error"],
        };
    }
}

// ============================================================================
// Email Sending
// ============================================================================

/**
 * Send digest email using Resend
 */
async function sendDigestEmail(digest: UserDigest): Promise<void> {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const conflictCount = digest.conflicts.length;
    const highPriorityCount = digest.conflicts.filter(c => c.severity === "MEDIUM").length;

    // Group by type for summary
    const byType: Record<string, number> = {};
    for (const conflict of digest.conflicts) {
        byType[conflict.type] = (byType[conflict.type] || 0) + 1;
    }

    const typeSummary = Object.entries(byType)
        .map(([type, count]) => `${count} ${type.toLowerCase().replace(/_/g, " ")}`)
        .join(", ");

    // Build HTML email
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
                .conflict-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 12px 0; }
                .severity-medium { border-left: 4px solid #f59e0b; }
                .severity-low { border-left: 4px solid #3b82f6; }
                .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
                .badge-medium { background: #fef3c7; color: #b45309; }
                .badge-low { background: #dbeafe; color: #1d4ed8; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">📋 Daily Conflict Digest</h2>
                    <p style="margin: 8px 0 0 0;">You have ${conflictCount} unresolved conflict${conflictCount !== 1 ? "s" : ""} requiring attention</p>
                </div>
                <div class="content">
                    <p>Hi ${digest.name},</p>
                    <p>Here's your summary: <strong>${typeSummary}</strong></p>
                    
                    ${digest.conflicts.slice(0, 10).map(conflict => `
                        <div class="conflict-card severity-${conflict.severity.toLowerCase()}">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong>${conflict.poNumber}</strong>
                                <span class="badge badge-${conflict.severity.toLowerCase()}">${conflict.severity}</span>
                            </div>
                            <p style="margin: 8px 0; color: #374151;">${conflict.description}</p>
                            <p style="margin: 0; font-size: 12px; color: #6b7280;">
                                ${conflict.projectName} • Open for ${conflict.daysOpen} day${conflict.daysOpen !== 1 ? "s" : ""}
                            </p>
                        </div>
                    `).join("")}
                    
                    ${conflictCount > 10 ? `<p style="color: #6b7280;">...and ${conflictCount - 10} more conflicts</p>` : ""}
                    
                    <div style="text-align: center; margin-top: 24px;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.example.com"}/dashboard/conflicts" 
                           style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                            Review All Conflicts
                        </a>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated digest from InfraDyn. You can adjust notification settings in your dashboard.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@infradyn.com",
        to: digest.email,
        subject: `[InfraDyn] ${conflictCount} Conflict${conflictCount !== 1 ? "s" : ""} Awaiting Review`,
        html,
    });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get preview of what the next digest would contain
 */
export async function previewNextDigest(): Promise<{
    conflictCount: number;
    recipientCount: number;
    conflicts: ConflictSummary[];
}> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openConflicts = await db.query.conflictRecord.findMany({
        where: and(
            inArray(conflictRecord.state, ["OPEN", "REVIEW"]),
            inArray(conflictRecord.severity, ["LOW", "MEDIUM"]),
            sql`(${conflictRecord.digestSentAt} IS NULL OR ${conflictRecord.digestSentAt} < ${today})`
        ),
        with: {
            purchaseOrder: { columns: { poNumber: true, organizationId: true } },
            project: { columns: { name: true } },
        },
        limit: 50,
    });

    const conflicts: ConflictSummary[] = openConflicts.map(conflict => {
        const createdAt = typeof conflict.createdAt === "string"
            ? new Date(conflict.createdAt)
            : conflict.createdAt;
        return {
            id: conflict.id,
            type: conflict.type,
            severity: conflict.severity || "MEDIUM",
            description: conflict.description || `${conflict.type} conflict`,
            poNumber: conflict.purchaseOrder?.poNumber || "Unknown PO",
            projectName: conflict.project?.name || "Unknown Project",
            createdAt,
            daysOpen: Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        };
    });

    // Get unique organizations
    const orgIds = [...new Set(openConflicts.map(c => c.purchaseOrder?.organizationId).filter(Boolean))];
    const pmCount = await db.query.user.findMany({
        where: and(
            inArray(user.organizationId, orgIds as string[]),
            eq(user.role, "PM")
        ),
        columns: { id: true },
    });

    return {
        conflictCount: openConflicts.length,
        recipientCount: pmCount.length,
        conflicts,
    };
}
