import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NewTicketForm } from "./new-ticket-form";
import { Lifebuoy } from "@phosphor-icons/react/dist/ssr";

export const metadata = { title: "Raise a Support Ticket | Infradyn Materials" };

export default async function NewTicketPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/sign-in");

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-16">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                    <Lifebuoy className="h-5 w-5 text-primary" weight="fill" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Raise a Support Ticket</h1>
                    <p className="text-sm text-muted-foreground">
                        Describe your issue and our team will respond as soon as possible.
                    </p>
                </div>
            </div>
            <NewTicketForm />
        </div>
    );
}
