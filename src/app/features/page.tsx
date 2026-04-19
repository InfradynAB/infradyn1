import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { noIndexMetadata } from "@/lib/seo.config";

export const metadata: Metadata = {
    ...noIndexMetadata,
    title: "Features",
    description: "Preview of Infradyn product features. Full marketing content coming soon.",
};

export default function FeaturesStubPage() {
    return (
        <main className="min-h-screen bg-slate-950 px-4 py-20 text-slate-100">
            <div className="mx-auto max-w-lg text-center">
                <h1 className="text-3xl font-semibold tracking-tight">Features</h1>
                <p className="mt-4 text-slate-400">
                    We are preparing a detailed feature tour for this page. Until then, explore the product by creating a
                    workspace.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Button asChild className="bg-sky-600 hover:bg-sky-500">
                        <Link href="/sign-up">Get started</Link>
                    </Button>
                    <Button asChild variant="outline" className="border-slate-600 text-slate-100">
                        <Link href="/">Back to home</Link>
                    </Button>
                </div>
            </div>
        </main>
    );
}
