"use server";

import db from "@/db/drizzle";
import {
    invoice,
    milestone,
    milestonePayment,
    financialLedger,
    purchaseOrder,
    supplier,
    auditLog,
    notification,
    user,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// --- Types ---

interface CreateInvoiceInput {
    purchaseOrderId: string;
    milestoneId?: string;
    invoiceNumber: string;
    amount: number;
    invoiceDate: Date;
    dueDate?: Date;
    documentId?: string;
}

interface UpdatePaymentInput {
    invoiceId: string;
    paidAmount: number;
    paymentReference?: string;
    paymentMethod?: string;
    notes?: string;
}

interface PaymentSummary {
    totalCommitted: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    totalRetained: number;
}

// --- Helper Functions ---

async function getCurrentUser() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user;
}

async function logAudit(action: string, entityType: string, entityId: string, metadata?: object) {
    const user = await getCurrentUser();
    await db.insert(auditLog).values({
        userId: user?.id || null,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
    });
}

// --- Invoice Actions ---

/**
 * Create a new invoice linked to a PO and optionally a milestone.
 * Validates invoice amount against milestone value if linked.
 */
export async function createInvoice(input: CreateInvoiceInput) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        // Get PO details
        const po = await db.query.purchaseOrder.findFirst({
            where: eq(purchaseOrder.id, input.purchaseOrderId),
        });

        if (!po) {
            return { success: false, error: "Purchase order not found" };
        }

        // Validate against milestone if provided
        let validationStatus = "PENDING";
        let validationNotes = null;

        if (input.milestoneId) {
            const ms = await db.query.milestone.findFirst({
                where: eq(milestone.id, input.milestoneId),
            });

            if (ms) {
                const msAmount = Number(ms.amount) || (Number(po.totalValue) * Number(ms.paymentPercentage) / 100);
                const variance = Math.abs(input.amount - msAmount) / msAmount;

                if (variance > 0.05) { // >5% variance = mismatch
                    validationStatus = "MISMATCH";
                    validationNotes = `Invoice amount ${input.amount} differs from milestone value ${msAmount.toFixed(2)} by ${(variance * 100).toFixed(1)}%`;
                } else {
                    validationStatus = "PASSED";
                }
            }
        }

        // Create invoice
        const [newInvoice] = await db.insert(invoice).values({
            supplierId: po.supplierId,
            purchaseOrderId: input.purchaseOrderId,
            milestoneId: input.milestoneId,
            invoiceNumber: input.invoiceNumber,
            amount: input.amount.toString(),
            invoiceDate: input.invoiceDate,
            dueDate: input.dueDate,
            documentId: input.documentId,
            status: "PENDING",
            validationStatus,
            validationNotes,
        }).returning();

        // Create ledger entry
        await db.insert(financialLedger).values({
            projectId: po.projectId,
            purchaseOrderId: input.purchaseOrderId,
            invoiceId: newInvoice.id,
            milestoneId: input.milestoneId,
            transactionType: "INVOICE",
            amount: input.amount.toString(),
            status: "PENDING",
            dueDate: input.dueDate,
        });

        // Create or update milestone payment record
        if (input.milestoneId) {
            const existingPayment = await db.query.milestonePayment.findFirst({
                where: eq(milestonePayment.milestoneId, input.milestoneId),
            });

            if (existingPayment) {
                await db.update(milestonePayment)
                    .set({
                        invoiceId: newInvoice.id,
                        status: "INVOICED",
                        updatedAt: new Date(),
                    })
                    .where(eq(milestonePayment.id, existingPayment.id));
            } else {
                await db.insert(milestonePayment).values({
                    milestoneId: input.milestoneId,
                    invoiceId: newInvoice.id,
                    approvedAmount: input.amount.toString(),
                    status: "INVOICED",
                });
            }
        }

        await logAudit("INVOICE_CREATED", "invoice", newInvoice.id, {
            purchaseOrderId: input.purchaseOrderId,
            invoiceNumber: input.invoiceNumber,
            amount: input.amount,
            milestoneId: input.milestoneId,
        });

        revalidatePath("/procurement");
        return { success: true, data: newInvoice };
    } catch (error) {
        console.error("[createInvoice] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to create invoice" };
    }
}

/**
 * Update payment status for an invoice.
 * Supports partial payments and tracks payment method/reference.
 */
export async function updatePaymentStatus(input: UpdatePaymentInput) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        const inv = await db.query.invoice.findFirst({
            where: eq(invoice.id, input.invoiceId),
        });

        if (!inv) {
            return { success: false, error: "Invoice not found" };
        }

        const totalAmount = Number(inv.amount);
        const previouslyPaid = Number(inv.paidAmount) || 0;
        const totalPaid = previouslyPaid + input.paidAmount;

        let status = inv.status;
        let paidAt = inv.paidAt;

        if (totalPaid >= totalAmount) {
            status = "PAID";
            paidAt = new Date();
        } else if (totalPaid > 0) {
            status = "PARTIALLY_PAID";
        }

        // Update invoice
        await db.update(invoice)
            .set({
                paidAmount: totalPaid.toString(),
                status,
                paidAt,
                paymentReference: input.paymentReference || inv.paymentReference,
                updatedAt: new Date(),
            })
            .where(eq(invoice.id, input.invoiceId));

        // Create payment ledger entry
        const [po] = await db.select().from(purchaseOrder).where(eq(purchaseOrder.id, inv.purchaseOrderId));

        await db.insert(financialLedger).values({
            projectId: po.projectId,
            purchaseOrderId: inv.purchaseOrderId,
            invoiceId: input.invoiceId,
            milestoneId: inv.milestoneId,
            transactionType: "PAYMENT",
            amount: input.paidAmount.toString(),
            status: "PAID",
            paidAt: new Date(),
            paymentMethod: input.paymentMethod,
            externalReference: input.paymentReference,
            notes: input.notes,
        });

        // Update milestone payment if linked
        if (inv.milestoneId) {
            const msPayment = await db.query.milestonePayment.findFirst({
                where: eq(milestonePayment.invoiceId, input.invoiceId),
            });

            if (msPayment) {
                const newPaidAmount = (Number(msPayment.paidAmount) || 0) + input.paidAmount;
                const msStatus = newPaidAmount >= Number(msPayment.approvedAmount) ? "PAID" : "PARTIALLY_PAID";

                await db.update(milestonePayment)
                    .set({
                        paidAmount: newPaidAmount.toString(),
                        status: msStatus,
                        paidAt: msStatus === "PAID" ? new Date() : null,
                        updatedAt: new Date(),
                    })
                    .where(eq(milestonePayment.id, msPayment.id));
            }
        }

        await logAudit("PAYMENT_RECORDED", "invoice", input.invoiceId, {
            purchaseOrderId: inv.purchaseOrderId,
            invoiceNumber: inv.invoiceNumber,
            amount: input.paidAmount,
            totalPaid,
            status,
            reference: input.paymentReference,
        });

        revalidatePath("/procurement");
        return { success: true, data: { status, totalPaid } };
    } catch (error) {
        console.error("[updatePaymentStatus] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to update payment" };
    }
}

/**
 * Get payment summary for a project or PO.
 */
export async function getPaymentSummary(projectId?: string, purchaseOrderId?: string): Promise<{ success: boolean; data?: PaymentSummary; error?: string }> {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        let whereClause = sql`1=1`;
        if (projectId) {
            whereClause = sql`${financialLedger.projectId} = ${projectId}`;
        } else if (purchaseOrderId) {
            whereClause = sql`${financialLedger.purchaseOrderId} = ${purchaseOrderId}`;
        }

        // Get all ledger entries
        const entries = await db.select({
            transactionType: financialLedger.transactionType,
            amount: financialLedger.amount,
            status: financialLedger.status,
            dueDate: financialLedger.dueDate,
        }).from(financialLedger).where(whereClause);

        let totalCommitted = 0;
        let totalPaid = 0;
        let totalPending = 0;
        let totalOverdue = 0;
        let totalRetained = 0;

        const now = new Date();

        for (const entry of entries) {
            const amount = Number(entry.amount) || 0;

            if (entry.transactionType === "INVOICE") {
                totalCommitted += amount;

                if (entry.status === "PENDING") {
                    if (entry.dueDate && entry.dueDate < now) {
                        totalOverdue += amount;
                    } else {
                        totalPending += amount;
                    }
                }
            } else if (entry.transactionType === "PAYMENT") {
                totalPaid += amount;
            }
        }

        // Get retained amounts from invoices
        const invoices = await db.select({
            retentionAmount: invoice.retentionAmount,
        }).from(invoice).where(
            purchaseOrderId
                ? eq(invoice.purchaseOrderId, purchaseOrderId)
                : sql`1=1`
        );

        for (const inv of invoices) {
            totalRetained += Number(inv.retentionAmount) || 0;
        }

        return {
            success: true,
            data: {
                totalCommitted,
                totalPaid,
                totalPending,
                totalOverdue,
                totalRetained,
            },
        };
    } catch (error) {
        console.error("[getPaymentSummary] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to get payment summary" };
    }
}

/**
 * Validate invoice amount against approved milestone progress.
 */
export async function validateInvoiceAmount(invoiceId: string) {
    try {
        const inv = await db.query.invoice.findFirst({
            where: eq(invoice.id, invoiceId),
            with: {
                milestone: true,
                purchaseOrder: true,
            },
        });

        if (!inv) {
            return { success: false, error: "Invoice not found" };
        }

        if (!inv.milestone) {
            return {
                success: true,
                data: {
                    status: "SKIPPED",
                    reason: "No milestone linked"
                }
            };
        }

        const invoiceAmount = Number(inv.amount);
        const milestoneAmount = Number(inv.milestone.amount) ||
            (Number(inv.purchaseOrder.totalValue) * Number(inv.milestone.paymentPercentage) / 100);

        const variance = (invoiceAmount - milestoneAmount) / milestoneAmount;
        const variancePercent = (variance * 100).toFixed(1);

        let status: "PASSED" | "MISMATCH" | "FAILED";
        let reason: string;

        if (Math.abs(variance) <= 0.02) { // Within 2%
            status = "PASSED";
            reason = "Invoice matches milestone value";
        } else if (Math.abs(variance) <= 0.1) { // Within 10%
            status = "MISMATCH";
            reason = `Invoice differs by ${variancePercent}% (${invoiceAmount} vs expected ${milestoneAmount.toFixed(2)})`;
        } else {
            status = "FAILED";
            reason = `Invoice differs significantly by ${variancePercent}%`;
        }

        // Update invoice validation status
        await db.update(invoice)
            .set({
                validationStatus: status,
                validationNotes: reason,
                updatedAt: new Date(),
            })
            .where(eq(invoice.id, invoiceId));

        return { success: true, data: { status, reason, variance: variancePercent } };
    } catch (error) {
        console.error("[validateInvoiceAmount] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to validate invoice" };
    }
}

/**
 * Get invoices pending payment for a project/PO.
 */
export async function getPendingInvoices(projectId?: string, purchaseOrderId?: string) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        let query = db.query.invoice.findMany({
            where: and(
                purchaseOrderId ? eq(invoice.purchaseOrderId, purchaseOrderId) : sql`1=1`,
                sql`${invoice.status} IN ('PENDING', 'PARTIALLY_PAID', 'OVERDUE')`
            ),
            with: {
                milestone: true,
                supplier: true,
                purchaseOrder: true,
            },
            orderBy: [desc(invoice.invoiceDate)],
        });

        const invoices = await query;

        return { success: true, data: invoices };
    } catch (error) {
        console.error("[getPendingInvoices] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to get pending invoices" };
    }
}

/**
 * Calculate budget exposure for a project.
 */
export async function calculateBudgetExposure(projectId: string) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        // Get all POs for project
        const pos = await db.query.purchaseOrder.findMany({
            where: eq(purchaseOrder.projectId, projectId),
            with: {
                milestones: {
                    with: {
                        progressRecords: {
                            orderBy: [desc(sql`created_at`)],
                            limit: 1,
                        },
                    },
                },
            },
        });

        let totalCommitted = 0;
        let totalForecasted = 0;
        let totalApprovedProgress = 0;

        for (const po of pos) {
            const poValue = Number(po.totalValue) || 0;
            totalCommitted += poValue;

            // Calculate weighted progress
            let poProgress = 0;
            for (const ms of po.milestones) {
                const msProgress = ms.progressRecords[0]?.percentComplete || 0;
                const msWeight = Number(ms.paymentPercentage) / 100;
                poProgress += Number(msProgress) * msWeight;
            }

            totalApprovedProgress += (poValue * poProgress / 100);
            totalForecasted += poValue; // Could add forecasting logic here
        }

        // Get payment summary
        const paymentResult = await getPaymentSummary(projectId);
        const paymentData = paymentResult.data || {
            totalCommitted: 0,
            totalPaid: 0,
            totalPending: 0,
            totalOverdue: 0,
            totalRetained: 0,
        };

        return {
            success: true,
            data: {
                totalPOs: pos.length,
                totalPOCommitted: totalCommitted,
                totalForecasted,
                totalApprovedProgress,
                totalCommitted: paymentData.totalCommitted,
                totalPaid: paymentData.totalPaid,
                totalPending: paymentData.totalPending,
                totalOverdue: paymentData.totalOverdue,
                totalRetained: paymentData.totalRetained,
                costToComplete: totalCommitted - paymentData.totalPaid,
                utilization: totalCommitted > 0 ? (paymentData.totalPaid / totalCommitted * 100).toFixed(1) : "0",
            },
        };
    } catch (error) {
        console.error("[calculateBudgetExposure] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to calculate budget exposure" };
    }
}
