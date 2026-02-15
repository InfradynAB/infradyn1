# Traffic Scaling and Stress Testing Playbook

## Goals

- Keep dashboard APIs responsive under high concurrent traffic.
- Reduce DB pressure with short-lived cache for hot read endpoints.
- Continuously validate performance via repeatable stress tests.

## Hotspots in Current Architecture

- `GET /api/dashboard/analytics` (multi-query KPI + chart aggregation)
- `GET /api/dashboard/command-center` (multiple widgets + summary)
- `GET /api/dashboard/export` (heavy report composition, especially JSON for export builder)

## Caching Strategy (Redis + Local Fallback)

### What is implemented

- Shared cache service at `src/lib/services/traffic-cache.ts`
  - Local memory cache fallback (always available)
  - Optional Redis cache (enabled when `REDIS_URL` is configured)
  - Cache-aside pattern: `getOrSetTrafficCache(key, ttl, loader)`
- Applied to:
  - `src/app/api/dashboard/analytics/route.ts` with 30s TTL
  - `src/app/api/dashboard/command-center/route.ts` with 20s TTL
- Response header for visibility:
  - `x-infradyn-cache: HIT:memory`, `HIT:redis`, or `MISS:*`

### Why short TTL

- Dashboard data changes frequently.
- 20-30 second TTL significantly cuts repeated query cost while preserving near-real-time behavior.

### Recommended next cache targets

- KPI engine internals for repeated org/project computations.
- Export JSON payload composition for identical filters (`source`, `projectId`, `timeframe`, `supplierId`).
- Supplier list lookup for export scope selection.

## Redis Configuration

Set the following env variable in production:

- `REDIS_URL=redis://...`

If missing, the system automatically falls back to local memory cache.

## Traffic Architecture Recommendations

### 1) API Isolation

- Keep read-heavy dashboard APIs stateless and cache-first.
- Move heavy export generation to background jobs for very large datasets.

### 2) Database Hardening

- Ensure indexes exist for frequently filtered fields:
  - `organization_id`, `project_id`, `supplier_id`, status, dates.
- Monitor slow queries and add targeted composite indexes.

### 3) Backpressure and Protection

- Add rate limits by user + organization for expensive endpoints.
- Add timeout guards for downstream services.
- Return graceful fallback payloads for non-critical widgets.

### 4) Queueing for Peak Export Loads

- For large export jobs, store request + metadata and process async.
- Notify user when export is ready (in-app + email link).

## Stress Testing

### Script

- `scripts/load/stress-dashboard.mjs`

### Run

```bash
AUTH_COOKIE="<your_session_cookie>" BASE_URL="http://localhost:3000" pnpm load:dashboard
```

### Windows PowerShell Run

```powershell
$env:AUTH_COOKIE = "<session_token_or_full_cookie>"
$env:AUTH_COOKIE_NAME = "better-auth.session_token"
$env:BASE_URL = "http://localhost:3000"
pnpm load:dashboard
```

Notes:

- `AUTH_COOKIE` accepts either:
  - full cookie pair: `better-auth.session_token=<token>`
  - raw token only: in this case script auto-wraps with `AUTH_COOKIE_NAME`.
- Script runs a preflight auth check and aborts if status is non-2xx.

Optional tuning variables:

- `DURATION` (seconds, default `30`)
- `CONNECTIONS` (default `40`)
- `PIPELINING` (default `1`)

### Read results

Focus on:

- `latencyP97_5Ms` and `latencyP99Ms`
- `requestsPerSec`
- `r2xx`, `r4xx`, `r5xx`, `errors`, `timeouts`

## Success Targets (Initial)

- P97.5 latency < 400ms for cached analytics/command-center calls.
- 0 timeouts and negligible non-2xx under moderate load.
- Stable request throughput with no DB saturation.

## Rollout Checklist

1. Enable `REDIS_URL` in staging.
2. Run stress test baseline (cache disabled).
3. Enable cache and rerun same profile.
4. Compare latency percentiles and DB utilization.
5. Roll to production with alert thresholds.
