import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getTicketWithThread } from "@/lib/actions/support-actions";
import { TicketThreadClient } from "./ticket-thread-client";

export const metadata = { title: "Support Ticket | Infradyn Materials" };

export default async function TicketDetailPage({
    params,
}: {
    params: Promise<{ ticketId: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/sign-in");

    const { ticketId } = await params;
    const ticket = await getTicketWithThread(ticketId);

    if (!ticket) notFound();

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";

    return (
        <TicketThreadClient
            ticket={ticket}
            isSuperAdmin={isSuperAdmin}
            currentUserId={session.user.id}
        />
    );
}
