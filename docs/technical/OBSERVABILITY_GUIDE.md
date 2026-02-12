# Infradyn Observability Guide (Sentry)

This guide outlines the architecture and usage of Sentry for full-stack observability within the Infradyn platform.

## 1. Overview
Infradyn uses [Sentry](https://sentry.io) to capture real-time errors, monitor performance, and provide deep visibility into the system health across:
- **Client Runtime**: Browser-side React component crashes and JS errors.
- **Server Runtime**: Next.js Server Actions and API Route failures.
- **Edge Runtime**: Middleware and Edge-side logic.

## 2. Configuration Architecture

### Initialization Configs
- `sentry.client.config.ts`: Configured with **Session Replays** (10% sampling) to visualize user errors.
- `sentry.server.config.ts`: Parallelized for high-throughput Node.js execution.
- `sentry.edge.config.ts`: Lightweight config for low-latency edge environments.

### Source Map Security
During `next build`, source maps are automatically generated and uploaded to Sentry's private servers. 
- **Benefit**: Readable production stack traces.
- **Security**: Source maps are deleted from the public bundle via `hideSourceMaps: true` in `next.config.ts` to prevent exposing source code to end-users.

## 3. Core Utilities

Located in `src/lib/sentry/utils.ts`.

### Manual Error Reporting
Use `captureException` in try-catch blocks where you handle the error but still need visibility.
```typescript
import { captureException } from "@/lib/sentry/utils";

try {
  await criticalOperation();
} catch (error) {
  captureException(error, { tags: { section: "finance" } });
  // Graceful recovery
}
```

### User Identification
The system automatically attaches user context to reports via the root layout, but can be manually updated:
```typescript
import { setUserContext } from "@/lib/sentry/utils";

setUserContext({ id: "user_123", email: "pm@infradyn.com" });
```

## 4. UI Resilience: Error Boundaries

The `SentryErrorBoundary` component (`src/lib/sentry/error-boundary.tsx`) is wrapped around the application root.
- **Fallback UI**: Displays a professional "Something went wrong" screen instead of a white-page crash.
- **Auto-Reporting**: Every crash caught by the boundary is automatically dispatched to Sentry with the component stack trace.

## 5. Verification: Sentry Debug Page
A dedicated diagnostic page is available in development at `/sentry-debug`. Use it to verify:
1. React component crash handling.
2. Manual exception capture.
3. Performance event logging.
