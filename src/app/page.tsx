import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HomePageStructuredData } from "@/components/seo/structured-data";
import { homePageMetadata } from "@/lib/seo.config";

export const metadata = homePageMetadata;

const pillars = [
    {
        title: "Procurement in one place",
        body: "Purchase orders, milestones, and change orders stay aligned so finance and delivery teams share one timeline.",
    },
    {
        title: "Materials you can trust",
        body: "Track BOQ lines, receipts, and exceptions from site to supplier—without spreadsheets scattered across inboxes.",
    },
    {
        title: "Suppliers that stay in sync",
        body: "Invitations, documents, and status live in the same workspace so partners know what to ship and when.",
    },
];

export default function HomePage() {
    return (
        <>
            <HomePageStructuredData />
            <div className="min-h-screen bg-slate-950 text-slate-100">
                <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-sm">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
                        <span className="text-lg font-semibold tracking-tight">Infradyn</span>
                        <nav className="flex max-w-[min(100%,28rem)] flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm text-slate-400 sm:max-w-none">
                            <Link href="/features" className="hover:text-slate-100 transition-colors">
                                Features
                            </Link>
                            <Link href="/pricing" className="hover:text-slate-100 transition-colors">
                                Pricing
                            </Link>
                            <Link href="/security" className="hover:text-slate-100 transition-colors">
                                Security
                            </Link>
                            <Button asChild variant="ghost" size="sm" className="text-slate-300">
                                <Link href="/sign-in">Sign in</Link>
                            </Button>
                            <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-500">
                                <Link href="/sign-up">Get started</Link>
                            </Button>
                        </nav>
                    </div>
                </header>

                <main>
                    <section className="relative overflow-hidden border-b border-slate-800/80">
                        <div
                            className="pointer-events-none absolute inset-0 opacity-40"
                            aria-hidden
                            style={{
                                background:
                                    "radial-gradient(ellipse 80% 50% at 50% -20%, rgb(14 165 233 / 0.25), transparent)",
                            }}
                        />
                        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
                            <p className="text-sm font-medium uppercase tracking-widest text-sky-400">
                                Construction &amp; capital projects
                            </p>
                            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                                Procurement and materials tracking from PO to payment
                            </h1>
                            <p className="mt-6 max-w-2xl text-lg text-slate-400 sm:text-xl">
                                Infradyn is your operational layer for purchase orders, supplier collaboration,
                                logistics signals, and financial progress—so executives and project teams see the same
                                truth.
                            </p>
                            <div className="mt-10 flex flex-wrap gap-4">
                                <Button asChild size="lg" className="bg-sky-600 hover:bg-sky-500">
                                    <Link href="/sign-up">Start free</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-900">
                                    <Link href="/sign-in">Sign in to your workspace</Link>
                                </Button>
                            </div>
                        </div>
                    </section>

                    <section className="border-b border-slate-800/80 bg-slate-900/40 py-16 sm:py-20" aria-labelledby="problem-heading">
                        <div className="mx-auto max-w-6xl px-4 sm:px-6">
                            <h2 id="problem-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                When procurement lives in email, risk shows up late
                            </h2>
                            <p className="mt-4 max-w-3xl text-slate-400">
                                Delayed POs, missing documents, and disconnected suppliers inflate cost and slip
                                schedules. Infradyn centralizes the workflow your PMs, procurement leads, and finance
                                partners already run—so status, obligations, and exceptions surface before they become
                                claims.
                            </p>
                        </div>
                    </section>

                    <section className="py-16 sm:py-20" aria-labelledby="pillars-heading">
                        <div className="mx-auto max-w-6xl px-4 sm:px-6">
                            <h2 id="pillars-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                Built for delivery organizations
                            </h2>
                            <p className="mt-3 max-w-2xl text-slate-400">
                                Three pillars teams adopt first when they move from spreadsheets to a shared system of
                                record.
                            </p>
                            <ul className="mt-12 grid gap-8 sm:grid-cols-3">
                                {pillars.map((item) => (
                                    <li
                                        key={item.title}
                                        className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-sm"
                                    >
                                        <h3 className="text-lg font-semibold text-slate-100">{item.title}</h3>
                                        <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.body}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    <section className="border-y border-slate-800/80 bg-slate-900/30 py-16 sm:py-20" aria-labelledby="audience-heading">
                        <div className="mx-auto max-w-6xl px-4 sm:px-6">
                            <h2 id="audience-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                Who gets value on day one
                            </h2>
                            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                                {[
                                    "Project managers aligning POs, milestones, and site receipts",
                                    "Procurement leads standardizing supplier onboarding and documentation",
                                    "Finance controllers tying accruals to physical progress and change orders",
                                    "Supplier coordinators reducing back-and-forth on status and exceptions",
                                ].map((line) => (
                                    <li
                                        key={line}
                                        className="flex gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-slate-300"
                                    >
                                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" aria-hidden />
                                        <span>{line}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    <section className="py-16 sm:py-24" aria-labelledby="cta-heading">
                        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
                            <h2 id="cta-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                Ready to run procurement on one timeline?
                            </h2>
                            <p className="mx-auto mt-4 max-w-xl text-slate-400">
                                Create an account, invite your suppliers, and connect the work you are already doing in
                                Infradyn.
                            </p>
                            <div className="mt-10 flex flex-wrap justify-center gap-4">
                                <Button asChild size="lg" className="bg-sky-600 hover:bg-sky-500">
                                    <Link href="/sign-up">Create your workspace</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-900">
                                    <Link href="/sign-in">I already have an account</Link>
                                </Button>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="border-t border-slate-800 bg-slate-950 py-12 text-sm text-slate-500">
                    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <p>&copy; {new Date().getFullYear()} Infradyn. All rights reserved.</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <Link href="/privacy-policy" className="hover:text-slate-300 transition-colors">
                                Privacy
                            </Link>
                            <Link href="/terms-of-service" className="hover:text-slate-300 transition-colors">
                                Terms
                            </Link>
                            <Link href="/features" className="hover:text-slate-300 transition-colors">
                                Features
                            </Link>
                            <Link href="/pricing" className="hover:text-slate-300 transition-colors">
                                Pricing
                            </Link>
                            <Link href="/security" className="hover:text-slate-300 transition-colors">
                                Security
                            </Link>
                            <a href="mailto:support@infradyn.com" className="hover:text-slate-300 transition-colors">
                                support@infradyn.com
                            </a>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
