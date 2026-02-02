# Phase 4: Dual-Path Ingestion & Intelligent Tracking

Phase 4 introduces the "Dual-Path" logic, a core Infradyn innovation that reconciles asynchronous data from multiple sources to create a high-trust progress baseline.

## 1. The Dual-Path Model

The system tracks progress via two primary channels:
- **Path A (Supplier-Driven)**: Progress claims submitted via the Supplier Portal or automated ingestion.
- **Path B (Internal-Driven)**: Verification logged by Site Engineers or PMs during inspections.

### `progress_record` Schema:
Records are tagged with a `source`:
- `SRP`: Supplier Reported Progress.
- `IRP`: Internal Reported Progress.
- `FORECAST`: AI-generated prediction (used when data is stale).

## 2. Trust Levels & Conflict Engine

Every progress update is assigned a `trust_level` based on its provenance.

### Trust Grading:
1. **Verified (Green)**: Internal engineer has confirmed physical progress.
2. **External (Amber)**: Supplier claim not yet verified.
3. **Forecast (Gray)**: System prediction based on historical velocity.

### Conflict Detection Loop:
The `src/lib/services/confidence-engine.ts` service constantly scans for "High-Variance" events.
- **Trigger**: Deviation between Path A and Path B exceeds 10%.
- **Action**: Creates a `conflict_record` in the database and routes it to the PM's "Unified Conflict Queue".
- **Resolution**: PM must adjudicate (accept A, accept B, or set manual Value C).

## 3. The Chase Engine (Escalation)

Phase 4 moves from passive tracking to active management via `src/lib/actions/escalation-engine.ts`.

### Logic:
- **Rule**: If no update is received for a "Critical Path" item within 7 days.
- **Action**: Automated reminder sent.
- **Escalation**: If ignored for 48 hours, the risk level is bumped, and the Project Director is notified.

## 4. Evidence Bundles

To support "Verified" trust levels, users must attach evidence.
- **`evidence_bundle`**: A logical container for a progress update.
- **`evidence_file`**: Links to S3 documents.
- **GPS Verification**: The system captures and stores GPS coordinates from delivery photos to prevent "fraudulent" check-ins.

---

### Technical Implementation: Progress Calculation
`Calculated % = Weighted average of (Verified Progress * 0.8 + Supplier Claim * 0.2)`
*(Note: Real implementation may vary based on project-specific weighting config).*
