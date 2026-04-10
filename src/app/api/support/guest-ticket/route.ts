import { NextRequest, NextResponse } from "next/server";
import db from "@/db/drizzle";
import { supportTicket, user } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { sendTicketAdminNotify, sendTicketCreatedToUser } from "@/lib/services/email";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/actions/support-constants";
import { adminNotifyOrganizationStatusFromAccessBlockedReason } from "@/lib/constants/organization-lifecycle";

type GuestBody = {
    email?: string;
    name?: string;
    organizationName?: string;
    formerOrgSlug?: string;
    subject?: string;
    description?: string;
    website?: string;
    /** Passed through to admin guest-ticket API for highlighted org-blocked notifications. */
    accessBlockedReason?: "org_suspended" | "org_terminated";
};

function normalizeBase(raw: string): string {
    return raw.trim().replace(/\/$/, "");
}

function adminBaseFromEnv(): string {
    const raw = process.env.ADMIN_APP_URL?.trim() || process.env.NEXT_PUBLIC_ADMIN_APP_URL?.trim() || "";
    return raw ? normalizeBase(raw) : "";
}

function isSameOrigin(a: string, b: string): boolean {
    try {
        return new URL(a).origin === new URL(b).origin;
    } catch {
        return false;
    }
}

function sanitizeGuestBody(raw: GuestBody): GuestBody {
    const accessBlockedReason =
        raw.accessBlockedReason === "org_suspended" || raw.accessBlockedReason === "org_terminated"
            ? raw.accessBlockedReason
            : undefined;
    return {
        ...raw,
        accessBlockedReason,
    };
}

async function forwardUpstream(res: Response): Promise<NextResponse> {
    const text = await res.text();
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
        try {
            return NextResponse.json(JSON.parse(text) as object, { status: res.status });
        } catch {
            return NextResponse.json({ error: "Invalid response from support service" }, { status: 502 });
        }
    }
    return new NextResponse(text || null, { status: res.status });
}

async function postAdminSupportTicketWebhook(
    requestOrigin: string,
    payload: {
        ticketId: string;
        ticketNumber: string;
        subject: string;
        organizationName?: string;
        organizationStatus: "SUSPENDED" | "TERMINATED";
    }
): Promise<void> {
    const secret = process.env.ADMIN_WEBHOOK_SECRET?.trim();
    const base = adminBaseFromEnv();
    if (!secret || !base) {
        return;
    }
    if (isSameOrigin(base, requestOrigin)) {
        console.warn("[guest-ticket] Admin support webhook skipped: ADMIN_APP_URL origin matches this app.");
        return;
    }
    const url = `${base}/api/webhooks/support-ticket`;
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-admin-webhook-secret": secret,
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            console.warn(`[guest-ticket] Admin support webhook returned ${res.status}`);
        }
    } catch (e) {
        console.error("[guest-ticket] Admin support webhook request failed:", e);
    }
}

function buildStoredDescription(body: GuestBody, userMessage: string): string {
    const lines: string[] = [];
    if (body.accessBlockedReason) {
        lines.push(`Access blocked reason: ${body.accessBlockedReason}`);
    }
    const slug = String(body.formerOrgSlug ?? "").trim();
    if (slug) {
        lines.push(`Former org slug: ${slug}`);
    }
    const orgName = String(body.organizationName ?? "").trim();
    if (orgName) {
        lines.push(`Organization (provided): ${orgName}`);
    }
    if (lines.length === 0) {
        return userMessage;
    }
    return `${lines.join("\n")}\n\n${userMessage}`;
}

async function createGuestTicketInDb(body: GuestBody, requestOrigin: string): Promise<NextResponse> {
    const email = String(body.email ?? "").trim();
    const subject = String(body.subject ?? "").trim();
    const userMessage = String(body.description ?? "").trim();
    const nameRaw = String(body.name ?? "").trim();
    const name = nameRaw || null;
    const orgNameForWebhook = String(body.organizationName ?? "").trim() || undefined;

    if (!email || !subject || !userMessage) {
        return NextResponse.json({ error: "Email, subject, and message are required." }, { status: 400 });
    }

    const description = buildStoredDescription(body, userMessage);

    const count = await db.$count(supportTicket);
    const next = (count ?? 0) + 1;
    const ticketNumber = `TKT-${String(next).padStart(5, "0")}`;

    const category = "ACCESS_ISSUE" as const;
    const priority = "HIGH" as const;

    try {
        const [created] = await db
            .insert(supportTicket)
            .values({
                ticketNumber,
                raisedBy: null,
                requesterEmail: email,
                requesterName: name,
                organizationId: null,
                category,
                priority,
                status: "OPEN",
                subject,
                description,
                lastActivityAt: new Date(),
            })
            .returning({ id: supportTicket.id });

        if (!created) {
            return NextResponse.json({ error: "Could not create ticket." }, { status: 500 });
        }

        const appUrl = normalizeBase(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
        const adminAppUrl = normalizeBase(process.env.ADMIN_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? appUrl);
        const displayName = name ?? email.split("@")[0] ?? "Guest";

        try {
            await sendTicketCreatedToUser({
                to: email,
                userName: displayName,
                ticketNumber,
                subject,
                category: CATEGORY_LABELS[category],
                priority: PRIORITY_LABELS[priority],
                ticketUrl: `${appUrl}/`,
            });
        } catch (e) {
            console.error("[guest-ticket] confirmation email failed:", e);
        }

        try {
            const superAdmins = await db.query.user.findMany({
                where: and(eq(user.role, "SUPER_ADMIN"), eq(user.isDeleted, false)),
                columns: { email: true },
            });
            if (superAdmins.length > 0) {
                await sendTicketAdminNotify({
                    to: superAdmins.map((a) => a.email),
                    ticketNumber,
                    subject,
                    category: CATEGORY_LABELS[category],
                    priority: PRIORITY_LABELS[priority],
                    raisedByName: displayName,
                    raisedByEmail: email,
                    description: description.slice(0, 300) + (description.length > 300 ? "…" : ""),
                    ticketUrl: `${adminAppUrl}/dashboard/support/${created.id}`,
                });
            }
        } catch (e) {
            console.error("[guest-ticket] admin notify email failed:", e);
        }

        const orgStatus = adminNotifyOrganizationStatusFromAccessBlockedReason(body.accessBlockedReason);
        if (orgStatus) {
            await postAdminSupportTicketWebhook(requestOrigin, {
                ticketId: created.id,
                ticketNumber,
                subject,
                organizationName: orgNameForWebhook,
                organizationStatus: orgStatus,
            });
        }

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e) {
        console.error("[guest-ticket] database insert failed:", e);
        return NextResponse.json({ error: "Could not save your request. Try again later." }, { status: 500 });
    }
}

/** Smoke test: route is mounted (should return 200). */
export async function GET() {
    return NextResponse.json({ ok: true, service: "guest-ticket" });
}

/**
 * Proxies to the admin app when configured (and not same-origin). If the admin endpoint is missing
 * (404) or unreachable, falls back to creating a guest ticket in this app's database.
 */
export async function POST(request: NextRequest) {
    let raw: GuestBody;
    try {
        raw = (await request.json()) as GuestBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const body = sanitizeGuestBody(raw);

    if (String(body.website ?? "").trim()) {
        return NextResponse.json({ ok: true });
    }

    let adminBase = adminBaseFromEnv();
    const selfOrigin = request.nextUrl.origin;

    if (adminBase) {
        let adminOrigin: string;
        try {
            adminOrigin = new URL(adminBase).origin;
        } catch {
            adminBase = "";
            adminOrigin = "";
        }
        if (adminOrigin && isSameOrigin(adminOrigin, selfOrigin)) {
            console.warn(
                "[guest-ticket] ADMIN_APP_URL points at this app; skipping proxy and using local guest ticket storage."
            );
            adminBase = "";
        }
    }

    if (adminBase) {
        try {
            const res = await fetch(`${adminBase}/api/support/guest-ticket`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                return forwardUpstream(res);
            }

            const forwardStatuses = new Set([400, 401, 403, 422, 429]);
            if (forwardStatuses.has(res.status)) {
                return forwardUpstream(res);
            }

            console.warn(
                `[guest-ticket] Admin returned ${res.status}; falling back to local guest ticket storage.`
            );
        } catch (e) {
            console.warn("[guest-ticket] Admin proxy failed; falling back to local guest ticket storage:", e);
        }
    }

    return createGuestTicketInDb(body, selfOrigin);
}
