import { NextRequest, NextResponse } from "next/server";
import type { OrgAccessBlockReason } from "@/lib/constants/organization-lifecycle";
import { revokeSessionFromRequestCookies } from "@/lib/server/org-access";

const ALLOWED_REASONS = new Set<string>(["org_suspended", "org_terminated"]);

export async function GET(request: NextRequest) {
    const raw = request.nextUrl.searchParams.get("reason");
    const reason: OrgAccessBlockReason =
        raw && ALLOWED_REASONS.has(raw) ? (raw as OrgAccessBlockReason) : "org_suspended";

    await revokeSessionFromRequestCookies();

    const dest = request.nextUrl.clone();
    dest.pathname = "/access-blocked";
    dest.searchParams.set("reason", reason);
    return NextResponse.redirect(dest);
}
