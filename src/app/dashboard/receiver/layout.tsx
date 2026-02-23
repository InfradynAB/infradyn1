import { OfflineSyncBanner } from "@/components/receiver/offline-sync-banner";

/**
 * Receiver portal layout wrapper.
 * Adds the offline sync banner to all receiver pages.
 */
export default function ReceiverLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <OfflineSyncBanner />
        </>
    );
}
