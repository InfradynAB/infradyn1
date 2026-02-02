# Phase 8: Dashboards, Reporting & Analytics

Phase 8 is the "Intelligence Layer," aggregating data from all previous phases to provide predictive insights and corporate reporting.

## 1. Data Aggregation Service

To ensure sub-second dashboard performance, Infradyn uses an aggregation strategy.

### Aggregator (`src/lib/services/kpi-engine.ts`):
Scheduled jobs pre-calculate complex metrics and store them in indexed tables or materialized views (depending on DB load).

**Key Metrics Aggregated:**
- **Project Burn Rate**: Monthly spend vs total budget.
- **Supplier Accuracy**: `%` variance between declared and received quantities.
- **NCR Density**: Number of quality issues per 1M USD of order value.

## 2. Risk Scoring Algorithm

The `risk_profile` table stores AI-computed risk scores for suppliers and projects.

### Factors in Risk Score (0-100):
- **Schedule Risk (40%)**: Historical average of ROS breaches.
- **Financial Risk (30%)**: Number of open Change Orders and pending invoices.
- **Quality Risk (30%)**: Ratio of Critical/Major NCRs.

## 3. Cashflow & Schedule Forecasting

Predictive models forecast future events based on current velocity.

### Predictive Formulas:
- **Forecast to Complete (FTC)**: `(Remaining PO Value) + (Projected scope creep based on historical CO frequency)`.
- **AI-Estimated Arrival**: Logistics data + historical customs delay + site receiving velocity.

## 4. Executive Reporting Hub

The `report-engine.ts` generates automated Briefing Packs for stakeholders.

### Formats:
- **Live Dashboard**: Interactive React charts (Victory/Recharts).
- **PDF Export**: Snapshot of project health using Puppeteer or React-PDF.
- **Email Digest**: Weekly summaries sent via Resend (`usage-quota.ts` ensures limits are respected).

---

### UI Implementation: Dashboard Widgets
Dashboard widgets are built using a "Slot-Based" architecture in `src/components/dashboard`. Each widget identifies its required metrics, which are then fetched in parallel via optimized server actions, ensuring the interface remains responsive during data-heavy loads.
