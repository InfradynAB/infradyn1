import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo.config";

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date().toISOString();

    const routes: MetadataRoute.Sitemap = [
        {
            url: SITE_URL,
            lastModified,
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: `${SITE_URL}/privacy-policy`,
            lastModified,
            changeFrequency: "yearly",
            priority: 0.4,
        },
        {
            url: `${SITE_URL}/terms-of-service`,
            lastModified,
            changeFrequency: "yearly",
            priority: 0.4,
        },
    ];

    return routes;
}
