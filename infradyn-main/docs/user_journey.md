# MATERIALS TRACKER MASTER USER JOURNEY

## USER ROLES

| Role | Key Responsibilities | System Access / Permissions |
| :--- | :--- | :--- |
| **Project Manager** | Oversees all procurement activities from supplier onboarding to PO tracking, milestone verification, payments, and performance monitoring. Approves supplier data, documents, and deliveries. Can comment on all records, upload, and override workflows. | Full access to all modules (Procurement, Supplier, PO, Material Tracking, NCR, Reporting). <br> Can manage users, roles, workflows, and approval chains. <br> View and edit financial data, payment terms, and cost performance. |
| **Quality / Inspection Engineer** | Conducts inspections, uploads or creates NCRs, validates inspection reports and material compliance certificates. Tracks material readiness, test results, and delivery quality; can comment on all NCRs. | Access to Material Tracking, NCR Module, Inspection Reports, and Supplier Documents. <br> No access to financial data or cost analytics. <br> Can comment, upload images, or add annotations linked to materials or deliveries. |
| **Site Material Receiver** (Internal or External Contractor) | Logs and confirms material deliveries, uploads delivery notes, CMRs, photos, and comments. Raises NCRs for damaged or incorrect materials for own deliveries; can add comments for own deliveries. | Access to PO Tracking, Delivery Status, and NCR Module (own deliveries only). <br> No access to cost data, supplier master data, or other users’ deliveries. <br> Can add comments or upload files tied to their PO or delivery. |
| **Supplier** (External) | Receives POs, uploads invoices, delivery docs, inspection certificates, progress updates, and milestone payment requests. Responds to comments or NCRs raised by project team. | Access only to own assigned POs. <br> Can upload PDFs, Excel trackers, delivery evidence, and comments. <br> No visibility of internal workflows or other suppliers. |
| **System Infradyn Admin** (Platform / Client IT) | Manages technical configuration, user authentication, role enforcement, and compliance (GDPR, audit logs, retention). No operational control over procurement data & no operational data edit rights. | Access to admin console, audit logs, encryption config, and data retention settings. |

---

## PHASE 1 — ORGANIZATION SETUP & PROJECT CREATION

### Journey Steps
1. **Infradyn admin** logs in to admin portal → creates **Organization Account** (Organization name; contact person; email).
2. Admin **Invites Project Manager**.
   - System generates invitation email or secure link for the Project Manager.
3. **Project Manager** accepts invite → creates login credentials → activates Project Manager account → Edits Organization details to add more information if needed.
4. **Project Manager Adds internal team members** (Procurement & Cost Control (in this case all get the project manager role), Quality/Inspection Engineer, Site Receiver, Supplier).
   - Defines RBAC roles (Project Manager = full access).
5. **Creates a new Project Workspace** (e.g., “SSAB Furnace Rebuild 2025”).
   - Defines project parameters: location (**google maps api** for weather), financial data (budget), currency (**currency converter API** for spot rates), start and finish date, material categories.
6. **Uploads Supplier Database** (Excel import) to pre-register potential suppliers for the organization = Supplier Name; Contact person; contact person email.
   - These suppliers are not yet invited to active POs.
   - This only initializes a central supplier registry at organization level.

### System Actions
- Organization and user profiles stored with GDPR-compliant encryption.
- Project workspace initialized with folder schema and unique project ID.
- RBAC schema generated and stored.
- User roles/permissions activated via RBAC schema.
- Supplier import validated and loaded into inactive supplier pool. (Added: supplier lifecycle states created in DB — inactive, invited, active, suspended — and linked to onboarding logic in Phase 3).
- Audit logger activated for setup events.
- Encryption, retention, and compliance configuration created at org level.

**Developer Triggers:** User/org creation API → RBAC middleware → supplier import parser → audit logger → encryption initializer.

---

## PHASE 2 — PO SETUP & DATA INGESTION

### Journey Steps
1. **Project Manager uploads signed PO** (PDF, Excel, Word or ZIP) containing PO, BOQ, schedule, key milestones and dates, and payment schedule.
2. **System parses and extracts PO data:** PO number, vendor, scope, milestones, dates, payment terms and BOQ items (for each item the data should show quantity, unit of measurement, unit price and value) then these total values should sum up to PO Amount.
3. If BOQ is not included in step 1 above, the system prompts the user to **upload Bill of Quantities (BOQ)** or Excel tracker → system maps to PO lines.
4. If milestone structure is not included in step 1 above, the system prompts the user to **define milestone structure** (e.g., Engineering – Fabrication – Delivery – Site Acceptance).
5. If payment terms are not included in step 1 above, the system prompts the user to **input payment terms and baseline amounts per milestone**.
6. The system prompts the user to **enter required-on-site (ROS) dates**. Users can change the ROS dates at the PO line item or enter the same for the entire PO (should have the option). ROS entry is mandatory for all critical materials; if an unknown user must mark “TBD” and a reminder/validation task is created.
7. The system prompts the user to **validate data against contract values** before publishing PO record. **Contract compliance validator** runs here: checks Incoterms, retention %, currency, payment milestones and flags missing/contradictory values.
8. **User gets a summary** of the extracted data on a review page where they are prompted to review and confirm or submit.
9. **System Finalizes PO record** → stored under active project.
   - In each extraction step, the user should be able to edit the data and correct if anything is missing or incorrect before committing or clicking commit.

### System Actions
- PDF parsing via Textract/LLM extracts structured fields.
- Data validation engine checks consistency between PO and BOQ.
- ROS fields stored and linked to schedule baseline.
- PO + BOQ relationship persisted in database.
- Audit logs and version history generated.
- Contract compliance validator executed and results required to be cleared prior to publish.
- Google maps and currency converter APIs.

**Developer Triggers:** File-upload parser → data-mapping logic → validation API → baseline creation → version control service.

---

## PHASE 3 — SUPPLIER ONBOARDING & PO LINKING

### Journey Steps
1. **Project Manager selects active POs** and assigns them to suppliers (from inactive registry or new) and sends an invitation to the supplier representatives.
2. If supplier is missing in the registry, the Project Manager creates the supplier organization and sends a new invitation.
3. **System generates invitation email** or secure link for each supplier tied to their POs.
4. **Supplier accepts invite** → creates Supplier Portal Account (organization-specific) → creates login credentials → add 2FA → activates supplier account.
5. Supplier gains access **only to their assigned POs** and can view milestone, document, cost details, comments and payment schedule.
6. Supplier inputs key supplier information like industry & services they provide - this will be useful in the database for the client to have a supplier database.
7. Supplier also upload required **Supplier Qualification documents** — e.g., tax ID, insurance, ISO certificates and starts submission and progress update workflow.

### System Actions
- Supplier invite tokens generated and stored.
- Invitation logs captured (status: pending/accepted/expired).
- Supplier account activated upon registration.
- Supplier-PO relationship established in DB.
- Uploaded documents stored with metadata and expiry validation.
- RBAC permissions restricted to supplier scope (full access to view their own POs and upload documents and update workflows).
- Audit log entries for all actions.
- Supplier qualification status recorded and exposed as “Supplier Readiness %” in supplier record.

**Developer Triggers:** Supplier invite API → token validation → user registration handler → document storage → status update event. → email/link sender → RBAC permission map → supplier-project linker.

---

## PHASE 4: DUAL-PATH DATA INGESTION & INTELLIGENT PROGRESS TRACKING

### Journey Steps

#### PATH A: Supplier-Driven Updates (Optimal Path)
1. **Multi-Channel Submission:** Suppliers submit updates via email, portal upload (PDF, Excel, Word, image), or synced Smartsheet/Excel templates.
2. **Automated Parsing & Classification:** AI engine classifies incoming files (progress reports, invoices, CMRs, PLs) using OCR and layout-aware models.
3. **Confidence-Tagged Extraction:** System extracts milestone %, quantities, delivery status, fabrication % with confidence scoring based on document clarity and source quality.

#### PATH B: Internal-Driven Updates (Primary Fallback)
4. **Manual Progress Logging:** Project team logs updates from weekly calls, site visits, or traditional reports using:
   - Quick-entry forms with AI-assisted field suggestions.
   - Bulk Excel template imports for multiple POs.
   - Email forwarding with one-click confirmation of parsed data.

5. **Intelligent Gap Forecasting:**
   - **Trigger Conditions:** No update 7 days after last entry OR within 3 days of next milestone date.
   - **Forecast Logic:** Uses schedule position, historical supplier performance, and material category trends.
   - **Visual Designation:** All predicted values display with ​⚠​ "Forecast" badge and explanation tooltip.

6. **Risk-Based Chase Cadence:**
   - **Low Risk** (>30 days from milestone): Weekly reminders.
   - **Medium Risk** (7-30 days from milestone): Twice weekly reminders.
   - **High Risk** (<7 days from milestone): Daily reminders + auto-created call task for Project Manager.

7. **Supplier Performance Dashboard:**
   - Response rate and accuracy metrics.
   - Portal adoption tracking.
   - Automated flagging for suppliers with >3 missed updates.

8. **Tiered Data Handling:**
   - **High Confidence** (Supplier-reported + document-verified): Auto-advances workflow if variance <10%.
   - **Medium Confidence** (Internal-logged): Requires Project Manager approval for financial milestones >25% completion.
   - **Low Confidence** (AI forecast): Blocked from financial processing; for visibility only.

9. **Unified Conflict Handling:**
   - All discrepancies routed to Project Manager as single point of contact.
   - Project Manager can delegate to specialized roles while maintaining oversight.
   - Side-by-side comparison view with all source data and confidence indicators.

10. **Critical Path-Aware Escalation:**
    - Non-Critical Items: 24h reminder → 48h escalation to Project Manager.
    - Critical Path Items: 4h reminder → 8h escalation to Project Executive.
    - Financial Milestones: Additional escalation to Finance Controller at 12h.

11. **Manual Tagging:** Users manually select a Document Type (e.g., "Invoice," "Packing List," "NCR Report") upon upload. This is crucial training data for future classifier.

12. **Gallery & History:**
    - While updating progress the supplier should be able to update images and videos of the materials in progress.
    - The project manager and his team should be able to download the images.
    - Each PO should have it’s own gallery which can be viewed.
    - Supplier history across projects is consolidated.

### System Actions
- **Dual-Path Ingestion Router:** Merges supplier and internal data with source tagging.
- **Risk-Based Chase Engine:** Dynamically adjusts reminder frequency based on milestone urgency.
- **Confidence-Aware Validator:** Applies different approval workflows based on data reliability.
- **Unified Conflict Queue:** Centralizes all discrepancies with clear delegation paths.
- **Critical Path Integrator:** Links update urgency to project schedule criticality.
- **Supplier Performance Monitor:** Tracks and flags persistent non-compliance.
- **Unified Progress Calculator:** Aggregates all data sources with confidence weighting.

**Developer Triggers:** Email_Listener → Document_Parser → Confidence_Scorer → Risk_Based_Chase_Engine → Unified_Conflict_Detector → Critical_Path_Integrator → Progress_Calculator → Audit_Logger 🡪 Manual tagging.

---

## PHASE 5 — PROGRESS, PAYMENT & CHANGE ORDER TRACKING

### Journey Steps
1. System auto-updates milestone completion % from verified supplier or site inputs.
2. Project Manager validates milestone achievement, triggering system recalculation.
3. Supplier uploads invoice linked to the approved milestone; system cross-checks invoice value vs. approved progress.
4. System logs invoice under “Pending Payment” and auto-calculates financial distribution.
5. Project Manager updates payment status manually once processed externally.
6. **Change Order (CO) event:**
   - Supplier or Project Manager submits CO request.
   - System auto-creates a CO record linked to the original PO.
   - Project Manager reviews and approves.
   - Dashboard automatically reflects new totals.
7. Users add comments after every major action.
8. **Progress Dashboard auto-updates:**
   - % Progress by Supplier
   - Total Committed vs. Paid
   - Pending Invoices by Milestone
   - CO Impact Summary (Cost + Schedule)

### System Actions
- Sync verified progress and CO updates with the PO Milestone Tracker.
- Parse invoice and CO metadata.
- Update Financial Ledger.
- Auto-recalculate budget utilization and forecast cost-to-complete.
- Push all updates to the Dashboard API.
- Maintain Audit Log.
- Escalation rules / reminders for overdue approvals or payments.

**Developer Triggers:** Progress Validator → Invoice Parser → CO Manager → Payment Ledger → Dashboard Updater → Audit Logger 🡪 Escalation Engine.

---

## PHASE 6 — MATERIAL LOGISTICS & DELIVERY TRACKING

### Journey Steps
1. Supplier submits shipment update attaching Packing List (PL) and CMR/Shipping documents.
2. **INFRADYN extracts shipment metadata:** Dispatch date, Carrier, Destination, Expected Arrival (AOS), Tracking identifier.
3. **If a tracking identifier is provided:** System links link to logistics tracking API; updates status automatically; logs live events.
4. **If tracking ID NOT found:** System accepts supplier-provided AOS; validates rules; auto-generates suggested ETA confidence.
5. **Delivery Confirmation & Partial Deliveries:** Site Receiver marks delivery as Received or Partially Delivered.
6. **Invoice Cross-Check:** System cross-references invoice against delivery receipts.
7. **Final Verification:** PM verifies high-impact exceptions.
8. **Optional Evidence Capture:** Upload photos/comments.

### System Actions
- Shipment Parser extracts metadata and tracking IDs.
- Logistics API connector (if tracking ID present).
- Delay Detection (AOS vs ROS).
- Conflict Queue Triggers (ETA mismatch, Qty mismatch).
- PM Notification Rules.
- Auto-Resolve Rules.
- Audit logs.

**Developer Triggers:** Document Parser → Shipment Matcher → Tracking ID Detector → Logistics API Connector / ETA Confidence Engine → Delay Engine → Conflict Engine → Dashboard Updater.

---

## PHASE 7 — QUALITY, NCR & COMMENT MANAGEMENT

### Journey Steps
1. Quality Inspector performs inspection.
2. If defects found, user creates an **NCR (Non-Conformance Report)** (manually or upload).
3. System validates extracted fields and creates NCR record linked to PO.
4. System sends auto-notifications.
5. Threaded comments and corrective actions provided by Supplier/QA/PM.
6. QA/QC verifies corrective action → Closes NCR (material Accepted) or Reopens.
7. Closed NCRs remain visible for traceability.

### System Actions
- OCR + NLP Engine parses uploaded NCR forms.
- Auto-linking Logic.
- Notification Engine.
- Comment System (threaded, role-labeled).
- Milestone Locking Logic.
- Audit Logger.

**Developer Triggers:** NCR creation API → document ingestion handler → notification service → comment thread builder → NCR status handler → SLA engine.

---

## PHASE 8 — DASHBOARDS, REPORTING & DATA EXPORTS

### Journey Steps
1. Project Manager accesses **Intelligent Project Dashboard** (Executive, Action, Deep Dive views).
2. **Dashboard Intelligence Layer** surfaces proactive insights.
3. **AI-Driven Risk Assessment** highlights suppliers, milestones, budget overruns, hotspots.
4. **Interactive Drill-Down & Traceability:** Click any KPI to drill down.
5. **Narrative Intelligence & Auto-Reporting:** AI-written narratives in weekly reports.
6. **Predictive Analytics:** Forecast completion, cashflow, early warnings.
7. **Comment Integration:** Add comments directly from dashboard widgets.

### System Actions
- Real-time Data Aggregation.
- AI Insight Engine.
- Risk Scoring Algorithm.
- Predictive Analytics Module.
- Visualization Engine.
- Automated Report Distribution.
- Anomaly Detection.
- Audit Logger.

**Developer Triggers:** Data_Aggregation_Service → Ai_Insight_Engine → Visualization_Engine → Automated_Reporting_Service.
