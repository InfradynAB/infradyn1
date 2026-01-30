import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { purchaseOrder, invoice, changeOrder, member } from "@/db/schema";
import { eq, and, inArray, lt } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's organizations
        const memberships = await db.query.member.findMany({
            where: eq(member.userId, session.user.id),
            columns: { organizationId: true },
        });

        const orgIds = memberships.map((m) => m.organizationId);

        if (orgIds.length === 0) {
            return NextResponse.json({
                success: true,
                data: { hasIssues: false, items: [] },
            });
        }

        // Get all POs for these organizations
        const orgPOs = await db.query.purchaseOrder.findMany({
            where: inArray(purchaseOrder.organizationId, orgIds),
            columns: { id: true },
        });

        const poIds = orgPOs.map((po) => po.id);

        // Check for draft POs
        const draftPOs = await db.query.purchaseOrder.findMany({
            where: and(
                inArray(purchaseOrder.organizationId, orgIds),
                eq(purchaseOrder.status, "DRAFT")
            ),
        });

        // Check for pending invoices (filter by PO relationship)
        const pendingInvoices = poIds.length > 0 
            ? await db.query.invoice.findMany({
                where: and(
                    inArray(invoice.purchaseOrderId, poIds),
                    eq(invoice.status, "PENDING")
                ),
            })
            : [];

        // Check for pending change orders (filter by PO relationship)
        const pendingCOs = poIds.length > 0
            ? await db.query.changeOrder.findMany({
                where: and(
                    inArray(changeOrder.purchaseOrderId, poIds),
                    eq(changeOrder.status, "PENDING")
                ),
            })
            : [];

        // Check for overdue invoices
        const now = new Date();
        const overdueInvoices = poIds.length > 0
            ? await db.query.invoice.findMany({
                where: and(
                    inArray(invoice.purchaseOrderId, poIds),
                    eq(invoice.status, "APPROVED"),
                    lt(invoice.dueDate, now)
                ),
            })
            : [];

        // Build attention items
        const items: any[] = [];

        if (draftPOs.length > 0) {
            items.push({
                type: "draft_po",
                count: draftPOs.length,
                label: `Draft PO${draftPOs.length !== 1 ? "s" : ""} not submitted`,
                href: "/dashboard/procurement?status=draft",
            });
        }

        if (pendingInvoices.length > 0) {
            items.push({
                type: "pending_invoice",
                count: pendingInvoices.length,
                label: `Invoice${pendingInvoices.length !== 1 ? "s" : ""} pending approval`,
                href: "/dashboard/procurement?tab=invoices",
            });
        }

        if (pendingCOs.length > 0) {
            items.push({
                type: "pending_co",
                count: pendingCOs.length,
                label: `Change Order${pendingCOs.length !== 1 ? "s" : ""} awaiting review`,
                href: "/dashboard/procurement?tab=change-orders",
            });
        }

        if (overdueInvoices.length > 0) {
            items.push({
                type: "overdue_payment",
                count: overdueInvoices.length,
                label: `Overdue payment${overdueInvoices.length !== 1 ? "s" : ""}`,
                href: "/dashboard/procurement?tab=invoices&filter=overdue",
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                hasIssues: items.length > 0,
                items,
            },
        });
    } catch (error) {
        console.error("[/api/dashboard/attention] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch attention data" },
            { status: 500 }
        );
    }
}
