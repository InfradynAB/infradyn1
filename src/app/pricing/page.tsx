import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { noIndexMetadata } from "@/lib/seo.config";

export const metadata: Metadata = {
    ...noIndexMetadata,
    title: "Pricing",
    description: "Infradyn pricing information. Content coming soon.",
};

export default function PricingStubPage() {
    return (
        <main className="min-h-screen bg-slate-950 px-4 py-20 text-slate-100">
            <div className="mx-auto max-w-lg text-center">
                <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
                <p className="mt-4 text-slate-400">
                    Public pricing will be published here. Contact us if you need a commercial proposal today.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Button asChild variant="outline" className="border-slate-600 text-slate-100">
                        <a href="mailto:support@infradyn.com">Contact sales</a>
                    </Button>
                    <Button asChild className="bg-sky-600 hover:bg-sky-500">
                        <Link href="/">Back to home</Link>
                    </Button>
                </div>
            </div>
        </main>
    );
}
