# Phase 7: Quality Excellence & NCR Management

Phase 7 closes the feedback loop between site inspections and financial settlements via Non-Conformance Reports (NCRs).

## 1. NCR Workflow

An NCR represents a formal deviation from quality standards.

### Data Model:
- **`ncr`**: The core record (Status, Severity, Description).
- **`ncr_comment`**: Threaded discussion between PM, QA, and Supplier.
- **`ncr_magic_link`**: Secure, no-auth-required access for suppliers to respond to specific NCRs.

### Status Flow:
`OPEN` -> `SUPPLIER_RESPONDED` -> `REINSPECTION` -> `CLOSED`.

## 2. "Payment Shield" Logic

This is a critical financial control. When an NCR is marked as "Critical" or "Major", it can be linked to specific PO milestones.

### System Enforcement (`src/lib/services/ncr-engine.ts`):
If an active NCR is linked to a milestone, the system **locks** that milestone.
- **Result**: The PM cannot mark the milestone as "Accepted" or trigger an invoice for that specific portion of work until the NCR is "CLOSED".

## 3. AI-Driven Resolution Summaries

NLP is used to summarize long comment threads into an executive "Current State" summary.
- **Service**: `src/lib/services/ncr-ai-parser.ts`.
- **Trigger**: Every 5 comments or a status change.
- **Purpose**: Allows PMs to quickly understand high-severity quality issues without reading hundreds of messages.

## 4. NCR SLA Engine

To prevent project delays, every NCR has an SLA based on severity.
- **CRITICAL**: 4-hour response required.
- **MAJOR**: 24-hour response required.
- **MINOR**: 72-hour response required.

If an SLA is breached, the `ncr-sla-engine.ts` triggers an escalation to higher management levels.

---

### Developer Tip: Supplier Magic Links
Magic links (`ncr_magic_link`) use a high-entropy 64-character token. When a supplier clicks these, they are granted **scoped access** to respond *only* to that specific NCR, bypassing the full login flow for emergency site updates.
