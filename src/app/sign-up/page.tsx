import { SignUpForm } from "@/components/auth/sign-up-form";
import Image from "next/image";

export default function SignUpPage() {
    return (
        <main className="min-h-screen bg-background">
            <div className="relative grid min-h-screen w-full items-stretch md:grid-cols-2">
                <div className="relative flex items-center justify-center px-6 py-12 md:px-10">
                    <div className="w-full max-w-md">
                        <div className="mb-8 flex items-center gap-3">
                            <div className="relative h-9 w-9 overflow-hidden rounded-md border bg-card">
                                <Image
                                    src="/logos/logo.png"
                                    alt="Infradyn"
                                    fill
                                    className="object-contain p-1"
                                    priority
                                />
                            </div>
                            <div className="leading-tight">
                                <div className="text-sm font-medium">Infradyn</div>
                                <div className="text-xs text-muted-foreground">Materials & procurement tracking</div>
                            </div>
                        </div>

                        <div className="mb-6 space-y-2">
                            <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
                            <p className="text-sm text-muted-foreground">
                                Start tracking procurement, suppliers, and shipments in one place.
                            </p>
                        </div>

                        <SignUpForm />

                        <p className="mt-6 text-center text-xs text-muted-foreground">
                            Create your account to start tracking procurement, shipments, and delivery status.
                        </p>
                    </div>
                </div>

                <aside className="relative hidden overflow-hidden md:block md:border-l md:border-border">
                    <div className="absolute inset-0 bg-linear-to-br from-primary to-primary/70" />
                    <div className="relative flex h-full flex-col px-10 pb-10 pt-[14%] text-primary-foreground">
                        <div className="max-w-xl">
                            <h2 className="text-4xl font-semibold tracking-tight">
                                Built for project teams.
                            </h2>
                            <p className="mt-4 max-w-lg text-sm/6 text-primary-foreground/90">
                                Invite your team, connect suppliers, and keep an audit trail from PO to delivery.
                            </p>

                            <div className="mt-8 max-w-lg">
                                <div className="text-3xl font-semibold leading-none text-primary-foreground/90">“</div>
                                <p className="mt-3 text-sm/6 text-primary-foreground/95">
                                    Onboarding was fast, and now our updates are always accurate—procurement,
                                    logistics, and site teams all see the same real-time status. It’s reduced handoffs,
                                    prevented missed deliveries, and made reporting effortless.
                                </p>
                                <div className="mt-5 flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15 text-xs font-semibold">
                                        PM
                                    </div>
                                    <div className="leading-tight">
                                        <div className="text-sm font-medium">Project Manager</div>
                                        <div className="text-xs text-primary-foreground/80">Delivery & procurement</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto max-w-xl pt-12">
                            <div className="flex items-center gap-4">
                                <div className="text-xs font-medium tracking-widest text-primary-foreground/80">
                                    JOIN 1K TEAMS
                                </div>
                                <div className="h-px flex-1 bg-primary-foreground/20" />
                            </div>
                            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-primary-foreground/80">
                                <span>Discord</span>
                                <span>Mailchimp</span>
                                <span>Grammarly</span>
                                <span>Attentive</span>
                                <span>Intercom</span>
                                <span>Dropbox</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    );
}
