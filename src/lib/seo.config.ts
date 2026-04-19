import type { Metadata } from "next";
import { getSiteUrl } from "./site-url";

/** Canonical site origin (respects `NEXT_PUBLIC_SITE_URL` when set). */
export const SITE_URL = getSiteUrl();

/** Set after Google Search Console verification; submit the sitemap URL (root + /sitemap.xml) in GSC. */
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

/** Open Graph / Twitter image route (see `app/opengraph-image.tsx`). */
export const OG_IMAGE_PATH = "/opengraph-image" as const;

export function getOgImageUrl(): string {
    return `${SITE_URL}${OG_IMAGE_PATH}`;
}

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
    themeColor: "#0f172a",
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
    },
    twitter: {
        card: "summary_large_image",
        title: siteConfig.title,
        description: siteConfig.description,
        creator: "@infradyn",
    },
    ...(googleVerification
        ? {
              verification: {
                  google: googleVerification,
              },
          }
        : {}),
    alternates: {
        canonical: SITE_URL,
    },
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.json",
};

export const noIndexMetadata: Metadata = {
    robots: {
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true,
        noimageindex: true,
    },
};

export function generatePageMetadata(
    title: string,
    description: string,
    path: string = ""
): Metadata {
    const url = `${SITE_URL}${path}`;
    const ogUrl = getOgImageUrl();
    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url,
            images: [
                {
                    url: ogUrl,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
        },
        twitter: {
            title,
            description,
            images: [ogUrl],
        },
        alternates: {
            canonical: url,
        },
    };
}

/** Homepage uses shared site title/description and canonical root URL. */
export const homePageMetadata: Metadata = generatePageMetadata(
    siteConfig.title,
    siteConfig.description,
    ""
);
