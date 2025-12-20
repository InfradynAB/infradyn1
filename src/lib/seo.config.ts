import type { Metadata } from "next";

const SITE_URL = "https://infradyn.com";

export const siteConfig = {
    name: "Infradyn",
    title: "Infradyn - Materials Tracker & Procurement Management",
    description:
        "Your single source of truth for project management, from PO to payment. Streamline procurement, track materials, and manage suppliers efficiently.",
    url: SITE_URL,
    keywords: [
        "procurement management",
        "materials tracking",
        "project management",
        "purchase orders",
        "supplier management",
        "construction materials",
        "inventory management",
        "Infradyn",
    ],
    author: "Infradyn",
    locale: "en_US",
    themeColor: "#0f172a", // slate-900 from the app theme
};

export const defaultMetadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: siteConfig.title,
        template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    keywords: siteConfig.keywords,
    authors: [{ name: siteConfig.author }],
    creator: siteConfig.author,
    publisher: siteConfig.author,
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    openGraph: {
        type: "website",
        locale: siteConfig.locale,
        url: siteConfig.url,
        title: siteConfig.title,
        description: siteConfig.description,
        siteName: siteConfig.name,
        images: [
            {
                url: `${SITE_URL}/og-image.png`,
                width: 1200,
                height: 630,
                alt: siteConfig.title,
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: siteConfig.title,
        description: siteConfig.description,
        images: [`${SITE_URL}/og-image.png`],
        creator: "@infradyn",
    },
    verification: {
        // Add your verification codes here after setting up Search Console
        // google: "your-google-verification-code",
        // yandex: "your-yandex-verification-code",
    },
    alternates: {
        canonical: SITE_URL,
    },
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.json",
};

// Metadata for pages that should not be indexed (auth, dashboard)
export const noIndexMetadata: Metadata = {
    robots: {
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true,
        noimageindex: true,
    },
};

// Helper to generate page-specific metadata
export function generatePageMetadata(
    title: string,
    description: string,
    path: string = ""
): Metadata {
    const url = `${SITE_URL}${path}`;
    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url,
        },
        twitter: {
            title,
            description,
        },
        alternates: {
            canonical: url,
        },
    };
}
