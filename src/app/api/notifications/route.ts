/**
 * Notifications API
 * GET /api/notifications — returns merged DB notifications + live synthesized alerts
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getUnreadNotifications } from "@/lib/actions/notifications";
import db from "@/db/drizzle";
import {
    purchaseOrder,
    invoice,
    changeOrder,
    ncr,
    milestone,
    member,
} from "@/db/schema";
import { eq, and, inArray, lt, isNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // ── 1. Real DB notifications (engine-generated, unread only) ─────────
        const { data: dbNotifications } = await getUnreadNotifications(userId);

        // Normalise so both linkUrl and link fields are exposed uniformly
        const dbItems = (dbNotifications ?? []).map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type ?? "INFO",
            createdAt: n.createdAt,
            readAt: n.readAt ?? null,
            linkUrl: n.linkUrl ?? n.link ?? null,
            source: "db" as const,
        }));

        // ── 2. Live synthesized alerts from org data ──────────────────────────
        const memberships = await db.query.member.findMany({
            where: eq(member.userId, userId),
            columns: { organizationId: true },
        });
        const orgIds = memberships.map((m) => m.organizationId);

        const liveItems: {
            id: string;
            title: string;
            message: string;
            type: string;
            createdAt: string;
            readAt: null;
            linkUrl: string;
            source: "live";
        }[] = [];

        if (orgIds.length > 0) {
            const now = new Date();

            // Get all PO ids for this org
            const orgPOs = await db.query.purchaseOrder.findMany({
                where: inArray(purchaseOrder.organizationId, orgIds),
                columns: { id: true },
            });
            const poIds = orgPOs.map((po) => po.id);

            // Run queries in parallel
            const [
                draftPOs,
                pendingInvoices,
                overdueInvoices,
                pendingCOs,
                criticalNCRs,
                overdueNCRs,
                overdueMilestones,
            ] = await Promise.all([
                // Draft POs not yet submitted
                db.query.purchaseOrder.findMany({
                    where: and(
                        inArray(purchaseOrder.organizationId, orgIds),
                        eq(purchaseOrder.status, "DRAFT")
                    ),
                    columns: { id: true, poNumber: true, updatedAt: true },
                }),

                // Invoices pending approval
                poIds.length > 0
                    ? db.query.invoice.findMany({
                        where: and(
                            inArray(invoice.purchaseOrderId, poIds),
                            eq(invoice.status, "PENDING")
                        ),
                        columns: { id: true, invoiceNumber: true, purchaseOrderId: true, createdAt: true },
                    })
                    : Promise.resolve([]),

                // Approved invoices past due date (overdue payment)
                poIds.length > 0
                    ? db.query.invoice.findMany({
                        where: and(
                            inArray(invoice.purchaseOrderId, poIds),
                            eq(invoice.status, "APPROVED"),
                            lt(invoice.dueDate, now)
                        ),
                        columns: { id: true, invoiceNumber: true, purchaseOrderId: true, dueDate: true },
                    })
                    : Promise.resolve([]),

                // Pending change orders awaiting review
                poIds.length > 0
                    ? db.query.changeOrder.findMany({
                        where: and(
                            inArray(changeOrder.purchaseOrderId, poIds),
                            eq(changeOrder.status, "PENDING")
                        ),
                        columns: { id: true, changeNumber: true, purchaseOrderId: true, createdAt: true },
                    })
                    : Promise.resolve([]),

                // Critical open NCRs
                orgIds.length > 0
                    ? db.query.ncr.findMany({
                        where: and(
                            inArray(ncr.organizationId, orgIds),
                            eq(ncr.severity, "CRITICAL"),
                            eq(ncr.status, "OPEN")
                        ),
                        columns: { id: true, ncrNumber: true, title: true, purchaseOrderId: true, reportedAt: true },
                    })
                    : Promise.resolve([]),

                // NCRs past SLA due date
                orgIds.length > 0
                    ? db.query.ncr.findMany({
                        where: and(
                            inArray(ncr.organizationId, orgIds),
                            lt(ncr.slaDueAt, now),
                            isNull(ncr.closedAt)
                        ),
                        columns: { id: true, ncrNumber: true, title: true, purchaseOrderId: true, slaDueAt: true },
                    })
                    : Promise.resolve([]),

                // Overdue milestones (past expected date, not completed)
                poIds.length > 0
                    ? db.query.milestone.findMany({
                        where: and(
                            inArray(milestone.purchaseOrderId, poIds),
                            lt(milestone.expectedDate, now),
                            eq(milestone.status, "PENDING")
                        ),
                        columns: { id: true, title: true, purchaseOrderId: true, expectedDate: true },
                    })
                    : Promise.resolve([]),
            ]);

            // Draft POs — one alert per PO
            for (const po of draftPOs) {
                liveItems.push({
                    id: `live_draft_${po.id}`,
                    title: "Draft PO not submitted",
                    message: `${po.poNumber} is still in draft. Submit it to activate supplier tracking.`,
                    type: "DRAFT_PO",
                    createdAt: po.updatedAt?.toISOString() ?? now.toISOString(),
                    readAt: null,
                    linkUrl: `/dashboard/procurement/${po.id}`,
                    source: "live",
                });
            }

            // Pending invoices — grouped alert
            if (pendingInvoices.length > 0) {
                const firstPO = pendingInvoices[0].purchaseOrderId;
                liveItems.push({
                    id: `live_pending_invoices`,
                    title: `${pendingInvoices.length} invoice${pendingInvoices.length !== 1 ? "s" : ""} pending approval`,
                    message: `${pendingInvoices.map((i: any) => i.invoiceNumber).slice(0, 3).join(", ")}${pendingInvoices.length > 3 ? ` +${pendingInvoices.length - 3} more` : ""} awaiting review.`,
                    type: "PENDING_INVOICE",
                    createdAt: (pendingInvoices[0] as any).createdAt?.toISOString?.() ?? now.toISOString(),
                    readAt: null,
                    linkUrl: `/dashboard/procurement/${firstPO}?tab=financials`,
                    source: "live",
                });
            }

            // Overdue payments — grouped alert
            if (overdueInvoices.length > 0) {
                const firstPO = overdueInvoices[0].purchaseOrderId;
                liveItems.push({
                    id: `live_overdue_invoices`,
                    title: `${overdueInvoices.length} overdue payment${overdueInvoices.length !== 1 ? "s" : ""}`,
                    message: `${overdueInvoices.map((i: any) => i.invoiceNumber).slice(0, 3).join(", ")}${overdueInvoices.length > 3 ? ` +${overdueInvoices.length - 3} more` : ""} past due date.`,
                    type: "OVERDUE_PAYMENT",
                    createdAt: now.toISOString(),
                    readAt: null,
                    linkUrl: `/dashboard/procurement/${firstPO}?tab=financials&filter=overdue`,
                    source: "live",
                });
            }

            // Pending change orders — grouped alert
            if (pendingCOs.length > 0) {
                const firstPO = pendingCOs[0].purchaseOrderId;
                liveItems.push({
                    id: `live_pending_cos`,
                    title: `${pendingCOs.length} change order${pendingCOs.length !== 1 ? "s" : ""} awaiting review`,
                    message: `${pendingCOs.map((c: any) => c.changeNumber).slice(0, 3).join(", ")}${pendingCOs.length > 3 ? ` +${pendingCOs.length - 3} more` : ""} need a decision.`,
                    type: "PENDING_CO",
                    createdAt: (pendingCOs[0] as any).createdAt?.toISOString?.() ?? now.toISOString(),
                    readAt: null,
                    linkUrl: `/dashboard/procurement/${firstPO}?tab=change-orders`,
                    source: "live",
                });
            }

            // Critical NCRs — one alert per NCR
            for (const item of criticalNCRs) {
                liveItems.push({
                    id: `live_ncr_critical_${item.id}`,
                    title: `Critical NCR: ${item.ncrNumber}`,
                    message: item.title ?? "Requires immediate action.",
                    type: "NCR_CRITICAL",
                    createdAt: (item as any).reportedAt?.toISOString?.() ?? now.toISOString(),
                    readAt: null,
                    linkUrl: `/dashboard/procurement/${item.purchaseOrderId}?tab=quality`,
                    source: "live",
                });
            }

            // SLA-breached NCRs — grouped alert
            if (overdueNCRs.length > 0) {
                liveItems.push({
                    id: `live_ncr_sla`,
                    title: `${overdueNCRs.length} NCR${overdueNCRs.length !== 1 ? "s" : ""} past SLA deadline`,
                    message: `${overdueNCRs.map((n: any) => n.ncrNumber).slice(0, 3).join(", ")}${overdueNCRs.length > 3 ? ` +${overdueNCRs.length - 3} more` : ""} have exceeded their resolution SLA.`,
                    type: "NCR_SLA",
                    createdAt: now.toISOString(),
                    readAt: null,
                    linkUrl: `/dashboard/procurement`,
                    source: "live",
                });
            }

            // Overdue milestones — grouped alert
            if (overdueMilestones.length > 0) {
                const firstPO = overdueMilestones[0].purchaseOrderId;
                liveItems.push({
                    id: `live_overdue_milestones`,
                    title: `${overdueMilestones.length} overdue milestone${overdueMilestones.length !== 1 ? "s" : ""}`,
                    message: `${overdueMilestones.map((m: any) => m.title).slice(0, 2).join(", ")}${overdueMilestones.length > 2 ? ` +${overdueMilestones.length - 2} more` : ""} past expected date.`,
                    type: "OVERDUE_MILESTONE",
                    createdAt: now.toISOString(),
                    readAt: null,
                    linkUrl: `/dashboard/procurement/${firstPO}?tab=progress`,
                    source: "live",
                });
            }
        }

        // ── 3. Merge: DB items first (engine-generated are higher priority),
        //    then live synthesized. Sort newest first overall.
        const merged = [
            ...dbItems,
            ...liveItems,
        ].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return NextResponse.json({ success: true, data: merged });
    } catch (error) {
        console.error("[NOTIFICATIONS API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch notifications", data: [] },
            { status: 500 }
        );
    }
}
