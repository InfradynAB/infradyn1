import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo.config";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/dashboard/",
                "/api/",
                "/sign-in",
                "/sign-up",
                "/verify-email",
                "/reset-password",
                "/invite",
                "/docs",
                "/_next/",
                "/static/",
            ],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
