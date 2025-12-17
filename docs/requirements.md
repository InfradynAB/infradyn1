# INFRADYN MATERIAL TRACKER — REQUIREMENTS & HIGH-LEVEL DESIGN

**Version:** 1.0  


## 1. Purpose

This document specifies the functional and non-functional requirements, high-level design, and modular architecture for the INFRADYN Material Tracker. It defines a delivery approach where features are implemented in independent, testable modules so no feature waits on another late feature to be testable.

## 2. High-Level Goals & Success Criteria

### Goals

- Replace fragmented Excel/email trackers with a single source of truth for PO → Delivery → Payment.
- Provide AI-augmented document ingestion (PO, BOQ, invoices, packing lists, NCRs).
- Implement Dual-Path Progress Tracking (Supplier vs Internal) with conflict detection, confidence scoring, and risk scoring.
- Provide offline-capable PWA for site teams.
- Ensure auditability, security, and enterprise reporting.

### Success Criteria

- All core modules deliver independent, demoable functionality weekly.
- AI extraction meets agreed thresholds (header ≥92%, line-item ≥85%).
- Finance match accuracy ≥95% on sample dataset.
- PWA offline sync reliability ≥99% on tested scenarios.
- Client acceptance in UAT with zero critical defects.

## 3. Agreed Technology Strategy (Final)

- **AI / Heavy Engine:** Python (FastAPI + async workers). All OCR, NLP, ML, scoring, forecasting live here.
- **Portal & Orchestration:** TypeScript + Next.js (App Router). UI, supplier portal, PWA, auth, lightweight orchestration.
- **Database:** PostgreSQL (Neon).
- **Storage:** S3-compatible buckets.
- **OCR:** AWS Textract (layout-aware).
- **LLM:** OpenAI GPT via AI SDK (semantic extraction / mapping).
- **Queues / Cache:** Redis (or Upstash).
- **CI/CD / Hosting:** Vercel (frontends), selected host for Python workers (ECS/Render/Railway).
- **Email:** Resend (or provider choice).
- **Monitoring:** Sentry, CloudWatch.

## 4. Modular Architecture (Independent, Testable Modules)

Each module must be deployable and tested independently with clear API contracts.

### 4.1 Core Modules

#### Authentication & RBAC

- **Responsibilities:** Authentication (JWT + refresh), 2FA for admin, role enforcement at API level.
- **Independent tests:** login flows, token refresh, role validation.

#### Organization & Project Management

- **Responsibilities:** Multi-tenant org setup, project workspace, retention & encryption settings.
- **Independent tests:** org creation, project creation, folder schema generation.

#### PO Upload & BOQ Parsing

- **Responsibilities:** Upload PO/BOQ (PDF/Excel/ZIP), Textract OCR, GPT semantic extraction (headers, milestones, BOQ).
- **Independent tests:** upload → extract header fields; BOQ mapping; versioning.

#### Supplier Portal & Onboarding

- **Responsibilities:** Supplier login, assigned PO inbox, document uploads (certs, insurance), compliance status.
- **Independent tests:** supplier signup via invite, upload/approve document flows.

#### Logistics & Shipment Tracking

- **Responsibilities:** Shipment uploads, external carrier API integration, fallback manual upload, ETA/confidence.
- **Independent tests:** upload packing list → extract; link to tracking id; fallback acceptance of supplier AOS.

#### Invoice & Financial Ledger

- **Responsibilities:** Invoice ingestion, AI extraction, invoice → CO → milestone → PO matching, ledger states (Committed/Paid/Pending).
- **Independent tests:** invoice upload → correct matching; tolerance rules.

#### Dual-Path Progress Engine (SRP & IRP) — Core intelligence

- **Responsibilities:** Accept Supplier Reported Progress (SRP) and Internal Reported Progress (IRP); temporal alignment; normalization.
- **Independent tests:** create SRP/IRP events; show side-by-side; basic deviation detection.

#### Conflict Detection & Reconciliation

- **Responsibilities:** Compare SRP vs IRP, create ConflictRecords, state machine with SLAs & escalation.
- **Independent tests:** create conflict; enact SLA timers; escalate.

#### Confidence Scoring Engine

- **Responsibilities:** Compute confidence per record using weighted formula; mark High/Medium/Low.
- **Independent tests:** compute score for sample inputs; low confidence triggers PM review.

#### Risk Scoring & Auto-Chase Engine

- **Responsibilities:** Compute risk per PO/supplier; drive automated notifications and escalation sequences (email/in-app/SMS).
- **Independent tests:** risk calculation; auto-chase sequence & retry logic.

#### NCR & Quality Module

- **Responsibilities:** NCR creation (offline capable), linking to PO, severity + SLA, milestone locking.
- **Independent tests:** create NCR offline, sync, milestone lock behaviour.

#### Offline PWA (Site Interface)

- **Responsibilities:** IndexedDB queue, photo/video capture, retry + background sync, conflict on sync resolution.
- **Independent tests:** offline create → sync; conflict handling.

#### Dashboards & Reporting

- **Responsibilities:** Executive/Action/DeepDive views, KPI aggregation, exports (PDF/CSV/PPT).
- **Independent tests:** dashboard widgets render from sample data; exports work.

#### Admin & Config Console

- **Responsibilities:** Thresholds & tolerance configuration, integration keys, retention policy, audit logs, user management.
- **Independent tests:** change config → affect workflow (e.g., deviation threshold).

## 5. Module Interfaces & Contracts

- All modules expose REST/HTTP JSON APIs with OpenAPI specs.
- **Contract examples (high-level):**
    - `POST /api/po/upload` → returns `po_id`, `raw_text`, `extraction_status`.
    - `POST /api/progress/supplier` → returns `progress_record_id`, `confidence_score`.
    - `GET /api/conflicts?orgId=...` → list of `ConflictRecords` with states and evidence.
- Each integration uses message queue events for asynchronous processing (e.g., `po_uploaded` → `ai_ingest_worker`).

## 6. Data Model (High Level)

**Key entities (attributes simplified):**

- **Organization:** `id`, `name`, `retention_policy`, `encryption_settings`
- **Project:** `id`, `org_id`, `name`, `start_date`, `end_date`, `budget`
- **PO:** `id`, `po_number`, `supplier_id`, `total_value`, `currency`, `status`, `version`
- **BOQItem:** `id`, `po_id`, `item_number`, `description`, `unit`, `quantity`, `unit_price`
- **Milestone:** `id`, `po_id`, `title`, `expected_date (ROS)`, `required_documents`, `payment_pct`
- **ProgressRecord:** `id`, `milestone_id`, `source (SRP|IRP)`, `percent_complete`, `evidence_bundle_id`, `timestamp`, `confidence_score`
- **EvidenceBundle:** `id`, `files[]`, `metadata (gps, uploader, ts)`
- **ConflictRecord:** `id`, `po_id`, `milestone_id`, `type`, `state`, `created_at`, `sla_deadline`
- **Invoice:** `id`, `invoice_number`, `vendor`, `amount`, `date_uploaded`, `matched_milestone_id`, `status`
- **NCR:** `id`, `po_id`, `item_id`, `severity`, `status`, `assigned_to`, `cost_impact`
- **RiskProfile:** `id`, `supplier_id`, `score`, `last_updated`

**Indexes:** `po_number`, `milestone_id`, `supplier_id`, `conflict_state`, `progress_record.timestamp`. Use GIN index for semantic search fields.

## 7. Confidence & Risk Scoring (Specification)

**Confidence score formula (example):**

```
S = 0.4*C_hist + 0.3*E_quality + 0.2*AI_certainty + 0.1*MetaIntegrity
```

- Tuneable weights stored in DB and adjustable via Admin Console.
- Output categories: High (≥85), Medium (60–84), Low (<60).

**Risk score formula (example):**

```
R = 0.35*Timeliness + 0.25*DeliveryVariance + 0.2*SupplierHistory + 0.2*ConflictDensity
```

- Risk categories: Green (<0.4), Yellow (0.4–0.69), Red (≥0.7).
- Red triggers immediate PM + optional SMS, and high auto-chase priority.
- Auto-chase sequence and retry logic: initial → 24h → 48h → escalate to PM (72h) → Admin (96h). Exponential backoff for API retries; daily retries for email failures. Templates stored in DB and i18n ready.

## 8. Acceptance Criteria (per Module)

Each module must declare specific acceptance tests before milestone payment:

- **PO Upload:** 92% header extraction on sample set of 50 POs; manual edit flow works.
- **Supplier Portal:** Invite → signup → upload → admin approve flow tested.
- **Logistics:** packing list extraction accuracy >85%; tracking API event ingestion simulated.
- **Invoice Matching:** 95% correct match on 100 sample invoices under tolerance rules.
- **Dual-Path:** SRP/IRP entries show side-by-side; deviation thresholds trigger conflicts.
- **Conflict Engine:** state transitions occur; SLA timers, escalations, and manual override tested.
- **NCR / PWA:** offline create → sync with 0 data loss across repeated trials.
- **Dashboards:** widgets render under 2s for typical dataset; exports generate correct files.

Acceptance tests are combined into UAT in Week 10 with the client.

## 9. Testing Strategy

- Unit tests, integration tests, E2E tests (Cypress), AI validation tests (known dataset), load tests (simulate 100 concurrent users + 200 docs/hr ingestion), and security tests (OWASP top 10 pen test before production).
- Maintain test dataset repository (sample POs, invoices, PLs, NCRs, photos).
- CI must run unit + integration on PR, and nightly AI validation runs to detect model drift.

## 10. Operational & Deployment Requirements

- **Environments:** dev, staging, UAT, production. Database branching for Neon recommended.
- **Infrastructure:** IaC via Terraform. Migrations automated.
- **Observability:** request/response logs, worker metrics, Sentry for exceptions, CloudWatch for AWS resources.
- **Backups:** daily DB backup with 30 days retention. RTO ≤ 4 hours, RPO ≤ 1 hour.

## 11. Security & Compliance

- TLS 1.3 for all traffic; AES-256 at rest.
- Immutable audit logs for all CRUD ops.
- RBAC enforced server-side.
- Admin MFA required.
- Weekly SCA and a pen test prior to production.
- Data retention configurable per org; right-to-be-forgotten flows must exist.

## 12. Integrations & Accounts (What to Request from Client)

- AWS account (Textract, S3, IAM, CloudWatch).
- Neon/Railway DB access (staging/prod).
- Vercel org access (frontend).
- Python host access (Railway/Render/ECS) or provide hosting.
- Resend (email) account.
- Carrier API keys (DHL, Maersk, local carriers) or list of preferred carriers.
- Domain & DNS control for `tracker.<client-domain>.com`.

## 13. Non-Functional Requirements (NFRs)

- **Performance:** doc ingestion <12–30s depending on size; dashboard entities <2s.
- **Scalability:** horizontal workers for ingestion; DB connection pooling.
- **Reliability:** queue retry on failure; idempotent ingestion.
- **Usability:** PWA must function offline; mobile responsive dashboards.
- **Maintainability:** modular microservices and clear separation Python/TS.

## 14. Deliverables & Timeline (Modular, Independent)

Deliverables will be grouped into weekly, demoable modules (Week 1..10). Each weekly deliverable is independently testable. Use the previously agreed 10-week roadmap; each module above maps to a week or week block.

## 15. Change Control & Scope Management

Any work outside this requirements doc is a Change Order. COs require written approval and cost/time estimate. Minor clarifications (UI text, labels) are within scope; functional or integration additions are CO.

## 16. Risk Register (Top Items)

- **AI accuracy lower than expected** → mitigation: human-in-the-loop fallbacks, incremental tuning, acquire more samples.
- **Missing carrier APIs** → mitigation: hybrid manual upload path with ETA confidence.
- **Supplier adoption** → mitigation: simple supplier UX, onboarding support, training sessions.

## 17. Onboarding & Handover

- Provide sample documents (POs, BOQs, invoices, packing lists, NCRs) before Milestone 2.
- Admin must provide AWS/Neon/Vercel accounts and initial user list in Week 1.
- Handover includes code repo, IaC, runbooks, UAT signoff, and 30-day warranty support.

## 18. Appendix — Key Configuration Tables (Examples)

- **Deviation thresholds:** Yellow = >7% | Red = >15% (configurable).
- **Confidence buckets:** High ≥85 | Medium 60–84 | Low <60.
- **Auto-chase timings:** 24h/48h/72h/96h escalations (configurable).
