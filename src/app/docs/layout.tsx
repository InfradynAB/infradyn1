import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo.config";

export const metadata: Metadata = {
    ...noIndexMetadata,
    title: "Platform documentation",
    description:
        "Internal technical documentation for the Infradyn platform. Not intended for public search indexing.",
};

export default function DocsRouteLayout({ children }: { children: React.ReactNode }) {
    return children;
}
