import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { invoice, document, purchaseOrder, supplier, organization } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createInvoice, validateInvoiceAmount, updatePaymentStatus, getPendingInvoices, getPaymentSummary } from "@/lib/actions/finance-engine";
import { sendEmail, buildInvoiceCreatedEmail } from "@/lib/services/email";

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { action, ...data } = body;

        switch (action) {
            case "create": {
                const result = await createInvoice({

                    purchaseOrderId: data.purchaseOrderId,
                    milestoneId: data.milestoneId,
                    invoiceNumber: data.invoiceNumber,
                    amount: Number(data.amount),
                    invoiceDate: new Date(data.invoiceDate),
                    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                    documentId: data.documentId,
                });
                return NextResponse.json(result);
            }

            case "submitForApproval": {
                // Determine Organization ID (Essential for multi-tenancy)
                let orgId = session.user.organizationId;

                // Fallback: If supplier is submitting, look up the PO's organization
                if (!orgId || orgId === "") {
                    const po = await db.query.purchaseOrder.findFirst({
                        where: eq(purchaseOrder.id, data.purchaseOrderId),
                        columns: { organizationId: true }
                    });
                    if (po) {
                        orgId = po.organizationId;
                    }
                }

                if (!orgId || orgId === "") {
                    return NextResponse.json({ error: "Contextual Organization ID not found" }, { status: 400 });
                }

                // Create document record first if we have a URL
                let documentId: string | undefined;
                if (data.documentUrl) {
                    const [doc] = await db.insert(document).values({
                        organizationId: orgId,
                        parentId: data.purchaseOrderId,
                        parentType: "PO",
                        fileName: `Invoice_${data.invoiceNumber}.pdf`,
                        fileUrl: data.documentUrl,
                        mimeType: "application/pdf",
                        documentType: "INVOICE",
                    }).returning();
                    documentId = doc.id;
                }

                // Create invoice with PENDING_APPROVAL status
                const [newInvoice] = await db.insert(invoice).values({
                    supplierId: data.supplierId,
                    purchaseOrderId: data.purchaseOrderId,
                    invoiceNumber: data.invoiceNumber,
                    amount: String(data.amount),
                    invoiceDate: new Date(data.invoiceDate),
                    dueDate: data.dueDate ? new Date(data.dueDate) : null,
                    milestoneId: data.milestoneId || null,
                    documentId: documentId || null,
                    status: "PENDING_APPROVAL",
                    extractedData: data.extractedData,
                    confidenceScore: data.extractedData?.confidence ? String(data.extractedData.confidence) : null,
                    validationStatus: data.validationStatus || "PENDING",
                    validationNotes: data.validationNotes,
                    submittedBy: session.user.id,
                    submittedAt: new Date(),
                }).returning();

                // Send email notifications to supplier and PM
                try {
                    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

                    // Get PO details for email
                    const po = await db.query.purchaseOrder.findFirst({
                        where: eq(purchaseOrder.id, data.purchaseOrderId),
                    });

                    // Get supplier details
                    const supplierData = await db.query.supplier.findFirst({
                        where: eq(supplier.id, data.supplierId),
                    });

                    // Get organization details (for PM contact)
                    const orgData = po ? await db.query.organization.findFirst({
                        where: eq(organization.id, po.organizationId),
                    }) : null;

                    const emailData = {
                        supplierName: supplierData?.name || "Supplier",
                        poNumber: po?.poNumber || "",
                        invoiceNumber: data.invoiceNumber,
                        amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.amount),
                        dueDate: data.dueDate ? new Date(data.dueDate).toLocaleDateString() : undefined,
                        dashboardUrl: `${APP_URL}/dashboard/procurement/${data.purchaseOrderId}`,
                    };

                    // Send to supplier (confirmation)
                    if (supplierData?.contactEmail) {
                        const supplierEmail = await buildInvoiceCreatedEmail({
                            ...emailData,
                            recipientName: supplierData.name,
                            isSupplier: true,
                        });
                        await sendEmail({ ...supplierEmail, to: supplierData.contactEmail });
                        console.log("[submitForApproval] Sent confirmation email to supplier:", supplierData.contactEmail);
                    }

                    // Send to Organization PM (approval request)
                    if (orgData?.contactEmail) {
                        const pmEmail = await buildInvoiceCreatedEmail({
                            ...emailData,
                            recipientName: "Procurement Team",
                            isSupplier: false,
                        });
                        await sendEmail({ ...pmEmail, to: orgData.contactEmail });
                        console.log("[submitForApproval] Sent approval request email to PM:", orgData.contactEmail);
                    }
                } catch (emailError) {
                    console.warn("[submitForApproval] Email notification failed (non-blocking):", emailError);
                }

                return NextResponse.json({
                    success: true,
                    invoice: newInvoice,
                });
            }

            case "approveInvoice": {
                const [updated] = await db.update(invoice)
                    .set({
                        status: "APPROVED",
                        approvedBy: session.user.id,
                        approvedAt: new Date(),
                    })
                    .where(eq(invoice.id, data.invoiceId))
                    .returning();

                if (!updated) {
                    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
                }

                return NextResponse.json({ success: true, invoice: updated });
            }

            case "rejectInvoice": {
                const [updated] = await db.update(invoice)
                    .set({
                        status: "REJECTED",
                        approvedBy: session.user.id,
                        approvedAt: new Date(),
                        rejectionReason: data.reason,
                    })
                    .where(eq(invoice.id, data.invoiceId))
                    .returning();

                if (!updated) {
                    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
                }

                return NextResponse.json({ success: true, invoice: updated });
            }

            case "validate": {
                const result = await validateInvoiceAmount(data.invoiceId);
                return NextResponse.json(result);
            }

            case "updatePayment": {
                const result = await updatePaymentStatus({
                    invoiceId: data.invoiceId,
                    paidAmount: Number(data.paidAmount),
                    paymentReference: data.paymentReference,
                    paymentMethod: data.paymentMethod,
                    notes: data.notes,
                });
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("[POST /api/invoices] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get("action");
        const projectId = searchParams.get("projectId");
        const purchaseOrderId = searchParams.get("purchaseOrderId");

        switch (action) {
            case "pending": {
                const result = await getPendingInvoices(
                    projectId || undefined,
                    purchaseOrderId || undefined
                );
                return NextResponse.json(result);
            }

            case "summary": {
                const result = await getPaymentSummary(
                    projectId || undefined,
                    purchaseOrderId || undefined
                );
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("[GET /api/invoices] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
