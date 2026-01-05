/**
 * Notifications API
 * GET /api/notifications - Fetch notifications for current user
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getUnreadNotifications } from "@/lib/actions/notifications";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await getUnreadNotifications(session.user.id);

        return NextResponse.json(result);
    } catch (error) {
        console.error("[NOTIFICATIONS API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch notifications", data: [] },
            { status: 500 }
        );
    }
}
