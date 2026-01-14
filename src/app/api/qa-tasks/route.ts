import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { listPendingQaTasks, updateQaTask } from "@/lib/actions/delivery-engine";
import db from "@/db/drizzle";
import { qaInspectionTask } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const purchaseOrderId = searchParams.get("purchaseOrderId");
        const status = searchParams.get("status");

        if (status === "pending") {
            const tasks = await listPendingQaTasks(purchaseOrderId || undefined);
            return NextResponse.json({ tasks });
        }

        // Default: get all tasks for a PO or all pending
        const tasks = purchaseOrderId
            ? await db.query.qaInspectionTask.findMany({
                where: eq(qaInspectionTask.purchaseOrderId, purchaseOrderId),
                with: { deliveryReceipt: true, purchaseOrder: true },
            })
            : await listPendingQaTasks();

        return NextResponse.json({ tasks });
    } catch (error) {
        console.error("[GET /api/qa-tasks] Error:", error);
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
        const { taskId, ...data } = body;

        if (!taskId) {
            return NextResponse.json({ error: "taskId required" }, { status: 400 });
        }

        const updated = await updateQaTask(taskId, {
            status: data.status,
            assignedTo: data.assignedTo || session.user.id,
            inspectionNotes: data.inspectionNotes,
            passedItems: data.passedItems,
            failedItems: data.failedItems,
            ncrRequired: data.ncrRequired,
        });

        if (!updated) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, task: updated });
    } catch (error) {
        console.error("[PATCH /api/qa-tasks] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
