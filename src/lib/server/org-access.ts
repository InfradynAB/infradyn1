import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import db from "@/db/drizzle";
import { session as sessionTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
    blockReasonForOrgStatus,
    type OrgAccessBlockReason,
    isOrgProductAccessBlocked,
} from "@/lib/constants/organization-lifecycle";
import { getOrganizationStatus } from "@/lib/server/org-lifecycle-db";
import { resolveActiveOrganizationForUser } from "@/lib/utils/org-context";

const SESSION_COOKIE_NAMES = [
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
];

export function orgAccessRevokedResponse(reason: OrgAccessBlockReason): NextResponse {
    return NextResponse.json(
        {
            code: "ORG_ACCESS_REVOKED",
            reason,
        },
        { status: 403 }
    );
}

/**
 * If the organization is suspended or terminated, return a 403 NextResponse; otherwise null.
 */
export async function orgAccessGuardResponse(organizationId: string | null | undefined): Promise<NextResponse | null> {
    if (!organizationId) {
        return null;
    }
    const status = await getOrganizationStatus(organizationId);
    if (!status || !isOrgProductAccessBlocked(status)) {
        return null;
    }
    const reason = blockReasonForOrgStatus(status);
    if (!reason) {
        return null;
    }
    return orgAccessRevokedResponse(reason);
}

export type SessionWithUser = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/**
 * After verifying `session` exists: resolve active org (product-allowed only).
 */
export async function ensureActiveOrgForApi(session: SessionWithUser): Promise<
    | { ok: true; organizationId: string }
    | { ok: false; response: NextResponse }
> {
    const organizationId = await resolveActiveOrganizationForUser({
        userId: session.user.id,
        sessionOrganizationId: session.user.organizationId,
    });
    if (!organizationId) {
        return {
            ok: false,
            response: NextResponse.json({ code: "NO_ACTIVE_ORGAN", error: "No active organization" }, { status: 403 }),
        };
    }
    return { ok: true, organizationId };
}

/**
 * Session + active org: returns 401, 403 NO_ACTIVE_ORGAN, or context for happy path.
 */
export async function requireSessionAndActiveOrgAccess(): Promise<
    | { ok: true; userId: string; organizationId: string; session: SessionWithUser }
    | { ok: false; response: NextResponse }
> {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session?.user) {
        return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const orgGate = await ensureActiveOrgForApi(session);
    if (!orgGate.ok) {
        return { ok: false, response: orgGate.response };
    }

    return { ok: true, userId: session.user.id, organizationId: orgGate.organizationId, session };
}

/**
 * Revoke the current browser session (DB row + auth cookies).
 * Must run in a Route Handler or Server Action — not in a Server Component (Next.js forbids mutating cookies there).
 */
export async function revokeSessionFromRequestCookies(): Promise<void> {
    const store = await cookies();
    for (const name of SESSION_COOKIE_NAMES) {
        const token = store.get(name)?.value;
        if (token) {
            await db.delete(sessionTable).where(eq(sessionTable.token, token));
        }
        store.delete(name);
    }
}

/**
 * When the active org is blocked, send the user through a Route Handler that clears the session
 * (cookies cannot be modified from Server Components such as `dashboard/layout`).
 */
export function redirectToRevokeBlockedSession(reason: OrgAccessBlockReason): never {
    redirect(`/api/auth/revoke-blocked-session?reason=${encodeURIComponent(reason)}`);
}
