"use client";

import { useEffect, useState, useCallback } from "react";

interface SyncStatus {
    registered: boolean;
    online: boolean;
    queueCount: number;
    lastSyncResult: { synced: number; failed: number } | null;
}

/**
 * Phase 9 — PWA Service Worker registration and offline sync hook.
 * Registers /sw.js, tracks online/offline state, and listens for
 * sync messages from the service worker.
 */
export function usePWA(): SyncStatus & { triggerSync: () => void } {
    const [status, setStatus] = useState<SyncStatus>({
        registered: false,
        online: typeof navigator !== "undefined" ? navigator.onLine : true,
        queueCount: 0,
        lastSyncResult: null,
    });

    const triggerSync = useCallback(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
                // Manual sync trigger
                if ("sync" in reg) {
                    (reg as any).sync.register("infradyn-sync-mutations").catch(() => {});
                }
                // Also ask via message for immediate attempt
                reg.active?.postMessage({ type: "MANUAL_SYNC" });
            });
        }
    }, []);

    const getQueueStatus = useCallback(() => {
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "GET_QUEUE_STATUS" });
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Register service worker
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then(() => {
                    setStatus((prev) => ({ ...prev, registered: true }));
                    getQueueStatus();
                })
                .catch(() => {}); // SW not critical; fail silently
        }

        // Online / offline listeners
        const onOnline = () => {
            setStatus((prev) => ({ ...prev, online: true }));
            triggerSync(); // Auto-trigger when coming back online
        };
        const onOffline = () => setStatus((prev) => ({ ...prev, online: false }));

        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);

        // Listen for SW sync completion messages
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "SYNC_COMPLETE") {
                setStatus((prev) => ({
                    ...prev,
                    queueCount: event.data.remaining ?? 0,
                    lastSyncResult: {
                        synced: event.data.synced,
                        failed: event.data.failed,
                    },
                }));
            }
            if (event.data?.type === "QUEUE_STATUS") {
                setStatus((prev) => ({ ...prev, queueCount: event.data.count }));
            }
        };

        navigator.serviceWorker?.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
            navigator.serviceWorker?.removeEventListener("message", handleMessage);
        };
    }, [triggerSync, getQueueStatus]);

    return { ...status, triggerSync };
}
