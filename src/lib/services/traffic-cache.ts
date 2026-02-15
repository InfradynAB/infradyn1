type CacheLayer = "memory" | "redis" | "none";

type CacheRecord = {
  value: string;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheRecord>();
const inFlightLoads = new Map<string, Promise<unknown>>();
let redisClientPromise: Promise<{
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options: { EX: number }) => Promise<unknown>;
} | null> | null = null;

function getMemory(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function setMemory(key: string, value: string, ttlSeconds: number): void {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      try {
        const redis = await import("redis");
        const client = redis.createClient({
          url: process.env.REDIS_URL,
          socket: {
            reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
          },
        });

        client.on("error", (error: unknown) => {
          console.warn("[traffic-cache] Redis error", error);
        });

        await client.connect();
        return client;
      } catch (error) {
        console.warn("[traffic-cache] Redis unavailable, fallback to memory cache", error);
        return null;
      }
    })();
  }

  return redisClientPromise;
}

export function buildTrafficCacheKey(prefix: string, parts: Array<string | undefined | null>): string {
  const normalized = parts.map((part) => (part ?? "-").toString().trim() || "-");
  return `${prefix}:${normalized.join(":")}`;
}

export async function getOrSetTrafficCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<{ value: T; cache: "HIT" | "MISS"; layer: CacheLayer }> {
  const fromMemory = getMemory(key);
  if (fromMemory) {
    return {
      value: JSON.parse(fromMemory) as T,
      cache: "HIT",
      layer: "memory",
    };
  }

  const redis = await getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (raw) {
        setMemory(key, raw, Math.min(ttlSeconds, 15));
        return {
          value: JSON.parse(raw) as T,
          cache: "HIT",
          layer: "redis",
        };
      }
    } catch (error) {
      console.warn("[traffic-cache] Redis read failed", error);
    }
  }

  const existingLoad = inFlightLoads.get(key) as Promise<T> | undefined;
  if (existingLoad) {
    const value = await existingLoad;
    return {
      value,
      cache: "HIT",
      layer: redis ? "redis" : "memory",
    };
  }

  const loadPromise = (async () => {
    const value = await loader();
    const serialized = JSON.stringify(value);
    setMemory(key, serialized, ttlSeconds);

    if (redis) {
      try {
        await redis.set(key, serialized, { EX: ttlSeconds });
      } catch (error) {
        console.warn("[traffic-cache] Redis write failed", error);
      }
    }

    return value;
  })();

  inFlightLoads.set(key, loadPromise);
  try {
    const value = await loadPromise;
    return {
      value,
      cache: "MISS",
      layer: redis ? "redis" : "memory",
    };
  } finally {
    inFlightLoads.delete(key);
  }
}
