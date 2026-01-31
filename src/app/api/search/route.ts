import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import {
    purchaseOrder,
    supplier,
    invoice,
    ncr,
    project,
} from "@/db/schema";
import { eq, and, ilike, or, inArray } from "drizzle-orm";

interface SearchResult {
    id: string;
    type: "project" | "po" | "supplier" | "invoice" | "ncr";
    title: string;
    subtitle?: string;
    href: string;
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organizationId = session.user.organizationId;
        if (!organizationId) {
            return NextResponse.json({ results: [] });
        }

        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get("q")?.trim();

        if (!query || query.length < 2) {
            return NextResponse.json({ results: [] });
        }

        const searchPattern = `%${query}%`;
        const results: SearchResult[] = [];

        // Search in parallel
        const [projects, pos, suppliers, invoices, ncrs] = await Promise.all([
            // Search projects
            db.query.project.findMany({
                where: and(
                    eq(project.organizationId, organizationId),
                    eq(project.isDeleted, false),
                    or(
                        ilike(project.name, searchPattern),
                        ilike(project.code, searchPattern)
                    )
                ),
                limit: 5,
            }),

            // Search POs
            db.query.purchaseOrder.findMany({
                where: and(
                    eq(purchaseOrder.organizationId, organizationId),
                    eq(purchaseOrder.isDeleted, false),
                    ilike(purchaseOrder.poNumber, searchPattern)
                ),
                with: { supplier: true },
                limit: 5,
            }),

            // Search suppliers
            db.query.supplier.findMany({
                where: and(
                    eq(supplier.organizationId, organizationId),
                    eq(supplier.isDeleted, false),
                    or(
                        ilike(supplier.name, searchPattern),
                        ilike(supplier.contactEmail, searchPattern)
                    )
                ),
                limit: 5,
            }),

            // Search invoices (need to get PO IDs first)
            (async () => {
                const orgPOs = await db.query.purchaseOrder.findMany({
                    where: and(
                        eq(purchaseOrder.organizationId, organizationId),
                        eq(purchaseOrder.isDeleted, false)
                    ),
                    columns: { id: true },
                });
                const poIds = orgPOs.map((po) => po.id);
                if (poIds.length === 0) return [];

                return db.query.invoice.findMany({
                    where: and(
                        inArray(invoice.purchaseOrderId, poIds),
                        eq(invoice.isDeleted, false),
                        ilike(invoice.invoiceNumber, searchPattern)
                    ),
                    with: { purchaseOrder: { with: { supplier: true } } },
                    limit: 5,
                });
            })(),

            // Search NCRs
            (async () => {
                const orgPOs = await db.query.purchaseOrder.findMany({
                    where: and(
                        eq(purchaseOrder.organizationId, organizationId),
                        eq(purchaseOrder.isDeleted, false)
                    ),
                    columns: { id: true },
                });
                const poIds = orgPOs.map((po) => po.id);
                if (poIds.length === 0) return [];

                return db.query.ncr.findMany({
                    where: and(
                        inArray(ncr.purchaseOrderId, poIds),
                        eq(ncr.isDeleted, false),
                        or(
                            ilike(ncr.ncrNumber, searchPattern),
                            ilike(ncr.title, searchPattern)
                        )
                    ),
                    with: { purchaseOrder: { with: { supplier: true } } },
                    limit: 5,
                });
            })(),
        ]);

        // Map projects
        for (const p of projects) {
            results.push({
                id: p.id,
                type: "project",
                title: p.name,
                subtitle: p.code || undefined,
                href: `/dashboard/analytics?project=${p.id}`,
            });
        }

        // Map POs
        for (const po of pos) {
            results.push({
                id: po.id,
                type: "po",
                title: po.poNumber,
                subtitle: `${po.supplier?.name || "Unknown"} · $${(Number(po.totalValue) / 1000).toFixed(1)}K`,
                href: `/dashboard/procurement/${po.id}`,
            });
        }

        // Map suppliers
        for (const s of suppliers) {
            results.push({
                id: s.id,
                type: "supplier",
                title: s.name,
                subtitle: s.contactEmail || undefined,
                href: `/dashboard/suppliers/${s.id}`,
            });
        }

        // Map invoices
        for (const inv of invoices) {
            results.push({
                id: inv.id,
                type: "invoice",
                title: inv.invoiceNumber,
                subtitle: `${inv.purchaseOrder?.supplier?.name || "Unknown"} · $${(Number(inv.amount) / 1000).toFixed(1)}K`,
                href: `/dashboard/procurement/${inv.purchaseOrderId}?tab=invoices`,
            });
        }

        // Map NCRs
        for (const n of ncrs) {
            results.push({
                id: n.id,
                type: "ncr",
                title: n.title || n.ncrNumber,
                subtitle: `${n.purchaseOrder?.supplier?.name || "Unknown"} · ${n.severity}`,
                href: `/dashboard/ncr/${n.id}`,
            });
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error("[/api/search] Error:", error);
        return NextResponse.json(
            { error: "Search failed", results: [] },
            { status: 500 }
        );
    }
}
