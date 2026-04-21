'use server';

import db from "@/db/drizzle";
import { user } from "@/db/schema";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";

/**
 * Returns true if the current user has already seen the given tour key.
 * Falls back to false (show tour) when not authenticated.
 */
export async function hasSeen(tourKey: string): Promise<boolean> {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) return false;

        const [row] = await db
            .select({ toursSeen: user.toursSeen })
            .from(user)
            .where(eq(user.id, session.user.id));

        return row?.toursSeen?.[tourKey] === true;
    } catch {
        return false;
    }
}

/**
 * Marks a tour as seen for the current user.
 * Uses a jsonb merge so other tour keys are preserved.
 */
export async function markTourSeen(tourKey: string): Promise<void> {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) return;

        // Merge the new key into the existing jsonb object
        await db
            .update(user)
            .set({
                toursSeen: sql`COALESCE(${user.toursSeen}, '{}'::jsonb) || ${JSON.stringify({ [tourKey]: true })}::jsonb`,
            })
            .where(eq(user.id, session.user.id));
    } catch (err) {
        console.error("[markTourSeen] Failed to persist tour state:", err);
    }
}
