import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { GuestSupportForm } from "./guest-support-form";

type Reason = "org_suspended" | "org_terminated";

function parseReason(raw: string | string[] | undefined): Reason {
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (v === "org_terminated") return "org_terminated";
    return "org_suspended";
}

export default async function AccessBlockedPage({
    searchParams,
}: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = (await searchParams) ?? {};
    const reason = parseReason(sp.reason);
    const isTerminated = reason === "org_terminated";

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-3 py-4 sm:px-5 sm:py-6">
            <div
                className="pointer-events-none absolute inset-0 bg-linear-to-b from-primary/12 via-transparent to-transparent dark:from-primary/10"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute -left-1/4 top-1/2 h-[min(100vw,42rem)] w-[min(100vw,42rem)] -translate-y-1/2 rounded-full bg-primary/5 blur-3xl dark:bg-primary/10"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute -right-1/4 bottom-0 h-[min(90vw,36rem)] w-[min(90vw,36rem)] translate-y-1/3 rounded-full bg-amber-500/5 blur-3xl dark:bg-amber-500/10"
                aria-hidden
            />

            <Card className="relative z-10 w-full max-w-4xl border border-border/60 bg-card/95 shadow-xl backdrop-blur-xl dark:bg-card/90">
                <div className="grid gap-0 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:divide-x md:divide-border/50">
                    <CardHeader className="space-y-0 p-5 text-center md:p-6 md:text-left">
                        <CardTitle
                            className={`text-xl font-bold tracking-tight sm:text-2xl ${
                                isTerminated ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
                            }`}
                        >
                            {isTerminated ? "Access ended" : "Access suspended"}
                        </CardTitle>
                        <CardDescription className="mx-auto max-w-md pt-2 text-sm leading-snug text-muted-foreground md:mx-0">
                            {isTerminated ? (
                                <>
                                    This organization no longer has access to Infradyn. If this is a mistake, use the
                                    form — we&apos;ll review it.
                                </>
                            ) : (
                                <>
                                    Access is temporarily paused. Contact your admin or send us a message and
                                    we&apos;ll help from here.
                                </>
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 md:p-6 md:pt-6">
                        <GuestSupportForm />
                    </CardContent>
                </div>
                <CardFooter className="flex flex-col gap-2 border-t border-border/50 bg-muted/15 px-5 py-3 sm:flex-row sm:justify-end sm:gap-3 md:px-6">
                    <SignOutButton
                        variant="outline"
                        fullWidth
                        className="h-9 rounded-lg border-border/80 bg-background/60 sm:order-2 sm:w-auto sm:min-w-34"
                    />
                    <Button variant="ghost" className="h-9 text-muted-foreground hover:text-foreground sm:order-1" asChild>
                        <Link href="/">Return to home</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
