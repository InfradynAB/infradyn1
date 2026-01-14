import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { comment } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Phase 6: Comment API
 * 
 * Versioned commenting system for POs, shipments, deliveries, and QA tasks.
 */

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const parentType = searchParams.get("parentType") as "PO" | "SHIPMENT" | "DELIVERY" | "QA_TASK" | "INVOICE";
        const parentId = searchParams.get("parentId");

        if (!parentType || !parentId) {
            return NextResponse.json({ error: "parentType and parentId required" }, { status: 400 });
        }

        const comments = await db.query.comment.findMany({
            where: and(
                eq(comment.parentType, parentType),
                eq(comment.parentId, parentId),
                eq(comment.isDeleted, false)
            ),
            with: {
                user: {
                    columns: { id: true, name: true, email: true }
                }
            },
            orderBy: desc(comment.createdAt),
        });

        return NextResponse.json({ comments });
    } catch (error) {
        console.error("[GET /api/comments] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { parentType, parentId, content } = body;

        if (!parentType || !parentId || !content) {
            return NextResponse.json({ error: "parentType, parentId, and content required" }, { status: 400 });
        }

        // Determine user role for the comment
        const userRole = session.user.role || "PM";

        const [newComment] = await db.insert(comment).values({
            parentType,
            parentId,
            userId: session.user.id,
            userRole,
            content,
            version: 1,
        }).returning();

        return NextResponse.json({ success: true, comment: newComment });
    } catch (error) {
        console.error("[POST /api/comments] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { commentId, content } = body;

        if (!commentId || !content) {
            return NextResponse.json({ error: "commentId and content required" }, { status: 400 });
        }

        // Get existing comment
        const existing = await db.query.comment.findFirst({
            where: eq(comment.id, commentId),
        });

        if (!existing) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        // Only author can edit
        if (existing.userId !== session.user.id) {
            return NextResponse.json({ error: "Cannot edit another user's comment" }, { status: 403 });
        }

        // Create new version
        const [newVersion] = await db.insert(comment).values({
            parentType: existing.parentType,
            parentId: existing.parentId,
            userId: existing.userId,
            userRole: existing.userRole,
            content,
            version: (existing.version ?? 0) + 1,
            previousVersionId: existing.id,
            isEdited: true,
            editedAt: new Date(),
        }).returning();

        // Mark old version as superseded (could also soft delete)
        await db.update(comment)
            .set({ isDeleted: true })
            .where(eq(comment.id, existing.id));

        return NextResponse.json({ success: true, comment: newVersion });
    } catch (error) {
        console.error("[PATCH /api/comments] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const commentId = searchParams.get("commentId");

        if (!commentId) {
            return NextResponse.json({ error: "commentId required" }, { status: 400 });
        }

        const existing = await db.query.comment.findFirst({
            where: eq(comment.id, commentId),
        });

        if (!existing) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        // Only author or admin can delete
        if (existing.userId !== session.user.id && session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Cannot delete another user's comment" }, { status: 403 });
        }

        await db.update(comment)
            .set({ isDeleted: true })
            .where(eq(comment.id, commentId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[DELETE /api/comments] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
