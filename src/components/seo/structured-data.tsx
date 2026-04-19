import { getOgImageUrl, siteConfig } from "@/lib/seo.config";

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

function parseOrganizationSameAs(): string[] {
    const raw = process.env.NEXT_PUBLIC_ORGANIZATION_SAME_AS?.trim();
    if (!raw) return [];
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function OrganizationSchema({
    url = siteConfig.url,
    logo = getOgImageUrl(),
}: OrganizationSchemaProps = {}) {
    const sameAs = parseOrganizationSameAs();
    const schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteConfig.name,
        url: url,
        logo: logo,
        description: siteConfig.description,
        ...(sameAs.length > 0 ? { sameAs } : {}),
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

export function SoftwareApplicationSchema() {
    const schema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: siteConfig.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: siteConfig.description,
        url: siteConfig.url,
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}

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

export function HomePageStructuredData() {
    return (
        <>
            <OrganizationSchema />
            <WebSiteSchema />
            <SoftwareApplicationSchema />
        </>
    );
}
