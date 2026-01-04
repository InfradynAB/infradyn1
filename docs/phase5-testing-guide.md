# Phase 5: Testing Guide

## Overview
This guide covers testing the Advanced Ingestion & AI Confidence system including Email Ingestion, Smartsheet Sync, OCR/AI Parsing, and Confidence Scoring.

---

## 1. Database Migration

Apply the new schema changes:

```bash
pnpm db:push
```

This adds the following tables:
- `email_ingestion` - Stores inbound emails
- `email_attachment` - Email attachments
- `external_sync` - Sync configurations
- `sync_log` - Sync history
- `usage_quota` - Organization usage limits
- `usage_event` - Usage tracking events

---

## 2. Environment Variables

Add these to your `.env.local`:

```env
# Email Ingestion (optional - for email webhook)
RESEND_WEBHOOK_SECRET=your_webhook_secret

# Smartsheet (optional - for Smartsheet sync)
SMARTSHEET_API_KEY=your_api_key

# Cron Auth (for scheduled jobs)
CRON_SECRET=your_cron_secret

# Already configured (required)
OPENAI_API_KEY=xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=xxx
AWS_REGION=us-east-1
```

---

## 3. Test Scenarios

### A. Usage Quota System

**File:** `src/lib/services/usage-quota.ts`

Test in a server component or API route:

```typescript
import { getQuotaStatus, recordUsage } from "@/lib/services/usage-quota";

// Check quota
const status = await getQuotaStatus(organizationId);
console.log(status);
// { ocr: { used: 0, limit: 100, ... }, aiParse: {...}, ... }

// Record usage
await recordUsage(organizationId, "OCR_PAGE", 5);
```

**Expected:** Quota counters increment, cost estimation updates.

---

### B. Confidence Engine

**File:** `src/lib/services/confidence-engine.ts`

Test the confidence calculation:

```typescript
import { calculateDocumentConfidence, formatConfidence } from "@/lib/services/confidence-engine";

const testData = {
    poNumber: "PO-12345",
    vendorName: "Acme Corp",
    date: "2024-01-15",
    totalValue: 25000,
    currency: "USD",
};

const confidence = calculateDocumentConfidence(testData, "Sample raw text...");
console.log(formatConfidence(confidence.overall)); // e.g., "78%"
console.log(confidence.requiresReview); // true/false
```

---

### C. Excel Import

**File:** `src/lib/services/excel-importer.ts`

Test auto-detection:

```typescript
import { importFromExcel, generateBOQTemplate } from "@/lib/services/excel-importer";
import * as XLSX from "xlsx";

// Generate and save template
const template = generateBOQTemplate();
const buffer = XLSX.write(template, { type: "buffer" });

// Import it back
const result = await importFromExcel(buffer);
console.log(result);
// { success: true, data: [...], structure: { type: "BOQ", ... } }
```

---

### D. Smartsheet Connection

**File:** `src/lib/services/smartsheet.ts`

Test API connection:

```typescript
import { testConnection, listSheets } from "@/lib/services/smartsheet";

// List available sheets
const sheets = await listSheets("your_api_key");
console.log(sheets);

// Test specific sheet
const result = await testConnection({
    apiKey: "your_api_key",
    sheetId: "sheet_id",
});
console.log(result);
// { success: true, sheetName: "...", rowCount: 50 }
```

---

### E. Email Ingestion Webhook

**Endpoint:** `POST /api/email-ingest`

Test with curl:

```bash
curl -X POST http://localhost:3000/api/email-ingest \
  -H "Content-Type: application/json" \
  -d '{
    "from": "supplier@example.com",
    "to": "po-YOUR_ORG_ID@ingest.infradyn.com",
    "subject": "RE: PO-12345 Progress Update",
    "text": "Please see attached progress report.",
    "attachments": []
  }'
```

**Expected:** Email stored in `email_ingestion` table, matched to supplier/PO if found.

---

### F. Email Queue Processing

**Endpoint:** `GET /api/cron/process-emails`

Trigger manually:

```bash
curl http://localhost:3000/api/cron/process-emails
```

**Expected:** Pending emails processed, attachments extracted, confidence scores calculated.

---

### G. UI Components

#### Confidence Indicator

```tsx
import { ConfidenceIndicator } from "@/components/shared/confidence-indicator";

<ConfidenceIndicator 
  score={0.78}
  breakdown={{
    overall: 0.78,
    fields: {
      poNumber: { value: 0.95, reason: "Matches pattern" },
      vendorName: { value: 0.72, reason: "Extracted from text" },
    },
    factors: {
      textQuality: 0.85,
      patternMatch: 0.75,
      crossValidation: 0.70,
      completeness: 0.80,
    },
    requiresReview: true,
    reviewReason: "Low pattern match confidence",
  }}
/>
```

#### Usage Dashboard

```tsx
import { UsageQuotaDashboard } from "@/components/settings/usage-quota-dashboard";

const quota = await getQuotaStatus(orgId);
<UsageQuotaDashboard quota={quota} />
```

---

## 4. Integration Test Checklist

| Test | Status |
|------|--------|
| Schema migration runs successfully | ⬜ |
| Usage quota creates for new org | ⬜ |
| Quota limits block over-limit operations | ⬜ |
| Confidence engine scores documents correctly | ⬜ |
| Excel import detects BOQ structure | ⬜ |
| Excel import detects Milestone structure | ⬜ |
| Smartsheet connection test works | ⬜ |
| Smartsheet sync imports BOQ items | ⬜ |
| Email webhook receives and stores emails | ⬜ |
| Supplier matching by email works | ⬜ |
| PO matching by subject works | ⬜ |
| Email attachments uploaded to S3 | ⬜ |
| Queue processing extracts attachments | ⬜ |
| ConfidenceIndicator displays correctly | ⬜ |
| UsageQuotaDashboard shows usage | ⬜ |
| SyncConfigDialog creates sync | ⬜ |

---

## 5. Cron Jobs Setup (Production)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-emails",
      "schedule": "*/5 * * * *"
    },
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

---

## 6. Files Created in Phase 5

| Category | Files |
|----------|-------|
| **Schema** | `db/schema.ts` (modified) |
| **Services** | `confidence-engine.ts`, `usage-quota.ts`, `excel-importer.ts`, `smartsheet.ts`, `email-processor.ts` |
| **API Routes** | `/api/email-ingest/route.ts`, `/api/cron/process-emails/route.ts`, `/api/sync/test-connection/route.ts`, `/api/sync/trigger/route.ts` |
| **Server Actions** | `external-sync.ts` |
| **UI Components** | `confidence-indicator.tsx`, `usage-quota-dashboard.tsx`, `sync-config-dialog.tsx` |

---

## 7. Next Steps

1. ✅ Run `pnpm db:push` to apply migrations
2. ⬜ Configure Resend inbound email webhook
3. ⬜ Add Smartsheet to a project settings page
4. ⬜ Add usage dashboard to admin/settings page
5. ⬜ Implement GPT-4 Vision fallback for complex layouts
6. ⬜ Add document review UI for correcting low-confidence extractions
