/**
 * Mark Notifications as Read API
 * POST /api/notifications/mark-read
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { markNotificationsAsRead } from "@/lib/actions/notifications";

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { notificationIds } = body;

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return NextResponse.json(
                { error: "notificationIds array required" },
                { status: 400 }
            );
        }

        const result = await markNotificationsAsRead(notificationIds);

        return NextResponse.json(result);
    } catch (error) {
        console.error("[MARK READ API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to mark as read" },
            { status: 500 }
        );
    }
}
