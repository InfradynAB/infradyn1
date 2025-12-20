import { siteConfig } from "@/lib/seo.config";

type OrganizationSchemaProps = {
    url?: string;
    logo?: string;
};

type WebSiteSchemaProps = {
    url?: string;
    name?: string;
};

type BreadcrumbItem = {
    name: string;
    url: string;
};

// Organization Schema
export function OrganizationSchema({
    url = siteConfig.url,
    logo = `${siteConfig.url}/og-image.png`,
}: OrganizationSchemaProps = {}) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteConfig.name,
        url: url,
        logo: logo,
        description: siteConfig.description,
        sameAs: [
            // Add social media URLs here when available
            // "https://twitter.com/infradyn",
            // "https://linkedin.com/company/infradyn",
        ],
        contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            availableLanguage: ["English"],
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}

// WebSite Schema with SearchAction
export function WebSiteSchema({
    url = siteConfig.url,
    name = siteConfig.name,
}: WebSiteSchemaProps = {}) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: name,
        url: url,
        description: siteConfig.description,
        publisher: {
            "@type": "Organization",
            name: siteConfig.name,
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}

// Breadcrumb Schema
export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}

// Combined schemas for the homepage
export function HomePageStructuredData() {
    return (
        <>
            <OrganizationSchema />
            <WebSiteSchema />
        </>
    );
}
