import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Lifebuoy,
    Plus,
    ArrowSquareOut,
} from "@phosphor-icons/react/dist/ssr";
import { getMyTickets, getAllTickets } from "@/lib/actions/support-actions";
import { SupportCenterClient } from "./support-center-client";
import type { SupportListTicket } from "./support-center-client";

export const metadata = { title: "Support Center | Infradyn Materials" };

export default async function SupportPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/sign-in");

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    const tickets = isSuperAdmin ? await getAllTickets() : await getMyTickets();

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-16">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                        <Lifebuoy className="h-5 w-5 text-primary" weight="fill" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Support Center</h1>
                        <p className="text-sm text-muted-foreground">
                            Create and view support cases for your projects.{" "}
                            <Link
                                href="/docs"
                                className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-4"
                            >
                                Learn more
                                <ArrowSquareOut className="h-3.5 w-3.5" />
                            </Link>
                        </p>
                    </div>
                </div>
                <Button asChild className="bg-primary hover:bg-primary/90 shrink-0">
                    <Link href="/dashboard/support/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Contact Support
                    </Link>
                </Button>
            </div>

            <div className="border-t border-border/60 pt-6">
                <SupportCenterClient tickets={tickets as unknown as SupportListTicket[]} isSuperAdmin={isSuperAdmin} />
            </div>
        </div>
    );
}
