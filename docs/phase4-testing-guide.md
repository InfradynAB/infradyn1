# Phase 4: Testing Guide

## Overview
This guide covers testing the Dual-Path Data Ingestion & Intelligent Progress Tracking system.

---

## 1. Start Development Server

```bash
pnpm dev
```

---

## 2. Database Migration

Ensure schema changes are applied:

```bash
pnpm db:push
```

---

## 3. Test Scenarios

### A. Supplier Progress Update (Path A)

**File:** `src/components/supplier/progress-update-sheet.tsx`

1. Navigate to a supplier dashboard with assigned POs
2. Click **Update Progress** button
3. Select a milestone from the dropdown
4. Adjust the progress slider
5. Select a document type (e.g., "Evidence")
6. Upload a photo/video
7. Submit

**Expected:** Progress record created with `source: SRP`, `trustLevel: VERIFIED`

---

### B. Internal Progress Log (Path B)

**File:** `src/components/procurement/internal-progress-form.tsx`

1. Navigate to a PO detail page as PM
2. Open Internal Progress form
3. Select source type (Site Visit, Call, Email)
4. Update milestone progress
5. Add required notes
6. Submit

**Expected:** Progress record created with `source: IRP`, `trustLevel: INTERNAL`

---

### C. Conflict Detection

**Action:** Create conflicting updates where SRP ≠ IRP by >10%

1. Submit SRP update: 40%
2. Submit IRP update: 60%
3. Check Conflict Queue

**Expected:** Conflict record with `type: PROGRESS_MISMATCH`, `deviationPercent: 20`

---

### D. Forecasting Engine

**File:** `src/lib/actions/progress-engine.ts` → `generateForecastRecords()`

Test manually:

```typescript
// In a server component or API route:
import { generateForecastRecords } from "@/lib/actions/progress-engine";

const result = await generateForecastRecords();
console.log(result);
// { success: true, data: { processed: X, generated: Y } }
```

**Expected:** Milestones with no updates for 7+ days get forecast records

---

### E. Chase Engine

**File:** `src/lib/actions/progress-engine.ts` → `processChaseQueue()`

Test manually:

```typescript
import { processChaseQueue } from "@/lib/actions/progress-engine";

const result = await processChaseQueue();
console.log(result);
// { success: true, data: { processed: X, reminders: Y, escalations: Z } }
```

**Expected:**
- Open conflicts get notifications sent to assignees
- Critical path items escalate after 8 hours
- Financial milestones escalate after 12 hours

---

### F. Supplier Performance Dashboard

**File:** `src/components/admin/supplier-performance-dashboard.tsx`

1. Create test page that calls `getOrganizationSupplierMetrics(orgId)`
2. Pass metrics to `<SupplierPerformanceDashboard />`
3. Verify:
   - Total suppliers count
   - Average reliability score
   - Top performers list
   - Flagged suppliers (>3 missed updates)

---

### G. Supplier History Timeline

**File:** `src/components/supplier/supplier-history-timeline.tsx`

1. Create test page that calls `getSupplierHistory(supplierId)`
2. Pass history to `<SupplierHistoryTimeline />`
3. Verify:
   - Monthly grouping
   - Filter by type and project
   - Trust indicators display
   - Expandable metadata

---

### H. Trust Indicators

**File:** `src/components/shared/trust-indicator.tsx`

Quick visual test:

```tsx
<TrustIndicator level="VERIFIED" />  // Green
<TrustIndicator level="INTERNAL" />  // Amber
<TrustIndicator level="FORECAST" />  // Gray
```

---

## 4. Integration Test Checklist

| Test | Status |
|------|--------|
| Supplier can submit progress update with media | ☐ |
| PM can log internal progress | ☐ |
| Conflict auto-detects on SRP/IRP mismatch >10% | ☐ |
| Forecast records generated for idle milestones | ☐ |
| Chase engine sends reminders | ☐ |
| Escalation triggers correctly (8h/12h) | ☐ |
| Performance dashboard shows metrics | ☐ |
| History timeline shows consolidated view | ☐ |
| Trust indicators display correct colors | ☐ |
| PO Gallery filters and previews work | ☐ |

---

## 5. Cron Job Setup (Production)

Add to your cron scheduler (e.g., Vercel Cron):

```json
{
  "crons": [
    {
      "path": "/api/cron/forecast",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/chase",
      "schedule": "0 */4 * * *"
    }
  ]
}
```

Create API routes:

```typescript
// app/api/cron/forecast/route.ts
import { generateForecastRecords } from "@/lib/actions/progress-engine";
export async function GET() {
  const result = await generateForecastRecords();
  return Response.json(result);
}

// app/api/cron/chase/route.ts
import { processChaseQueue } from "@/lib/actions/progress-engine";
export async function GET() {
  const result = await processChaseQueue();
  return Response.json(result);
}
```

---

## 6. Files Created in Phase 4

| Category | Files |
|----------|-------|
| **Schema** | `db/schema.ts` (modified) |
| **UI Components** | `trust-indicator.tsx`, `progress-update-sheet.tsx`, `internal-progress-form.tsx`, `po-gallery.tsx`, `conflict-queue.tsx`, `supplier-performance-dashboard.tsx`, `supplier-history-timeline.tsx` |
| **Server Actions** | `progress-engine.ts`, `supplier-performance.ts` |

---

## Next Steps

1. Set up cron jobs for automated engines
2. Connect file upload to actual S3 storage
3. Add real session tracking for portal adoption metrics
4. Implement email templates for chase notifications
