"use server";

import db from "@/db/drizzle";
import {
    ncr,
    ncrComment,
    ncrAttachment,
    ncrMagicLink,
    purchaseOrder,
    boqItem,
    milestone,
    supplier,
    user,
    auditLog,
} from "@/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

export type NCRSeverity = "MINOR" | "MAJOR" | "CRITICAL";
export type NCRStatus = "OPEN" | "SUPPLIER_RESPONDED" | "REINSPECTION" | "REVIEW" | "REMEDIATION" | "CLOSED";
export type NCRIssueType = "DAMAGED" | "WRONG_SPEC" | "DOC_MISSING" | "QUANTITY_SHORT" | "QUALITY_DEFECT" | "OTHER";

interface CreateNCRInput {
    organizationId: string;
    projectId: string;
    purchaseOrderId: string;
    supplierId: string;
    title: string;
    description?: string;
    severity: NCRSeverity;
    issueType: NCRIssueType;
    affectedBoqItemId?: string;
    batchId?: string;
    reportedBy: string;
    qaInspectionTaskId?: string;
    sourceDocumentId?: string;
}

interface UpdateNCRStatusInput {
    ncrId: string;
    newStatus: NCRStatus;
    userId: string;
    reason?: string;
}

interface CloseNCRInput {
    ncrId: string;
    userId: string;
    closedReason: string;
    proofOfFixDocId?: string;
    creditNoteDocId?: string;
}

// SLA Configuration (in hours)
const SLA_CONFIG = {
    CRITICAL: { response: 4, resolution: 24 },
    MAJOR: { response: 24, resolution: 72 },
    MINOR: { response: 72, resolution: 168 }, // 7 days
};

// ============================================================================
// NCR CREATION
// ============================================================================

/**
 * Generate next NCR number for an organization
 */
async function generateNCRNumber(organizationId: string): Promise<string> {
    const result = await db
        .select({ count: count() })
        .from(ncr)
        .where(eq(ncr.organizationId, organizationId));

    const nextNumber = (result[0]?.count || 0) + 1;
    return `NCR-${String(nextNumber).padStart(4, "0")}`;
}

/**
 * Calculate SLA due date based on severity
 */
function calculateSLADueDate(severity: NCRSeverity): Date {
    const hoursToAdd = SLA_CONFIG[severity].resolution;
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + hoursToAdd);
    return dueDate;
}

/**
 * Check if the affected BOQ item's PO has already been paid (for payment shield)
 * Returns true if any milestone on the PO is certified/paid
 */
async function checkPaymentState(purchaseOrderId: string): Promise<boolean> {
    if (!purchaseOrderId) return false;

    // Query milestones for this PO
    const milestones = await db.query.milestone.findMany({
        where: eq(milestone.purchaseOrderId, purchaseOrderId),
    });

    // Check if any milestone is certified/paid
    return milestones.some(m => m.status === "CERTIFIED" || m.status === "INVOICED");
}

/**
 * Get milestone IDs for a purchase order (for locking)
 */
async function getMilestoneIdsForPO(purchaseOrderId: string): Promise<string[]> {
    const milestones = await db.query.milestone.findMany({
        where: eq(milestone.purchaseOrderId, purchaseOrderId),
    });
    return milestones.map(m => m.id);
}

/**
 * Create a new NCR (Non-Conformance Report)
 */
export async function createNCR(input: CreateNCRInput) {
    try {
        const ncrNumber = await generateNCRNumber(input.organizationId);
        const slaDueAt = calculateSLADueDate(input.severity);

        // Check if PO has already been paid (payment shield)
        const requiresCreditNote = await checkPaymentState(input.purchaseOrderId);

        // Get milestone IDs to lock for this PO
        const milestonesLockedIds = await getMilestoneIdsForPO(input.purchaseOrderId);

        const [newNCR] = await db.insert(ncr).values({
            organizationId: input.organizationId,
            projectId: input.projectId,
            purchaseOrderId: input.purchaseOrderId,
            supplierId: input.supplierId,
            ncrNumber,
            title: input.title,
            description: input.description,
            severity: input.severity,
            issueType: input.issueType,
            affectedBoqItemId: input.affectedBoqItemId,
            batchId: input.batchId,
            reportedBy: input.reportedBy,
            reportedAt: new Date(),
            slaDueAt,
            requiresCreditNote,
            milestonesLockedIds,
            qaInspectionTaskId: input.qaInspectionTaskId,
            sourceDocumentId: input.sourceDocumentId,
        }).returning();

        // Log audit
        await db.insert(auditLog).values({
            userId: input.reportedBy,
            action: "NCR_CREATED",
            entityType: "NCR",
            entityId: newNCR.id,
            metadata: JSON.stringify({ ncrNumber, severity: input.severity, issueType: input.issueType }),
        });

        // Lock affected milestones
        if (milestonesLockedIds.length > 0) {
            await lockMilestonesForNCR(milestonesLockedIds, newNCR.id);
        }

        return { success: true, data: newNCR };
    } catch (error) {
        console.error("[CREATE_NCR]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to create NCR" };
    }
}

// ============================================================================
// STATUS MANAGEMENT
// ============================================================================

/**
 * Update NCR status with validation
 */
export async function updateNCRStatus(input: UpdateNCRStatusInput) {
    try {
        const existingNCR = await db.query.ncr.findFirst({
            where: eq(ncr.id, input.ncrId),
        });

        if (!existingNCR) {
            return { success: false, error: "NCR not found" };
        }

        // Validate status transition
        const validTransitions: Record<NCRStatus, NCRStatus[]> = {
            OPEN: ["SUPPLIER_RESPONDED", "REVIEW", "CLOSED"],
            SUPPLIER_RESPONDED: ["REINSPECTION", "REVIEW", "CLOSED"],
            REINSPECTION: ["REVIEW", "REMEDIATION", "CLOSED", "OPEN"],
            REVIEW: ["REMEDIATION", "CLOSED", "OPEN"],
            REMEDIATION: ["CLOSED", "REINSPECTION"],
            CLOSED: ["OPEN"], // Can reopen
        };

        const currentStatus = existingNCR.status as NCRStatus;
        if (!validTransitions[currentStatus]?.includes(input.newStatus)) {
            return {
                success: false,
                error: `Cannot transition from ${currentStatus} to ${input.newStatus}`
            };
        }

        const [updated] = await db.update(ncr)
            .set({
                status: input.newStatus,
                updatedAt: new Date(),
            })
            .where(eq(ncr.id, input.ncrId))
            .returning();

        // Log audit
        await db.insert(auditLog).values({
            userId: input.userId,
            action: "NCR_STATUS_CHANGED",
            entityType: "NCR",
            entityId: input.ncrId,
            metadata: JSON.stringify({
                from: currentStatus,
                to: input.newStatus,
                reason: input.reason,
            }),
        });

        return { success: true, data: updated };
    } catch (error) {
        console.error("[UPDATE_NCR_STATUS]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to update status" };
    }
}

/**
 * Close NCR with evidence validation
 */
export async function closeNCR(input: CloseNCRInput) {
    try {
        const existingNCR = await db.query.ncr.findFirst({
            where: eq(ncr.id, input.ncrId),
        });

        if (!existingNCR) {
            return { success: false, error: "NCR not found" };
        }

        // Evidence Enforcer: Block closure without proof (except MINOR with justification)
        if (existingNCR.severity !== "MINOR" && !input.proofOfFixDocId) {
            return {
                success: false,
                error: "Proof of fix document required for MAJOR/CRITICAL NCRs"
            };
        }

        // Payment Shield: Require credit note if item was already paid
        if (existingNCR.requiresCreditNote && !input.creditNoteDocId) {
            return {
                success: false,
                error: "Credit note required before closing (item was already paid)"
            };
        }

        const [closed] = await db.update(ncr)
            .set({
                status: "CLOSED",
                closedBy: input.userId,
                closedAt: new Date(),
                closedReason: input.closedReason,
                proofOfFixDocId: input.proofOfFixDocId,
                creditNoteDocId: input.creditNoteDocId,
                creditNoteVerifiedAt: input.creditNoteDocId ? new Date() : null,
                updatedAt: new Date(),
            })
            .where(eq(ncr.id, input.ncrId))
            .returning();

        // Unlock milestones
        if (existingNCR.milestonesLockedIds && (existingNCR.milestonesLockedIds as string[]).length > 0) {
            await unlockMilestonesOnClose(existingNCR.milestonesLockedIds as string[], input.ncrId);
        }

        // Log audit
        await db.insert(auditLog).values({
            userId: input.userId,
            action: "NCR_CLOSED",
            entityType: "NCR",
            entityId: input.ncrId,
            metadata: JSON.stringify({
                closedReason: input.closedReason,
                hasProofOfFix: !!input.proofOfFixDocId,
                hasCreditNote: !!input.creditNoteDocId,
            }),
        });

        return { success: true, data: closed };
    } catch (error) {
        console.error("[CLOSE_NCR]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to close NCR" };
    }
}

/**
 * Reopen a closed NCR
 */
export async function reopenNCR(ncrId: string, userId: string, reason: string) {
    try {
        const existingNCR = await db.query.ncr.findFirst({
            where: eq(ncr.id, ncrId),
        });

        if (!existingNCR) {
            return { success: false, error: "NCR not found" };
        }

        if (existingNCR.status !== "CLOSED") {
            return { success: false, error: "Can only reopen closed NCRs" };
        }

        const [reopened] = await db.update(ncr)
            .set({
                status: "OPEN",
                closedBy: null,
                closedAt: null,
                closedReason: null,
                updatedAt: new Date(),
            })
            .where(eq(ncr.id, ncrId))
            .returning();

        // Re-lock milestones
        if (existingNCR.milestonesLockedIds && (existingNCR.milestonesLockedIds as string[]).length > 0) {
            await lockMilestonesForNCR(existingNCR.milestonesLockedIds as string[], ncrId);
        }

        // Log audit
        await db.insert(auditLog).values({
            userId,
            action: "NCR_REOPENED",
            entityType: "NCR",
            entityId: ncrId,
            metadata: JSON.stringify({ reason }),
        });

        return { success: true, data: reopened };
    } catch (error) {
        console.error("[REOPEN_NCR]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to reopen NCR" };
    }
}

// ============================================================================
// MILESTONE LOCKING (PAYMENT SHIELD)
// ============================================================================

/**
 * Lock milestones when NCR is created
 */
async function lockMilestonesForNCR(milestoneIds: string[], ncrId: string) {
    try {
        for (const milestoneId of milestoneIds) {
            await db.update(milestone)
                .set({
                    // Prevent milestone from being set to 100% or CERTIFIED
                    updatedAt: new Date(),
                })
                .where(eq(milestone.id, milestoneId));

            console.log(`[NCR_LOCK] Milestone ${milestoneId} locked by NCR ${ncrId}`);
        }
    } catch (error) {
        console.error("[LOCK_MILESTONES]", error);
    }
}

/**
 * Unlock milestones when NCR is closed
 */
async function unlockMilestonesOnClose(milestoneIds: string[], ncrId: string) {
    try {
        // Check if there are any other open NCRs for these milestones
        for (const milestoneId of milestoneIds) {
            const otherOpenNCRs = await db.query.ncr.findMany({
                where: and(
                    sql`${milestoneId} = ANY(${ncr.milestonesLockedIds})`,
                    eq(ncr.status, "OPEN"),
                ),
            });

            if (otherOpenNCRs.length === 0) {
                console.log(`[NCR_UNLOCK] Milestone ${milestoneId} unlocked after NCR ${ncrId} closed`);
            }
        }
    } catch (error) {
        console.error("[UNLOCK_MILESTONES]", error);
    }
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get NCRs for a purchase order
 */
export async function getNCRsByPO(purchaseOrderId: string) {
    try {
        const ncrs = await db.query.ncr.findMany({
            where: eq(ncr.purchaseOrderId, purchaseOrderId),
            orderBy: [desc(ncr.createdAt)],
            with: {
                supplier: true,
                reporter: true,
                assignee: true,
            },
        });

        return { success: true, data: ncrs };
    } catch (error) {
        console.error("[GET_NCRS_BY_PO]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch NCRs", data: [] };
    }
}

/**
 * Get NCRs for a supplier (filtered view)
 */
export async function getNCRsBySupplier(supplierId: string) {
    try {
        const ncrs = await db.query.ncr.findMany({
            where: eq(ncr.supplierId, supplierId),
            orderBy: [desc(ncr.createdAt)],
            with: {
                purchaseOrder: true,
                comments: {
                    where: eq(ncrComment.isInternal, false), // Hide internal comments from supplier
                },
            },
        });

        return { success: true, data: ncrs };
    } catch (error) {
        console.error("[GET_NCRS_BY_SUPPLIER]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch NCRs", data: [] };
    }
}

/**
 * Get single NCR with full details
 */
export async function getNCRById(ncrId: string, includeInternalComments = false) {
    try {
        const ncrData = await db.query.ncr.findFirst({
            where: eq(ncr.id, ncrId),
            with: {
                organization: true,
                project: true,
                purchaseOrder: true,
                supplier: true,
                affectedBoqItem: true,
                reporter: true,
                assignee: true,
                closer: true,
                comments: {
                    orderBy: [desc(ncrComment.createdAt)],
                    with: {
                        user: true,
                    },
                },
                attachments: true,
            },
        });

        if (!ncrData) {
            return { success: false, error: "NCR not found" };
        }

        // Filter internal comments if needed
        if (!includeInternalComments) {
            ncrData.comments = ncrData.comments.filter(c => !c.isInternal);
        }

        return { success: true, data: ncrData };
    } catch (error) {
        console.error("[GET_NCR_BY_ID]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch NCR" };
    }
}

/**
 * Get organization NCR dashboard data
 */
export async function getNCRDashboard(organizationId: string) {
    try {
        const allNCRs = await db.query.ncr.findMany({
            where: eq(ncr.organizationId, organizationId),
            with: {
                supplier: true,
            },
        });

        // Calculate metrics
        const openCount = allNCRs.filter(n => n.status !== "CLOSED").length;
        const criticalOpen = allNCRs.filter(n => n.status !== "CLOSED" && n.severity === "CRITICAL").length;
        const overdueCount = allNCRs.filter(n =>
            n.status !== "CLOSED" &&
            n.slaDueAt &&
            new Date(n.slaDueAt) < new Date()
        ).length;

        // Supplier ratings (NCRs per supplier)
        const supplierNCRs: Record<string, { name: string; count: number }> = {};
        allNCRs.forEach(n => {
            if (!supplierNCRs[n.supplierId]) {
                supplierNCRs[n.supplierId] = { name: n.supplier?.name || "Unknown", count: 0 };
            }
            supplierNCRs[n.supplierId].count++;
        });

        // Severity breakdown
        const severityBreakdown = {
            CRITICAL: allNCRs.filter(n => n.severity === "CRITICAL").length,
            MAJOR: allNCRs.filter(n => n.severity === "MAJOR").length,
            MINOR: allNCRs.filter(n => n.severity === "MINOR").length,
        };

        return {
            success: true,
            data: {
                total: allNCRs.length,
                openCount,
                criticalOpen,
                overdueCount,
                severityBreakdown,
                supplierRatings: Object.values(supplierNCRs).sort((a, b) => b.count - a.count),
            },
        };
    } catch (error) {
        console.error("[GET_NCR_DASHBOARD]", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch dashboard" };
    }
}
