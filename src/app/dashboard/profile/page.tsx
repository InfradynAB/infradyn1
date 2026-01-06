import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import db from "@/db/drizzle";
import { member, organization } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        redirect("/sign-in");
    }

    // Get user's organization
    const memberData = await db.query.member.findFirst({
        where: eq(member.userId, session.user.id),
    });

    let orgData = null;
    if (memberData?.organizationId) {
        orgData = await db.query.organization.findFirst({
            where: eq(organization.id, memberData.organizationId),
            columns: { id: true, name: true },
        });
    }

    return (
        <ProfileClient
            user={{
                id: session.user.id,
                name: session.user.name || "User",
                email: session.user.email || "",
                image: session.user.image,
                role: session.user.role || "USER",
                createdAt: new Date(session.user.createdAt || Date.now()),
            }}
            organization={orgData}
        />
    );
}
