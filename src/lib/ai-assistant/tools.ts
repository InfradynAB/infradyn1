/**
 * AI Assistant — Tool Definitions & Executor
 *
 * Each tool wraps an existing server action or DB query.
 * Tools are role-scoped: some are PM-only, some supplier-only.
 *
 * The executor receives a tool name + args from OpenAI and
 * dispatches to the correct handler, returning a JSON string.
 */

import db from "@/db/drizzle";
import {
    purchaseOrder, shipment, ncr, invoice, milestone,
    project, supplier, notification, shipmentEvent,
    conflictRecord,
} from "@/db/schema";
import { eq, and, desc, inArray, sql, not, lt, gte, isNull } from "drizzle-orm";

import type { AssistantUserContext } from "./types";

// ============================================================================
// Tool Registry (OpenAI function-calling format)
// ============================================================================

export function getToolDefinitions(ctx: AssistantUserContext) {
    const tools: Array<{
        type: "function";
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    }> = [];

    // ------ Universal tools (available to all roles) ------

    tools.push({
        type: "function",
        name: "get_my_notifications",
        description: "Get the user's recent notifications and alerts.",
        parameters: {
            type: "object",
            properties: {},
            required: [],
        },
    });

    tools.push({
        type: "function",
        name: "get_purchase_orders",
        description: "List purchase orders. Can filter by status. Returns PO number, supplier, status, and value.",
        parameters: {
            type: "object",
            properties: {
                status: {
                    type: "string",
                    enum: ["DRAFT", "ISSUED", "ACCEPTED", "ACTIVE", "COMPLETED", "CANCELLED", "PENDING_RESPONSE"],
                    description: "Optional status filter",
                },
            },
            required: [],
        },
    });

    tools.push({
        type: "function",
        name: "get_open_ncrs",
        description: "Get open Non-Conformance Reports (NCRs). Shows NCR number, title, severity, status, and supplier.",
        parameters: {
            type: "object",
            properties: {},
            required: [],
        },
    });

    tools.push({
        type: "function",
        name: "get_active_shipments",
        description: "Get active shipments (dispatched, in transit, pending). Shows tracking info, carrier, status, and ETAs.",
        parameters: {
            type: "object",
            properties: {},
            required: [],
        },
    });

    tools.push({
        type: "function",
        name: "explain_feature",
        description: "Explain how a specific feature of the Infradyn platform works. Use this when the user asks 'how to' do something.",
        parameters: {
            type: "object",
            properties: {
                feature: {
                    type: "string",
                    description: "The feature to explain, e.g. 'create a purchase order', 'submit a shipment', 'file an NCR'",
                },
            },
            required: ["feature"],
        },
    });

    tools.push({
        type: "function",
        name: "navigate_to_page",
        description: "Suggest a page the user should navigate to. Returns a URL path that the frontend will navigate to.",
        parameters: {
            type: "object",
            properties: {
                page: {
                    type: "string",
                    enum: [
                        "dashboard", "procurement", "ncr", "logistics",
                        "analytics", "suppliers", "settings", "invoices",
                    ],
                    description: "The page to navigate to",
                },
            },
            required: ["page"],
        },
    });

    // ------ PM-only tools ------

    if (ctx.role !== "SUPPLIER") {
        tools.push({
            type: "function",
            name: "get_project_overview",
            description: "Get a project health overview: total POs, progress percentage, delayed items, at-risk count, financial summary.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        });

        tools.push({
            type: "function",
            name: "get_supplier_performance",
            description: "Get performance metrics for a specific supplier or all suppliers. Shows reliability score, response rate, conflict rate.",
            parameters: {
                type: "object",
                properties: {
                    supplierName: {
                        type: "string",
                        description: "Optional supplier name to filter by",
                    },
                },
                required: [],
            },
        });

        tools.push({
            type: "function",
            name: "get_pending_approvals",
            description: "Get items awaiting PM approval: pending invoices, pending change orders, NCRs needing review.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        });
    }

    // ------ Supplier-only tools ------

    if (ctx.role === "SUPPLIER") {
        tools.push({
            type: "function",
            name: "get_my_action_items",
            description: "Get the supplier's pending action items: POs to respond to, NCRs to address, overdue deliveries, upcoming milestones.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        });
    }

    return tools;
}

// ============================================================================
// Tool Executor
// ============================================================================

/**
 * Execute a tool call and return the result as a JSON string.
 */
export async function executeTool(
    toolName: string,
    args: Record<string, unknown>,
    ctx: AssistantUserContext,
): Promise<string> {
    try {
        switch (toolName) {
            case "get_my_notifications":
                return await toolGetNotifications(ctx);
            case "get_purchase_orders":
                return await toolGetPurchaseOrders(ctx, args.status as string | undefined);
            case "get_open_ncrs":
                return await toolGetOpenNCRs(ctx);
            case "get_active_shipments":
                return await toolGetActiveShipments(ctx);
            case "get_project_overview":
                return await toolGetProjectOverview(ctx);
            case "get_supplier_performance":
                return await toolGetSupplierPerformance(ctx, args.supplierName as string | undefined);
            case "get_pending_approvals":
                return await toolGetPendingApprovals(ctx);
            case "get_my_action_items":
                return await toolGetSupplierActionItems(ctx);
            case "explain_feature":
                return toolExplainFeature(args.feature as string, ctx);
            case "navigate_to_page":
                return toolNavigateToPage(args.page as string, ctx);
            default:
                return JSON.stringify({ error: `Unknown tool: ${toolName}` });
        }
    } catch (err) {
        console.error(`[AI_TOOL:${toolName}]`, err);
        return JSON.stringify({
            error: `Failed to run ${toolName}`,
            detail: err instanceof Error ? err.message : "Unknown error",
        });
    }
}

// ============================================================================
// Tool Implementations
// ============================================================================

async function toolGetNotifications(ctx: AssistantUserContext): Promise<string> {
    const notifications = await db.query.notification.findMany({
        where: eq(notification.userId, ctx.userId),
        orderBy: desc(notification.createdAt),
        limit: 10,
    });

    if (notifications.length === 0) {
        return JSON.stringify({ message: "No notifications found.", notifications: [] });
    }

    return JSON.stringify({
        count: notifications.length,
        notifications: notifications.map((n) => ({
            title: n.title,
            message: n.message,
            type: n.type,
            read: !!n.readAt,
            date: n.createdAt,
        })),
    });
}

async function toolGetPurchaseOrders(
    ctx: AssistantUserContext,
    statusFilter?: string,
): Promise<string> {
    // Build conditions based on role
    const conditions = [eq(purchaseOrder.isDeleted, false)];

    if (ctx.role === "SUPPLIER" && ctx.supplierId) {
        conditions.push(eq(purchaseOrder.supplierId, ctx.supplierId));
    } else if (ctx.organizationId) {
        conditions.push(eq(purchaseOrder.organizationId, ctx.organizationId));
        if (ctx.activeProjectId) {
            conditions.push(eq(purchaseOrder.projectId, ctx.activeProjectId));
        }
    }

    if (statusFilter) {
        conditions.push(eq(purchaseOrder.status, statusFilter));
    }

    const pos = await db.query.purchaseOrder.findMany({
        where: and(...conditions),
        with: { supplier: { columns: { name: true } } },
        orderBy: desc(purchaseOrder.createdAt),
        limit: 15,
    });

    if (pos.length === 0) {
        return JSON.stringify({ message: "No purchase orders found.", purchaseOrders: [] });
    }

    return JSON.stringify({
        count: pos.length,
        purchaseOrders: pos.map((po) => ({
            poNumber: po.poNumber,
            status: po.status,
            supplier: po.supplier?.name ?? "Unassigned",
            totalValue: po.totalValue,
            currency: po.currency,
            createdAt: po.createdAt,
        })),
    });
}

async function toolGetOpenNCRs(ctx: AssistantUserContext): Promise<string> {
    const conditions = [
        eq(ncr.isDeleted, false),
        not(eq(ncr.status, "CLOSED")),
    ];

    if (ctx.role === "SUPPLIER" && ctx.supplierId) {
        conditions.push(eq(ncr.supplierId, ctx.supplierId));
    } else if (ctx.organizationId) {
        conditions.push(eq(ncr.organizationId, ctx.organizationId));
    }

    const ncrs = await db.query.ncr.findMany({
        where: and(...conditions),
        with: { supplier: { columns: { name: true } } },
        orderBy: desc(ncr.createdAt),
        limit: 15,
    });

    if (ncrs.length === 0) {
        return JSON.stringify({ message: "No open NCRs.", ncrs: [] });
    }

    return JSON.stringify({
        count: ncrs.length,
        ncrs: ncrs.map((n) => ({
            ncrNumber: n.ncrNumber,
            title: n.title,
            severity: n.severity,
            status: n.status,
            supplier: n.supplier?.name ?? "Unknown",
            createdAt: n.createdAt,
        })),
    });
}

async function toolGetActiveShipments(ctx: AssistantUserContext): Promise<string> {
    // First get PO IDs the user can access
    const poConditions = [eq(purchaseOrder.isDeleted, false)];

    if (ctx.role === "SUPPLIER" && ctx.supplierId) {
        poConditions.push(eq(purchaseOrder.supplierId, ctx.supplierId));
    } else if (ctx.organizationId) {
        poConditions.push(eq(purchaseOrder.organizationId, ctx.organizationId));
        if (ctx.activeProjectId) {
            poConditions.push(eq(purchaseOrder.projectId, ctx.activeProjectId));
        }
    }

    const pos = await db.query.purchaseOrder.findMany({
        where: and(...poConditions),
        columns: { id: true },
    });

    const poIds = pos.map((po) => po.id);
    if (poIds.length === 0) {
        return JSON.stringify({ message: "No shipments found.", shipments: [] });
    }

    const shipments = await db.query.shipment.findMany({
        where: and(
            inArray(shipment.purchaseOrderId, poIds),
            inArray(shipment.status, ["PENDING", "DISPATCHED", "IN_TRANSIT", "OUT_FOR_DELIVERY"]),
        ),
        with: {
            supplier: { columns: { name: true } },
            events: { orderBy: desc(shipmentEvent.eventTime), limit: 1 },
        },
        orderBy: desc(shipment.createdAt),
        limit: 10,
    });

    if (shipments.length === 0) {
        return JSON.stringify({ message: "No active shipments.", shipments: [] });
    }

    return JSON.stringify({
        count: shipments.length,
        shipments: shipments.map((s) => ({
            status: s.status,
            carrier: s.carrier ?? s.provider,
            trackingNumber: s.trackingNumber ?? s.containerNumber ?? s.waybillNumber,
            origin: s.originLocation,
            destination: s.destination,
            dispatchDate: s.dispatchDate,
            eta: s.logisticsEta ?? s.supplierAos,
            etaConfidence: s.etaConfidence,
            lastEvent: s.events?.[0]?.description ?? null,
            supplier: s.supplier?.name ?? "Unknown",
        })),
    });
}

async function toolGetProjectOverview(ctx: AssistantUserContext): Promise<string> {
    if (!ctx.organizationId) {
        return JSON.stringify({ error: "No organization context." });
    }

    const projectConditions = [
        eq(project.organizationId, ctx.organizationId),
        eq(project.isDeleted, false),
    ];
    if (ctx.activeProjectId) {
        projectConditions.push(eq(project.id, ctx.activeProjectId));
    }

    const projects = await db.query.project.findMany({
        where: and(...projectConditions),
        columns: { id: true, name: true, code: true, budget: true, currency: true },
    });

    if (projects.length === 0) {
        return JSON.stringify({ message: "No projects found." });
    }

    // Aggregate stats across selected projects
    const projectIds = projects.map((p) => p.id);

    const poConditions = [
        eq(purchaseOrder.isDeleted, false),
        eq(purchaseOrder.organizationId, ctx.organizationId),
    ];
    if (ctx.activeProjectId) {
        poConditions.push(eq(purchaseOrder.projectId, ctx.activeProjectId));
    }

    const [poStats, ncrStats, shipmentStats] = await Promise.all([
        // PO stats
        db.select({
            total: sql<number>`count(*)::int`,
            active: sql<number>`count(*) filter (where ${purchaseOrder.status} = 'ACTIVE')::int`,
            draft: sql<number>`count(*) filter (where ${purchaseOrder.status} = 'DRAFT')::int`,
            completed: sql<number>`count(*) filter (where ${purchaseOrder.status} = 'COMPLETED')::int`,
        }).from(purchaseOrder).where(and(...poConditions)),

        // NCR stats
        db.select({
            total: sql<number>`count(*)::int`,
            open: sql<number>`count(*) filter (where ${ncr.status} != 'CLOSED')::int`,
            critical: sql<number>`count(*) filter (where ${ncr.severity} = 'CRITICAL' and ${ncr.status} != 'CLOSED')::int`,
        }).from(ncr).where(
            and(eq(ncr.organizationId, ctx.organizationId), eq(ncr.isDeleted, false)),
        ),

        // Shipment stats
        db.select({
            active: sql<number>`count(*) filter (where ${shipment.status} in ('PENDING','DISPATCHED','IN_TRANSIT','OUT_FOR_DELIVERY'))::int`,
            delivered: sql<number>`count(*) filter (where ${shipment.status} = 'DELIVERED')::int`,
        }).from(shipment).where(
            inArray(shipment.purchaseOrderId,
                db.select({ id: purchaseOrder.id }).from(purchaseOrder).where(and(...poConditions))
            ),
        ),
    ]);

    return JSON.stringify({
        projects: projects.map((p) => ({ name: p.name, code: p.code })),
        purchaseOrders: poStats[0],
        ncrs: ncrStats[0],
        shipments: shipmentStats[0],
    });
}

async function toolGetSupplierPerformance(
    ctx: AssistantUserContext,
    supplierNameFilter?: string,
): Promise<string> {
    if (!ctx.organizationId) {
        return JSON.stringify({ error: "No organization context." });
    }

    const conditions = [eq(purchaseOrder.organizationId, ctx.organizationId), eq(purchaseOrder.isDeleted, false)];
    const pos = await db.query.purchaseOrder.findMany({
        where: and(...conditions),
        with: { supplier: true },
    });

    // Group by supplier
    const supplierMap = new Map<string, { name: string; totalPOs: number; statuses: string[] }>();
    for (const po of pos) {
        if (!po.supplier) continue;
        if (supplierNameFilter && !po.supplier.name.toLowerCase().includes(supplierNameFilter.toLowerCase())) continue;

        const entry = supplierMap.get(po.supplierId!) ?? {
            name: po.supplier.name,
            totalPOs: 0,
            statuses: [],
        };
        entry.totalPOs++;
        entry.statuses.push(po.status);
        supplierMap.set(po.supplierId!, entry);
    }

    const suppliers = Array.from(supplierMap.entries()).map(([id, data]) => ({
        name: data.name,
        totalPOs: data.totalPOs,
        activePOs: data.statuses.filter((s) => s === "ACTIVE").length,
        completedPOs: data.statuses.filter((s) => s === "COMPLETED").length,
    }));

    if (suppliers.length === 0) {
        return JSON.stringify({ message: "No suppliers found matching criteria." });
    }

    return JSON.stringify({ count: suppliers.length, suppliers });
}

async function toolGetPendingApprovals(ctx: AssistantUserContext): Promise<string> {
    if (!ctx.organizationId) {
        return JSON.stringify({ error: "No organization context." });
    }

    const poConditions = [
        eq(purchaseOrder.organizationId, ctx.organizationId),
        eq(purchaseOrder.isDeleted, false),
    ];

    const pos = await db.query.purchaseOrder.findMany({
        where: and(...poConditions),
        columns: { id: true },
    });

    const poIds = pos.map((po) => po.id);

    if (poIds.length === 0) {
        return JSON.stringify({
            pendingInvoices: 0,
            pendingChangeOrders: 0,
            openNCRs: 0,
        });
    }

    const [invoices, conflicts] = await Promise.all([
        db.query.invoice.findMany({
            where: and(
                inArray(invoice.purchaseOrderId, poIds),
                eq(invoice.status, "PENDING_APPROVAL"),
            ),
            columns: { id: true, invoiceNumber: true },
            limit: 10,
        }),
        db.query.conflictRecord.findMany({
            where: and(
                inArray(conflictRecord.purchaseOrderId, poIds),
                eq(conflictRecord.state, "OPEN"),
            ),
            columns: { id: true, type: true, severity: true },
            limit: 10,
        }),
    ]);

    return JSON.stringify({
        pendingInvoices: invoices.length,
        invoices: invoices.map((i) => ({ invoiceNumber: i.invoiceNumber })),
        openConflicts: conflicts.length,
        conflicts: conflicts.map((c) => ({ type: c.type, severity: c.severity })),
    });
}

async function toolGetSupplierActionItems(ctx: AssistantUserContext): Promise<string> {
    if (!ctx.supplierId) {
        return JSON.stringify({ error: "No supplier context. Please contact support." });
    }

    const poFilter = eq(purchaseOrder.supplierId, ctx.supplierId);

    const supplierPos = await db.query.purchaseOrder.findMany({
        where: poFilter,
        columns: { id: true, status: true },
    });

    const poIds = supplierPos.map((po) => po.id);

    if (poIds.length === 0) {
        return JSON.stringify({
            message: "No purchase orders found for your account.",
            actionItems: { openNcrs: 0, pendingPos: 0, activeShipments: 0, overdueDeliveries: 0 },
        });
    }

    const pendingPos = supplierPos.filter(
        (po) => po.status === "PENDING_RESPONSE" || po.status === "ISSUED",
    ).length;

    const [openNcrResult, activeShipmentResult, overdueResult] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(ncr).where(
            and(eq(ncr.supplierId, ctx.supplierId), inArray(ncr.status, ["OPEN", "REINSPECTION"])),
        ),
        db.select({ count: sql<number>`count(*)::int` }).from(shipment).where(
            and(
                inArray(shipment.purchaseOrderId, poIds),
                inArray(shipment.status, ["DISPATCHED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "PENDING"]),
            ),
        ),
        db.select({ count: sql<number>`count(*)::int` }).from(shipment).where(
            and(
                inArray(shipment.purchaseOrderId, poIds),
                inArray(shipment.status, ["DISPATCHED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "PENDING"]),
                lt(sql`COALESCE(${shipment.logisticsEta}, ${shipment.supplierAos})`, new Date()),
            ),
        ),
    ]);

    return JSON.stringify({
        actionItems: {
            pendingPos,
            openNcrs: openNcrResult[0]?.count ?? 0,
            activeShipments: activeShipmentResult[0]?.count ?? 0,
            overdueDeliveries: overdueResult[0]?.count ?? 0,
        },
    });
}

// ============================================================================
// Static/Utility Tools
// ============================================================================

function toolExplainFeature(feature: string, ctx?: AssistantUserContext): string {
    const isSupplier = ctx?.role === "SUPPLIER";

    // Role-aware feature guides
    const featureGuides: Record<string, { pm: string; supplier: string }> = {
        "purchase order": {
            pm: "To create a Purchase Order: Go to Dashboard → Procurement → click 'New PO'. Fill in the project, supplier, currency, and upload a BOQ document. The system will extract line items automatically using AI.",
            supplier: "To view your Purchase Orders: Go to Dashboard → POs. You'll see all POs assigned to you. Click on any PO to view its details, BOQ line items, and associated documents.",
        },
        "ncr": {
            pm: "To file an NCR: Go to Dashboard → Quality (NCR) → click 'New NCR'. Select the PO, supplier, severity level, and describe the issue. You can upload photos of the defect. The supplier will be notified automatically.",
            supplier: "To respond to an NCR: Go to Dashboard → POs → open the specific PO that has the NCR. Scroll down to the NCR section at the bottom of the PO details page. From there you can view the NCR details and submit your response.",
        },
        "shipment": {
            pm: "To view shipments: Go to Dashboard → Logistics. You can track all active shipments, view ETAs, and see delivery statuses.",
            supplier: "To submit a shipment: Go to your PO details → click 'Add Shipment'. Select your logistics provider (Maersk/DHL/Other), enter tracking details, and optionally upload a packing list for AI extraction.",
        },
        "invoice": {
            pm: "To review invoices: Go to Dashboard → Invoices, or open a specific PO → Invoices tab. You can approve or reject submitted invoices there.",
            supplier: "To submit an invoice: Go to your PO details → Invoices tab → 'Upload Invoice'. The system will match line items to the BOQ automatically.",
        },
        "supplier": {
            pm: "To manage suppliers: Go to Dashboard → Suppliers. You can invite new suppliers, view their performance score, and track their compliance status.",
            supplier: "To view your profile and performance: Go to Dashboard → Settings. You can see your reliability score, response rate, and compliance status.",
        },
        "analytics": {
            pm: "The Analytics dashboard shows S-Curve charts (planned vs actual spend), project health heatmaps, supplier performance rankings, and NCR trend analysis.",
            supplier: "You can view your delivery performance and compliance metrics from the Dashboard homepage, which shows your action items and key stats.",
        },
    };

    // Fuzzy match
    const key = Object.keys(featureGuides).find((k) =>
        feature.toLowerCase().includes(k),
    );

    if (key) {
        const guide = featureGuides[key];
        return JSON.stringify({ explanation: isSupplier ? guide.supplier : guide.pm });
    }

    return JSON.stringify({
        explanation: `I can help explain features like: ${Object.keys(featureGuides).join(", ")}. Could you be more specific about what you'd like to know?`,
    });
}

function toolNavigateToPage(page: string, ctx: AssistantUserContext): string {
    const routeMap: Record<string, string> = {
        dashboard: "/dashboard",
        procurement: "/dashboard/procurement",
        ncr: "/dashboard/ncr",
        logistics: "/dashboard/logistics",
        analytics: "/dashboard/analytics",
        suppliers: "/dashboard/suppliers",
        settings: "/dashboard/settings",
        invoices: "/dashboard/invoices",
    };

    // Supplier-specific overrides
    if (ctx.role === "SUPPLIER") {
        routeMap.dashboard = "/dashboard/supplier";
        routeMap.procurement = "/dashboard/supplier/pos";
    }

    const url = routeMap[page] ?? "/dashboard";

    return JSON.stringify({ action: "navigate", url, label: page });
}
