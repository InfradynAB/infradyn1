# Phase 5: Automated Ingestion & Change Orders

Phase 5 focuses on efficiency via AI-powered data ingestion and the management of financial deviations through Change Orders (COs).

## 1. AI-Powered Data Ingestion

Infradyn uses a "Hybrid OCR/LLM" stack to process unstructured documents.

### Ingestion Pipeline (`src/lib/services/ai-extraction.ts`):
1. **Layer 1 (OCR)**: AWS Textract extracts raw text and spatial layout (tables, headers).
2. **Layer 2 (LLM)**: OpenAI GPT-4o processes the raw text with a structured schema to extract PO numbers, vendors, and line items.
3. **Layer 3 (Normalization)**: Unit of Measure (UOM) and Currency are mapped to system-standard values.

### Email Inbound (`src/lib/services/email-processor.ts`):
Suppliers email documents to a specific project sub-address.
- System parses attachments.
- Links them automatically to the correct `purchase_order` via fuzzy-matching the PO number in the document body.

## 2. Change Order (CO) Engine

Change Orders manage deviations in scope, rate, or quantity.

### Financial Relationship:
`Revised PO Value = Original PO Value + Σ(Approved Change Orders)`

### Workflow (`src/lib/actions/change-order-engine.ts`):
1. **Request**: Initiated by PM or Supplier.
2. **Impact Analysis**: System auto-calculates the budget impact.
3. **Approval Chain**: Multi-stage approval (PM -> Finance -> Director).
4. **Implementation**: Once approved, the `boq_item` revised quantity is updated, and the `po_version` is bumped.

## 3. Variation Order (VO) Support

Phase 5 allows for new items ("Variations") to be added to an active PO.
- **`is_variation` flag**: Distinguishes original scope from new scope.
- **Calculations**: Variation totals are tracked separately in reporting to monitor "Scope Creep".

## 4. Usage Quotas

To manage costs for AI services, Phase 5 implements usage tracking.
- **`usage_quota` table**: Tracks OCR pages and LLM tokens per organization per month.
- **Gatekeeper**: Middleware blocks ingestion if the organization exceeds its monthly limit.

---

### Developer Tip: Testing Ingestion
Use the `src/lib/services/ai-extraction.test.ts` to simulate document processing with sample PDFs without hitting live AWS/OpenAI endpoints during local development.
