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

    const postToWorker = useCallback(async (message: Record<string, unknown>) => {
        if (!("serviceWorker" in navigator)) return;

        // Prefer controller when available (page already controlled)
        navigator.serviceWorker.controller?.postMessage(message);

        // Also post to registration workers to support first-load/no-reload cases
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage(message);
        reg.waiting?.postMessage(message);
        reg.installing?.postMessage(message);
    }, []);

    const triggerSync = useCallback(() => {
        if (!("serviceWorker" in navigator)) return;

        navigator.serviceWorker.ready.then((reg) => {
            // Request background sync registration where supported
            if ("sync" in reg) {
                (reg as any).sync.register("infradyn-sync-mutations").catch(() => {});
            }

            // Ask SW to run sync immediately
            postToWorker({ type: "MANUAL_SYNC" }).catch(() => {});

            // Refresh queue status shortly after trigger
            setTimeout(() => postToWorker({ type: "GET_QUEUE_STATUS" }).catch(() => {}), 600);
            setTimeout(() => postToWorker({ type: "GET_QUEUE_STATUS" }).catch(() => {}), 2000);
        });
    }, [postToWorker]);

    const getQueueStatus = useCallback(() => {
        postToWorker({ type: "GET_QUEUE_STATUS" }).catch(() => {});
    }, [postToWorker]);

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
        navigator.serviceWorker?.addEventListener("controllerchange", getQueueStatus);

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
            navigator.serviceWorker?.removeEventListener("controllerchange", getQueueStatus);
            navigator.serviceWorker?.removeEventListener("message", handleMessage);
        };
    }, [triggerSync, getQueueStatus]);

    return { ...status, triggerSync };
}
