/** Production canonical URL; override in preview/staging with NEXT_PUBLIC_SITE_URL (no trailing slash). */
export const DEFAULT_SITE_URL = "https://infradyn.com";

export function getSiteUrl(): string {
    const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (env) {
        return env.replace(/\/$/, "");
    }
    return DEFAULT_SITE_URL;
}
