import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureActiveOrgForApi } from "@/lib/server/org-access";
import { raiseReceiverNCR, receiverConfirmDelivery } from "@/lib/actions/receiver-actions";

interface OfflineMutationRequest {
    type: "RAISE_NCR" | "CONFIRM_DELIVERY";
    payload: Record<string, unknown>;
}

export async function POST(req: Request) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }
    if (session.user.role !== "SITE_RECEIVER") {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const orgGate = await ensureActiveOrgForApi(session);
    if (!orgGate.ok) return orgGate.response;

    let body: OfflineMutationRequest;
    try {
        body = (await req.json()) as OfflineMutationRequest;
    } catch {
        return NextResponse.json({ success: false, error: "Invalid request payload" }, { status: 400 });
    }

    if (!body?.type || !body?.payload) {
        return NextResponse.json({ success: false, error: "Missing mutation type or payload" }, { status: 400 });
    }

    if (body.type === "RAISE_NCR") {
        const payload = body.payload;
        const formData = new FormData();
        formData.set("purchaseOrderId", String(payload.purchaseOrderId ?? ""));
        formData.set("title", String(payload.title ?? ""));
        formData.set("description", String(payload.description ?? ""));
        formData.set("severity", String(payload.severity ?? ""));
        formData.set("issueType", String(payload.issueType ?? ""));
        if (payload.affectedBoqItemId) {
            formData.set("affectedBoqItemId", String(payload.affectedBoqItemId));
        }

        const result = await raiseReceiverNCR(formData);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    if (body.type === "CONFIRM_DELIVERY") {
        const payload = body.payload;
        const formData = new FormData();
        formData.set("shipmentId", String(payload.shipmentId ?? ""));
        formData.set("isPartial", String(Boolean(payload.isPartial)));
        formData.set("notes", String(payload.notes ?? ""));
        formData.set("photoDocIds", JSON.stringify(payload.photoDocIds ?? []));
        formData.set("items", JSON.stringify(payload.items ?? []));

        const result = await receiverConfirmDelivery(formData);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    return NextResponse.json({ success: false, error: "Unsupported mutation type" }, { status: 400 });
}
