"use client";

import { usePWA } from "@/hooks/use-pwa";
import { cn } from "@/lib/utils";
import { WifiSlash, CloudArrowUp, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

/**
 * Phase 9 — Offline sync status banner for Site Receiver portal.
 * Shows:
 *   - "Offline" warning when navigator.onLine = false
 *   - "X queued actions" badge when offline queue is non-empty
 *   - Auto-dismissing "synced" toast on successful re-sync
 */
export function OfflineSyncBanner() {
    const { online, queueCount, lastSyncResult, triggerSync } = usePWA();
    const [showSynced, setShowSynced] = useState(false);

    useEffect(() => {
        if (lastSyncResult && lastSyncResult.synced > 0) {
            setShowSynced(true);
            const t = setTimeout(() => setShowSynced(false), 3500);
            return () => clearTimeout(t);
        }
    }, [lastSyncResult]);

    // Nothing to show
    if (online && queueCount === 0 && !showSynced) return null;

    return (
        <div
            className={cn(
                "fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md transition-all",
                showSynced && queueCount === 0
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : !online
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
            )}
        >
            {showSynced && queueCount === 0 ? (
                <>
                    <Check className="h-4 w-4 shrink-0" weight="bold" />
                    <span className="text-sm font-medium">
                        {lastSyncResult?.synced} action{lastSyncResult?.synced !== 1 ? "s" : ""} synced
                    </span>
                </>
            ) : !online ? (
                <>
                    <WifiSlash className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">
                        You&apos;re offline
                        {queueCount > 0 && ` · ${queueCount} action${queueCount !== 1 ? "s" : ""} queued`}
                    </span>
                </>
            ) : (
                <>
                    <CloudArrowUp className="h-4 w-4 shrink-0 animate-pulse" />
                    <span className="text-sm font-medium">
                        {queueCount} action{queueCount !== 1 ? "s" : ""} pending sync
                    </span>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={triggerSync}
                    >
                        Sync now
                    </Button>
                </>
            )}
        </div>
    );
}
