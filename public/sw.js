/**
 * Phase 9 — Offline-First PWA Service Worker
 * Feature 24: Offline Data Capture + Feature 25: Sync Engine
 *
 * Strategy:
 * - App shell (HTML/JS/CSS) → Cache-First
 * - Receiver API reads (/api/receiver/*) → Network-First, fallback to cache
 * - Background sync queue for offline mutations (deliveries, NCRs, comments)
 * - Push notifications for delivery arrival alerts
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `infradyn-shell-${CACHE_VERSION}`;
const API_CACHE = `infradyn-api-${CACHE_VERSION}`;
const OFFLINE_QUEUE_KEY = "infradyn-offline-queue";

// ─── App shell resources to pre-cache ────────────────────────────────────────
const SHELL_URLS = [
    "/",
    "/dashboard/receiver",
    "/dashboard/receiver/deliveries",
    "/dashboard/receiver/pos",
    "/dashboard/receiver/ncr",
    "/manifest.json",
];

// ─── Install: pre-cache shell ─────────────────────────────────────────────────
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(SHELL_CACHE)
            .then((cache) =>
                cache.addAll(SHELL_URLS).catch((e) => {
                    // Partial pre-cache failure is acceptable; log and continue
                    console.warn("[SW] Pre-cache failed for some resources", e);
                })
            )
            .then(() => self.skipWaiting())
    );
});

// ─── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
    const allowedCaches = [SHELL_CACHE, API_CACHE];
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys.filter((k) => !allowedCaches.includes(k)).map((k) => caches.delete(k))
                )
            )
            .then(() => self.clients.claim())
    );
});

// ─── Fetch: routing strategy ──────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin requests
    if (url.origin !== location.origin) return;

    // POST/PATCH/DELETE → queue offline if network fails, pass through if online
    if (request.method !== "GET") {
        event.respondWith(networkWithOfflineQueue(request));
        return;
    }

    // API reads → Network-first with cache fallback
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(networkFirstWithCache(request, API_CACHE));
        return;
    }

    // Navigation & static assets → Cache-first with network fallback
    event.respondWith(cacheFirstWithNetwork(request, SHELL_CACHE));
});

// ─── Network-first (API reads) ────────────────────────────────────────────────
async function networkFirstWithCache(request, cacheName) {
    try {
        const networkResponse = await fetch(request.clone());
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(
            JSON.stringify({ error: "offline", message: "No cached data available" }),
            { status: 503, headers: { "Content-Type": "application/json" } }
        );
    }
}

// ─── Cache-first (shell + static) ────────────────────────────────────────────
async function cacheFirstWithNetwork(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const networkResponse = await fetch(request.clone());
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch {
        // Return the cached root for SPA navigation fallback
        const root = await caches.match("/");
        return (
            root ||
            new Response("Offline — please reconnect", {
                status: 503,
                headers: { "Content-Type": "text/plain" },
            })
        );
    }
}

// ─── Offline mutation queue ────────────────────────────────────────────────────
async function networkWithOfflineQueue(request) {
    try {
        return await fetch(request.clone());
    } catch {
        // Store the failed mutation for later sync
        const body = await request.clone().text().catch(() => "");
        const queuedItem = {
            id: crypto.randomUUID(),
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body,
            timestamp: Date.now(),
            type: inferMutationType(request.url),
        };

        await enqueue(queuedItem);

        // Register background sync if supported
        if ("sync" in self.registration) {
            await self.registration.sync.register("infradyn-sync-mutations");
        }

        return new Response(
            JSON.stringify({
                queued: true,
                queueId: queuedItem.id,
                message: "Action saved offline — will sync when reconnected",
            }),
            { status: 202, headers: { "Content-Type": "application/json" } }
        );
    }
}

function inferMutationType(url) {
    if (url.includes("/receiver/deliveries")) return "CONFIRM_DELIVERY";
    if (url.includes("/receiver/ncr")) return "RAISE_NCR";
    if (url.includes("/receiver/comment")) return "ADD_COMMENT";
    return "MUTATION";
}

// ─── IndexedDB offline queue helpers ─────────────────────────────────────────
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("infradyn-offline", 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("queue")) {
                const store = db.createObjectStore("queue", { keyPath: "id" });
                store.createIndex("timestamp", "timestamp", { unique: false });
                store.createIndex("type", "type", { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function enqueue(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("queue", "readwrite");
        tx.objectStore("queue").put(item);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

async function dequeue(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("queue", "readwrite");
        tx.objectStore("queue").delete(id);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

async function getAllQueued() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("queue", "readonly");
        const req = tx.objectStore("queue").index("timestamp").getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// ─── Feature 25: Background sync ──────────────────────────────────────────────
self.addEventListener("sync", (event) => {
    if (event.tag === "infradyn-sync-mutations") {
        event.waitUntil(syncOfflineQueue());
    }
});

async function syncOfflineQueue() {
    const items = await getAllQueued();
    let synced = 0;
    let failed = 0;

    for (const item of items) {
        try {
            const response = await fetch(item.url, {
                method: item.method,
                headers: {
                    ...item.headers,
                    "X-Offline-Sync": "true",
                    "X-Queue-Id": item.id,
                    "X-Queued-At": String(item.timestamp),
                },
                body: item.body || undefined,
            });

            if (response.ok || response.status === 409) {
                // 409 = conflict already resolved server-side; safe to dequeue
                await dequeue(item.id);
                synced++;
            } else {
                failed++;
            }
        } catch {
            failed++;
            // Will retry on next sync event
        }
    }

    // Notify open clients about sync completion
    const clients = await self.clients.matchAll({ type: "window" });
    for (const client of clients) {
        client.postMessage({
            type: "SYNC_COMPLETE",
            synced,
            failed,
            remaining: failed,
        });
    }
}

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = { title: "Infradyn", body: event.data.text() };
    }

    const { title = "Infradyn", body, url = "/dashboard/receiver", type = "INFO" } = data;

    const icon = "/favicon.ico";
    const badge = "/favicon.ico";

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon,
            badge,
            tag: type,
            renotify: true,
            data: { url },
            actions: [
                { action: "view", title: "View" },
                { action: "dismiss", title: "Dismiss" },
            ],
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    if (event.action === "dismiss") return;

    const url = event.notification.data?.url ?? "/dashboard/receiver";
    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clients) => {
                const existing = clients.find((c) => c.url.includes(url));
                if (existing) return existing.focus();
                return self.clients.openWindow(url);
            })
    );
});

// ─── Message: manual sync trigger from client ─────────────────────────────────
self.addEventListener("message", (event) => {
    if (event.data?.type === "MANUAL_SYNC") {
        event.waitUntil(syncOfflineQueue());
    }
    if (event.data?.type === "GET_QUEUE_STATUS") {
        getAllQueued().then((items) => {
            event.source?.postMessage({
                type: "QUEUE_STATUS",
                count: items.length,
                items: items.map((i) => ({ id: i.id, type: i.type, timestamp: i.timestamp })),
            });
        });
    }
});
