import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/user/profile
 * Update user profile (name)
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        // Update user name
        await db
            .update(user)
            .set({ name: name.trim(), updatedAt: new Date() })
            .where(eq(user.id, session.user.id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[/api/user/profile PATCH]", error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
