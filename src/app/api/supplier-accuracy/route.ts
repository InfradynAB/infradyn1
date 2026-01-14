import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { supplierAccuracy, supplier } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/supplier-accuracy - List supplier accuracy records
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get suppliers for this organization with their accuracy data
        const records = await db.query.supplierAccuracy.findMany({
            with: {
                supplier: {
                    columns: {
                        id: true,
                        name: true,
                        contactEmail: true,
                        organizationId: true,
                    },
                },
            },
        });

        // Filter by organization
        const orgSuppliers = records.filter(
            (s) => s.supplier?.organizationId === session.user.organizationId
        );

        return NextResponse.json({
            suppliers: orgSuppliers.map((s) => ({
                id: s.id,
                supplierId: s.supplierId,
                supplier: {
                    ...s.supplier,
                    email: s.supplier?.contactEmail, // Map contactEmail to email for display
                },
                totalShipments: s.totalShipments || 0,
                onTimeDeliveries: s.onTimeDeliveries || 0,
                lateDeliveries: s.lateDeliveries || 0,
                accuracyScore: parseFloat(s.accuracyScore || "0"),
                autoAcceptEnabled: s.autoAcceptEnabled || false,
                autoAcceptThreshold: parseFloat(s.autoAcceptThreshold || "90"),
                lastCalculatedAt: s.lastCalculatedAt,
            })),
        });
    } catch (error) {
        console.error("[SupplierAccuracy GET] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch supplier accuracy" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/supplier-accuracy - Update supplier accuracy settings
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { supplierId, autoAcceptEnabled, autoAcceptThreshold } = body;

        if (!supplierId) {
            return NextResponse.json(
                { error: "Missing supplierId" },
                { status: 400 }
            );
        }

        // Verify supplier belongs to org
        const supplierRecord = await db.query.supplier.findFirst({
            where: and(
                eq(supplier.id, supplierId),
                eq(supplier.organizationId, session.user.organizationId)
            ),
        });

        if (!supplierRecord) {
            return NextResponse.json(
                { error: "Supplier not found" },
                { status: 404 }
            );
        }

        // Check if accuracy record exists
        const existing = await db.query.supplierAccuracy.findFirst({
            where: eq(supplierAccuracy.supplierId, supplierId),
        });

        const updates: Record<string, unknown> = {
            updatedAt: new Date(),
        };

        if (autoAcceptEnabled !== undefined) {
            updates.autoAcceptEnabled = autoAcceptEnabled;
        }
        if (autoAcceptThreshold !== undefined) {
            updates.autoAcceptThreshold = autoAcceptThreshold.toString();
        }

        if (existing) {
            await db.update(supplierAccuracy)
                .set(updates)
                .where(eq(supplierAccuracy.id, existing.id));
        } else {
            await db.insert(supplierAccuracy).values({
                supplierId,
                ...updates,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[SupplierAccuracy PATCH] Error:", error);
        return NextResponse.json(
            { error: "Failed to update supplier accuracy" },
            { status: 500 }
        );
    }
}
