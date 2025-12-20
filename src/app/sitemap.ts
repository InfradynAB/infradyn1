import { MetadataRoute } from "next";

const SITE_URL = "https://infradyn.com";

export default function sitemap(): MetadataRoute.Sitemap {
    const currentDate = new Date().toISOString();

    // Define all public routes
    const routes: MetadataRoute.Sitemap = [
        {
            url: SITE_URL,
            lastModified: currentDate,
            changeFrequency: "monthly",
            priority: 1.0,
        },
        // Add more public pages here as they are created
        // Example:
        // {
        //   url: `${SITE_URL}/about`,
        //   lastModified: currentDate,
        //   changeFrequency: "monthly",
        //   priority: 0.8,
        // },
        // {
        //   url: `${SITE_URL}/pricing`,
        //   lastModified: currentDate,
        //   changeFrequency: "weekly",
        //   priority: 0.9,
        // },
        // {
        //   url: `${SITE_URL}/contact`,
        //   lastModified: currentDate,
        //   changeFrequency: "monthly",
        //   priority: 0.7,
        // },
    ];

    return routes;
}
