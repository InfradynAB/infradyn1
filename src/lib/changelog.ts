/**
 * In-app changelog for "What's new" feature.
 * Bump CURRENT_VERSION when adding new entries to show the badge.
 */

export const CURRENT_VERSION = "2025.03.1";

export interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    items: string[];
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
    {
        version: "2025.03.1",
        date: "March 2025",
        title: "Onboarding & empty states",
        items: [
            "Role-specific first-time checklists for Suppliers, Site Receivers, and PMs",
            "Improved empty states with next steps on NCR list and Alerts",
            "What's new changelog to keep you informed of updates",
        ],
    },
    {
        version: "2025.02.1",
        date: "February 2025",
        title: "Quality & analytics",
        items: [
            "PM dashboard with Overview, Deliveries, Quality, and Milestones",
            "NCR management with severity-based SLAs",
            "Supplier scorecards and performance tracking",
        ],
    },
];
