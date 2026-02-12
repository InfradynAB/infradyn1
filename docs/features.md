# INFRADYN MATERIAL TRACKER — FEATURES DOCUMENT

**Version:** 1.0  

## 0. Architectural Rule

To ensure smooth delivery and continuous testing:

- Every feature must:
    - Stand on its own
    - Be testable without later modules
    - Have its own UI, API, data model, and acceptance test
    - Not depend on unfinished features

This allows weekly demos and prevents bottlenecks.

---

## Phase 1 — Foundations (Core System Setup)

### Feature 1 — Authentication & RBAC
- **Goal:** Create secure access, user roles, and multi-tenant project boundary.
- **Includes:** JWT authentication, 2FA for Admin, roles (Admin, PM, Supplier, QA, Site Receiver), server-side permissions, multi-tenant isolation, profile & password management.
- **Why independent:** Provides standalone login and dashboard access.
- **Test:** Login/logout, role-based access, Admin invitations.

### Feature 2 — Organization & Project Setup
- **Goal:** Establish containers for all data.
- **Includes:** Create organization, create project, set project details, assign users.
- **Independent:** Fully testable without PO/BOQ.
- **Test:** Admin creates org → project, PM views project dashboard.

---

## Phase 2 — Procurement Foundations

### Feature 3 — PO U/.pload & Storage (No AI)
- **Goal:** Basic document upload and storage with metadata.
- **Includes:** Upload PO PDF, store in S3, capture metadata (PO number, vendor, value, currency), versioning.
- **Independent**
- **Test:** Upload PO v1/v2 with versioning.

### Feature 4 — AI PO Extraction (Headers Only)
- **Goal:** Extract structured PO header fields via Textract + GPT.
- **Includes:** Textract OCR, GPT parsing, extract PO header fields, accuracy set, manual corrections.
- **Independent**
- **Test:** Upload → extract → edit fields.

### Feature 5 — BOQ Upload & Mapping
- **Goal:** Process Excel BOQs and map line items.
- **Includes:** Excel upload, item parsing, PO mapping, line-item validation.
- **Independent**
- **Test:** Upload Excel → mapping table → validate quantities/units.

---

## Phase 3 — Supplier Workflows

### Feature 6 — Supplier Onboarding
- **Goal:** Provide suppliers access to their POs.
- **Includes:** Supplier invite, email signup, assigned PO dashboard, document uploads.
- **Independent**
- **Test:** Supplier views only assigned POs.

### Feature 7 — Supplier Document Upload (Compliance)
- **Goal:** Capture compliance documentation before work starts.
- **Includes:** Upload certifications, approval flow, status tracking.
- **Independent**
- **Test:** Supplier upload → PM approval.

---

## Phase 4 — Logistics Workflows

### Feature 8 — Packing List Upload
- **Goal:** Process shipment packing lists.
- **Includes:** Upload PL, Textract extraction, GPT mapping, link to PO line items.
- **Independent**
- **Test:** Upload PL → view extracted items.

### Feature 9 — Shipment & Logistics Tracking
- **Goal:** Track shipment data.
- **Includes:** Tracking number entry, optional carrier integrations, ETA calculation, status monitoring.
- **Independent**
- **Test:** Enter tracking ID → status captured.

---

## Phase 5 — Progress Engine Foundations

### Feature 10 — Supplier Progress Reporting (SRP)
- **Goal:** Capture supplier milestone progress.
- **Includes:** Milestone list, % completion, photo evidence, timestamps.
- **Independent**
- **Test:** Supplier submission visible to PM.

### Feature 11 — Internal Progress Reporting (IRP)
- **Goal:** Record internal site progress.
- **Includes:** On-site updates, photo evidence, optional QR scanning, timestamp/location.
- **Independent**
- **Test:** PM views internal values.

---

## Phase 6 — AI Intelligence

### Feature 12 — Dual-Path Data Normalization
- **Goal:** Normalize SRP and IRP records using high-performance parallel processing.
- **Includes:** Align percentages/dates/units via Python FastAPI service, prepare comparisons with numpy-backed computation.
- **Independent**
- **Test:** SRP + IRP imported → processed by Python service → normalized.

### Feature 13 — Dual-Path Comparison Engine
- **Goal:** Detect SRP vs IRP mismatches at scale.
- **Includes:** Quantity, progress, evidence, and date checks powered by parallel execution blocks.
- **Independent**
- **Test:** System flags alignment status via Python-backed analysis.

### Feature 14 — Conflict Detection Engine
- **Goal:** Generate categorized conflict records.
- **Includes:** Quantity, progress, delivery, evidence, NCR conflicts.
- **Independent**
- **Test:** Create mismatch → conflict generated.

### Feature 15 — Confidence Scoring Engine
- **Goal:** Score data reliability.
- **Includes:** History, evidence quality, AI certainty, timestamps, supplier reliability.
- **Independent**
- **Test:** Sample processing → High/Medium/Low.

### Feature 16 — Risk Scoring
- **Goal:** Predict risk for milestones, POs, suppliers.
- **Includes:** Risk weights, deviation impact, conflict density, supplier history.
- **Independent**
- **Test:** Risk color and score update.

### Feature 17 — Auto-Chase Engine
- **Goal:** Automate reminders and escalation.
- **Includes:** SLA timers, email reminders, escalation chain, closeout conditions.
- **Independent**
- **Test:** Missing evidence triggers chase.

---

## Phase 7 — Financials

### Feature 18 — Invoice Upload
- **Goal:** Upload invoices to S3.
- **Independent**
- **Test:** Invoice uploaded → visible to PM.

### Feature 19 — Invoice AI Extraction
- **Goal:** Extract invoice data and match to POs.
- **Includes:** Textract, GPT extraction, line-item interpretation.
- **Independent**

### Feature 20 — Financial Matching Engine
- **Goal:** Match Invoice → CO → Milestone → PO.
- **Includes:** Tolerance rules, partial invoice handling, variance detection.
- **Independent**
- **Test:** Sample match accuracy.

---

## Phase 8 — Quality & NCR

### Feature 21 — NCR Creation
- **Goal:** Raise quality issues.
- **Includes:** Type, severity, evidence, assignment, status.
- **Independent**

### Feature 22 — NCR Workflow
- **Goal:** Manage NCR lifecycle (Open → Review → Remediation → Closed).
- **Independent**

### Feature 23 — Milestone Blocking
- **Goal:** Block milestone completion when NCR exists.
- **Independent**

---

## Phase 9 — Offline-First PWA

### Feature 24 — Offline Data Capture
- **Goal:** Allow offline work.
- **Includes:** IndexedDB, local queue, cached POs, local photos.
- **Independent**

### Feature 25 — Sync Engine
- **Goal:** Sync changes when online.
- **Includes:** Background sync, conflict handling, progress merge.
- **Independent**

---

## Phase 10 — Dashboards & Analytics

### Feature 26 — Executive Dashboard
- **KPIs:** Delivery status, high-risk POs, supplier risk index, pending invoices.

### Feature 27 — PO Deep Dive Dashboard
- **Includes:** Timeline view, conflict history, evidence review.

### Feature 28 — Supplier Performance Dashboard
- **Metrics:** Reliability, conflicts, delivery accuracy, SLA compliance.

### Feature 29 — Export Engine
- **Exports:** PDF, Excel, CSV.

---

## Phase 11 — Admin Console

### Feature 30 — Threshold & Tolerance Settings
- **Manage:** Deviation thresholds, confidence weights, risk weights, escalation steps.

### Feature 31 — Audit Logs
- **Goal:** System-wide immutable logs.

### Feature 32 — Integration Keys & Config
- **Manage:** AWS, OpenAI, carrier APIs, Resend.

---

## Phase 12 — UAT, Security, Deployment

### Feature 33 — UAT Scripts
- **Goal:** Per-module testing.

### Feature 34 — Penetration Testing
- **Goal:** Address OWASP Top 10.

### Feature 35 — Production Deployment
- **Goal:** Execute cutover plan.

---

## Phase 13 — System Reliability & Maintenance

### Feature 36 — Sentry Monitoring & Observability
- **Goal:** Ensure 99.9% uptime and rapid debugging.
- **Includes:** Full-stack error tracking (Client/Server/Edge), performance profiling, source map integration, custom error boundaries.
- **Independent**
- **Test:** Trigger error → view in Sentry Dashboard with clean stack trace.

### Feature 37 — Parallel Extraction Scaling
- **Goal:** Process high volumes of site documents without blocking UI.
- **Includes:** Decoupled FastAPI extraction service, circuit-breaking health checks, async document queues.
- **Independent**
- **Test:** Upload 10+ documents simultaneously → UI remains responsive.
