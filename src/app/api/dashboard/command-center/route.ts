import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import {
    purchaseOrder,
    invoice,
    changeOrder,
    ncr,
    project,
    milestone,
    supplier,
    shipment,
    progressRecord,
} from "@/db/schema";
import { eq, and, desc, inArray, lt, gte, sql, not } from "drizzle-orm";
import { getFinancialKPIs, getProgressKPIs } from "@/lib/services/kpi-engine";
import { buildTrafficCacheKey, getOrSetTrafficCache } from "@/lib/services/traffic-cache";

/**
 * Command Center API
 * Fetches all data needed for the main dashboard "Command Center" view
 */
export async function GET() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organizationId = session.user.organizationId;
        if (!organizationId) {
            return NextResponse.json({
                success: true,
                data: {
                    projects: [],
                    alerts: [],
                    activity: [],
                    aiSummary: null,
                    quickStats: null,
                },
            });
        }

        const cacheKey = buildTrafficCacheKey("dashboard:command-center", [organizationId]);
        const cached = await getOrSetTrafficCache(cacheKey, 20, async () => {
            const [
                projectsData,
                alertsData,
                activityData,
                quickStatsData,
            ] = await Promise.all([
                fetchProjects(organizationId),
                fetchAlerts(organizationId),
                fetchRecentActivity(organizationId),
                fetchQuickStats(organizationId),
            ]);

            const aiSummary = generateAISummary(projectsData, alertsData, quickStatsData);

            return {
                projects: projectsData,
                alerts: alertsData,
                activity: activityData,
                aiSummary,
                quickStats: quickStatsData,
            };
        });

        return NextResponse.json({
            success: true,
            data: cached.value,
        }, {
            headers: {
                "x-infradyn-cache": `${cached.cache}:${cached.layer}`,
            },
        });
    } catch (error) {
        console.error("[/api/dashboard/command-center] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch command center data" },
            { status: 500 }
        );
    }
}

// Fetch active projects with health status and progress
async function fetchProjects(organizationId: string) {
    const projects = await db.query.project.findMany({
        where: and(
            eq(project.organizationId, organizationId),
            eq(project.isDeleted, false)
        ),
        orderBy: [desc(project.updatedAt)],
        limit: 6,
    });

    // Calculate health and progress for each project
    const projectsWithHealth = await Promise.all(
        projects.map(async (p) => {
            try {
                const [financialKPIs, progressKPIs] = await Promise.all([
                    getFinancialKPIs({ organizationId, projectId: p.id }),
                    getProgressKPIs({ organizationId, projectId: p.id }),
                ]);

                // Determine health status
                let health: "healthy" | "at-risk" | "critical" = "healthy";
                if (progressKPIs.delayedCount > 0 || progressKPIs.atRiskCount > 2) {
                    health = "at-risk";
                }
                if (progressKPIs.delayedCount > 2) {
                    health = "critical";
                }

                return {
                    id: p.id,
                    name: p.name,
                    code: p.code || p.id.slice(0, 8).toUpperCase(),
                    status: "ACTIVE", // Projects don't have status in schema
                    health,
                    progress: Math.round(progressKPIs.physicalProgress),
                    totalCommitted: financialKPIs.totalCommitted,
                    totalPaid: financialKPIs.totalPaid,
                    milestones: {
                        completed: progressKPIs.milestonesCompleted,
                        total: progressKPIs.milestonesTotal,
                    },
                    activePOs: progressKPIs.activePOs,
                    startDate: p.startDate,
                    endDate: p.endDate,
                };
            } catch {
                return {
                    id: p.id,
                    name: p.name,
                    code: p.code || p.id.slice(0, 8).toUpperCase(),
                    status: "ACTIVE", // Projects don't have status in schema
                    health: "healthy" as const,
                    progress: 0,
                    totalCommitted: 0,
                    totalPaid: 0,
                    milestones: { completed: 0, total: 0 },
                    activePOs: 0,
                    startDate: p.startDate,
                    endDate: p.endDate,
                };
            }
        })
    );

    return projectsWithHealth;
}

// Fetch alerts requiring attention
async function fetchAlerts(organizationId: string) {
    const alerts: Array<{
        id: string;
        type: string;
        severity: "info" | "warning" | "critical";
        title: string;
        description: string;
        href: string;
        actionLabel: string;
        count?: number;
        createdAt: Date;
    }> = [];

    // Get PO IDs for this org
    const orgPOs = await db.query.purchaseOrder.findMany({
        where: and(
            eq(purchaseOrder.organizationId, organizationId),
            eq(purchaseOrder.isDeleted, false)
        ),
        columns: { id: true },
    });
    const poIds = orgPOs.map((po) => po.id);

    if (poIds.length === 0) {
        return alerts;
    }

    // Overdue invoices (critical)
    const now = new Date();
    const overdueInvoices = await db.query.invoice.findMany({
        where: and(
            inArray(invoice.purchaseOrderId, poIds),
            eq(invoice.isDeleted, false),
            not(eq(invoice.status, "PAID")),
            lt(invoice.dueDate, now)
        ),
        with: { purchaseOrder: { with: { supplier: true } } },
        limit: 5,
    });

    if (overdueInvoices.length > 0) {
        const totalOverdue = overdueInvoices.reduce(
            (sum, inv) => sum + (Number(inv.amount) - Number(inv.paidAmount || 0)),
            0
        );
        alerts.push({
            id: "overdue-invoices",
            type: "overdue_payment",
            severity: "critical",
            title: `${overdueInvoices.length} Overdue Payment${overdueInvoices.length !== 1 ? "s" : ""}`,
            description: `Total outstanding: $${(totalOverdue / 1000).toFixed(1)}K`,
            href: "/dashboard/procurement?tab=invoices&filter=overdue",
            actionLabel: "Review Payments",
            count: overdueInvoices.length,
            createdAt: overdueInvoices[0].dueDate || now,
        });
    }

    // Open NCRs (warning/critical based on severity)
    const openNCRs = await db.query.ncr.findMany({
        where: and(
            inArray(ncr.purchaseOrderId, poIds),
            eq(ncr.isDeleted, false),
            not(eq(ncr.status, "CLOSED"))
        ),
        with: { purchaseOrder: { with: { supplier: true } } },
        orderBy: [desc(ncr.createdAt)],
        limit: 5,
    });

    const criticalNCRs = openNCRs.filter(
        (n) => n.severity === "CRITICAL" || n.severity === "MAJOR"
    );
    if (criticalNCRs.length > 0) {
        alerts.push({
            id: "critical-ncrs",
            type: "quality_alert",
            severity: "critical",
            title: `${criticalNCRs.length} Critical Quality Alert${criticalNCRs.length !== 1 ? "s" : ""}`,
            description: `Requires immediate attention`,
            href: "/dashboard/ncr?filter=critical",
            actionLabel: "View NCRs",
            count: criticalNCRs.length,
            createdAt: criticalNCRs[0].createdAt || now,
        });
    }

    // Pending change orders (warning)
    const pendingCOs = await db.query.changeOrder.findMany({
        where: and(
            inArray(changeOrder.purchaseOrderId, poIds),
            eq(changeOrder.isDeleted, false),
            eq(changeOrder.status, "PENDING")
        ),
        orderBy: [desc(changeOrder.createdAt)],
        limit: 5,
    });

    if (pendingCOs.length > 0) {
        const totalValue = pendingCOs.reduce(
            (sum, co) => sum + Number(co.amountDelta || 0),
            0
        );
        alerts.push({
            id: "pending-cos",
            type: "pending_approval",
            severity: "warning",
            title: `${pendingCOs.length} Change Order${pendingCOs.length !== 1 ? "s" : ""} Pending`,
            description: `Total value: $${Math.abs(totalValue / 1000).toFixed(1)}K`,
            href: "/dashboard/procurement?tab=change-orders",
            actionLabel: "Review Changes",
            count: pendingCOs.length,
            createdAt: pendingCOs[0].createdAt || now,
        });
    }

    // Pending invoices (info)
    const pendingInvoices = await db.query.invoice.findMany({
        where: and(
            inArray(invoice.purchaseOrderId, poIds),
            eq(invoice.isDeleted, false),
            eq(invoice.status, "PENDING_APPROVAL")
        ),
        orderBy: [desc(invoice.createdAt)],
        limit: 5,
    });

    if (pendingInvoices.length > 0) {
        alerts.push({
            id: "pending-invoices",
            type: "pending_invoice",
            severity: "info",
            title: `${pendingInvoices.length} Invoice${pendingInvoices.length !== 1 ? "s" : ""} Awaiting Approval`,
            description: "Review and approve submitted invoices",
            href: "/dashboard/procurement?tab=invoices",
            actionLabel: "Approve Invoices",
            count: pendingInvoices.length,
            createdAt: pendingInvoices[0].createdAt || now,
        });
    }

    // Delayed deliveries (warning)
    const delayedShipments = await db.query.shipment.findMany({
        where: and(
            inArray(shipment.purchaseOrderId, poIds),
            eq(shipment.isDeleted, false),
            not(eq(shipment.status, "DELIVERED")),
            lt(shipment.rosDate, now)
        ),
        with: { purchaseOrder: { with: { supplier: true } } },
        limit: 5,
    });

    if (delayedShipments.length > 0) {
        alerts.push({
            id: "delayed-deliveries",
            type: "delivery_delay",
            severity: "warning",
            title: `${delayedShipments.length} Delivery${delayedShipments.length !== 1 ? "ies" : ""} Delayed`,
            description: "Shipments past their required-on-site date",
            href: "/dashboard/logistics",
            actionLabel: "Track Deliveries",
            count: delayedShipments.length,
            createdAt: delayedShipments[0].rosDate || now,
        });
    }

    // Sort alerts by severity then by date
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return alerts;
}

// Fetch recent activity (last 20 items)
async function fetchRecentActivity(organizationId: string) {
    const activities: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        timestamp: Date;
        icon: string;
        href?: string;
    }> = [];

    // Get PO IDs
    const orgPOs = await db.query.purchaseOrder.findMany({
        where: and(
            eq(purchaseOrder.organizationId, organizationId),
            eq(purchaseOrder.isDeleted, false)
        ),
        columns: { id: true, poNumber: true },
        orderBy: [desc(purchaseOrder.createdAt)],
    });
    const poIds = orgPOs.map((po) => po.id);

    if (poIds.length === 0) {
        return activities;
    }

    // Recent POs
    const recentPOs = await db.query.purchaseOrder.findMany({
        where: and(
            eq(purchaseOrder.organizationId, organizationId),
            eq(purchaseOrder.isDeleted, false)
        ),
        with: { supplier: true },
        orderBy: [desc(purchaseOrder.createdAt)],
        limit: 5,
    });

    for (const po of recentPOs) {
        activities.push({
            id: `po-${po.id}`,
            type: "po_created",
            title: `PO ${po.poNumber} created`,
            description: `${po.supplier?.name || "Unknown supplier"} · $${(Number(po.totalValue) / 1000).toFixed(1)}K`,
            timestamp: po.createdAt || new Date(),
            icon: "file-text",
            href: `/dashboard/procurement/${po.id}`,
        });
    }

    // Recent invoices
    const recentInvoices = await db.query.invoice.findMany({
        where: and(
            inArray(invoice.purchaseOrderId, poIds),
            eq(invoice.isDeleted, false)
        ),
        with: { purchaseOrder: { with: { supplier: true } } },
        orderBy: [desc(invoice.createdAt)],
        limit: 5,
    });

    for (const inv of recentInvoices) {
        activities.push({
            id: `inv-${inv.id}`,
            type: "invoice_received",
            title: `Invoice ${inv.invoiceNumber} received`,
            description: `${inv.purchaseOrder?.supplier?.name || "Unknown"} · $${(Number(inv.amount) / 1000).toFixed(1)}K`,
            timestamp: inv.createdAt || new Date(),
            icon: "receipt",
            href: `/dashboard/procurement/${inv.purchaseOrderId}?tab=invoices`,
        });
    }

    // Recent NCRs
    const recentNCRs = await db.query.ncr.findMany({
        where: and(
            inArray(ncr.purchaseOrderId, poIds),
            eq(ncr.isDeleted, false)
        ),
        with: { purchaseOrder: { with: { supplier: true } } },
        orderBy: [desc(ncr.createdAt)],
        limit: 5,
    });

    for (const n of recentNCRs) {
        activities.push({
            id: `ncr-${n.id}`,
            type: "ncr_raised",
            title: `Quality Alert: ${n.title || n.ncrNumber}`,
            description: `${n.purchaseOrder?.supplier?.name || "Unknown"} · ${n.severity}`,
            timestamp: n.createdAt || new Date(),
            icon: "alert-triangle",
            href: `/dashboard/ncr/${n.id}`,
        });
    }

    // Recent shipments
    const recentShipments = await db.query.shipment.findMany({
        where: and(
            inArray(shipment.purchaseOrderId, poIds),
            eq(shipment.isDeleted, false)
        ),
        with: { purchaseOrder: { with: { supplier: true } } },
        orderBy: [desc(shipment.updatedAt)],
        limit: 5,
    });

    for (const s of recentShipments) {
        activities.push({
            id: `ship-${s.id}`,
            type: "shipment_update",
            title: `Shipment ${s.trackingNumber || s.id.slice(0, 8)} ${(s.status || "pending").toLowerCase().replace("_", " ")}`,
            description: `${s.purchaseOrder?.supplier?.name || "Unknown"}`,
            timestamp: s.updatedAt || new Date(),
            icon: "truck",
            href: `/dashboard/logistics`,
        });
    }

    // Sort by timestamp (most recent first) and limit to 20
    activities.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return activities.slice(0, 20);
}

// Fetch quick stats for the dashboard
async function fetchQuickStats(organizationId: string) {
    try {
        const [financial, progress] = await Promise.all([
            getFinancialKPIs({ organizationId }),
            getProgressKPIs({ organizationId }),
        ]);

        return {
            totalCommitted: financial.totalCommitted,
            totalPaid: financial.totalPaid,
            physicalProgress: progress.physicalProgress,
            activePOs: progress.activePOs,
            milestonesCompleted: progress.milestonesCompleted,
            milestonesTotal: progress.milestonesTotal,
            onTrack: progress.onTrackCount,
            atRisk: progress.atRiskCount,
            delayed: progress.delayedCount,
        };
    } catch {
        return null;
    }
}

// Generate AI-style summary
function generateAISummary(
    projects: Awaited<ReturnType<typeof fetchProjects>>,
    alerts: Awaited<ReturnType<typeof fetchAlerts>>,
    stats: Awaited<ReturnType<typeof fetchQuickStats>>
) {
    if (!stats) {
        return {
            summary: "Welcome to Infradyn! Get started by creating a project and adding purchase orders.",
            sentiment: "neutral" as const,
            keyPoints: [],
        };
    }

    const criticalAlerts = alerts.filter((a) => a.severity === "critical");
    const warningAlerts = alerts.filter((a) => a.severity === "warning");

    let sentiment: "positive" | "neutral" | "negative" = "neutral";
    let summary = "";
    const keyPoints: string[] = [];

    // Determine sentiment
    if (criticalAlerts.length > 0) {
        sentiment = "negative";
    } else if (warningAlerts.length > 0 || stats.delayed > 0) {
        sentiment = "neutral";
    } else if (stats.physicalProgress > 50 && stats.atRisk === 0) {
        sentiment = "positive";
    }

    // Generate summary
    const progressPercent = Math.round(stats.physicalProgress);
    const commitmentStr = stats.totalCommitted >= 1_000_000
        ? `$${(stats.totalCommitted / 1_000_000).toFixed(2)}M`
        : `$${(stats.totalCommitted / 1_000).toFixed(0)}K`;

    if (sentiment === "positive") {
        summary = `Your portfolio is on track at ${progressPercent}% physical progress with ${commitmentStr} committed across ${stats.activePOs} active contracts. All milestones are progressing as planned.`;
    } else if (sentiment === "negative") {
        summary = `Attention required: ${criticalAlerts.length} critical issue${criticalAlerts.length !== 1 ? "s" : ""} need immediate action. Portfolio is at ${progressPercent}% progress with ${stats.delayed} delayed milestone${stats.delayed !== 1 ? "s" : ""}.`;
    } else {
        summary = `Your portfolio is at ${progressPercent}% physical progress with ${commitmentStr} committed. ${stats.atRisk} milestone${stats.atRisk !== 1 ? "s are" : " is"} at risk and ${warningAlerts.length} item${warningAlerts.length !== 1 ? "s" : ""} need attention.`;
    }

    // Generate key points
    if (criticalAlerts.length > 0) {
        keyPoints.push(`${criticalAlerts.length} critical alerts require immediate action`);
    }
    if (stats.delayed > 0) {
        keyPoints.push(`${stats.delayed} milestone${stats.delayed !== 1 ? "s" : ""} are past due`);
    }
    if (stats.milestonesCompleted > 0) {
        keyPoints.push(
            `${stats.milestonesCompleted}/${stats.milestonesTotal} milestones completed`
        );
    }
    const paidPercent = stats.totalCommitted > 0
        ? Math.round((stats.totalPaid / stats.totalCommitted) * 100)
        : 0;
    keyPoints.push(`${paidPercent}% of committed value has been paid`);

    return {
        summary,
        sentiment,
        keyPoints,
    };
}
