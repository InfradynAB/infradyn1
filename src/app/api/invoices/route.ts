import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { createInvoice, validateInvoiceAmount, updatePaymentStatus, getPendingInvoices, getPaymentSummary } from "@/lib/actions/finance-engine";

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
