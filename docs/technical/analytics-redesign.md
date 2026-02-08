# Analytics & Dashboard Redesign Specification

**Version:** 1.0  
**Date:** February 2026  
**Status:** Planning Phase

---

## 1. Overview

This document outlines the complete redesign of the Infradyn analytics and dashboard system. The new system will provide role-specific views with actionable insights, predictive analytics, and comprehensive visualizations.

### Design Principles

1. **Role-Based Views** - Each user role gets a tailored dashboard
2. **Action-Oriented** - Every metric should drive a decision
3. **Real-Time Data** - Live updates where possible
4. **AI-Enhanced** - Predictive analytics and risk scoring
5. **Mobile-Responsive** - All dashboards work on tablets/mobile

---

## 2. Dashboard Architecture

### 2.1 Dashboard Hierarchy

```
├── Executive Dashboard (SUPER_ADMIN, ADMIN)
│   ├── Portfolio Overview
│   ├── Risk Heatmaps
│   └── Financial Summary
│
├── Project Manager Dashboard (PM)
│   ├── Material Availability
│   ├── Delivery Tracking
│   ├── NCR Management
│   └── Cost Exposure
│
├── Supplier Dashboard (SUPPLIER)
│   ├── PO Status
│   ├── Delivery Timeline
│   ├── Invoice Cycle
│   └── Compliance Status
│
├── PO Detail Dashboard (All Roles)
│   ├── PO Progress
│   ├── BOQ Breakdown
│   ├── Delivery Status
│   └── Financial Flow
│
└── Deep Dive Analytics (All Roles)
    ├── Supplier Scorecards
    ├── Quality & NCR Analytics
    ├── Logistics Timelines
    └── Cost & Payment Dashboards
```

---

## 3. Executive Dashboard

### 3.1 Target Users
- `SUPER_ADMIN`
- `ADMIN`

### 3.2 KPIs (Key Performance Indicators)

| # | KPI Name | Description | Data Source |
|---|----------|-------------|-------------|
| 1 | Total Portfolio Value | Sum of all active PO values | `purchase_order.totalValue` |
| 2 | Projects At Risk | Count of projects with risk score > 70% | Calculated |
| 3 | Overall Procurement Health | AI-calculated health score | AI Engine |
| 4 | Pending Approvals | Count of items awaiting approval | Multiple tables |
| 5 | Active Suppliers | Count of suppliers with active POs | `supplier` |
| 6 | Open NCRs (Critical) | Count of critical severity NCRs | `ncr.severity = CRITICAL` |
| 7 | Overdue Deliveries | Count of deliveries past due date | `shipment` |
| 8 | Payment Pipeline | Total value pending payment | `invoice` |

### 3.3 Visualizations

#### 3.3.1 Portfolio Overview
- **Type:** Donut Chart
- **Purpose:** Shows % distribution of spend across projects
- **Data Points:**
  - Project name
  - Total PO value per project
  - Percentage of portfolio
- **Colors:** Use project-specific color palette
- **Interaction:** Click to drill down to project

```typescript
// Data structure
interface PortfolioData {
  projectId: string;
  projectName: string;
  totalValue: number;
  percentage: number;
  color: string;
}
```

#### 3.3.2 Procurement Health Score
- **Type:** AI Gauge Meter
- **Purpose:** Overall system health indicator
- **Zones:**
  - 🟢 Green: 80-100% (Healthy)
  - 🟡 Amber: 50-79% (Attention Required)
  - 🔴 Red: 0-49% (Critical)
- **Factors Contributing to Score:**
  - On-time delivery rate (25%)
  - NCR resolution rate (20%)
  - Supplier compliance (20%)
  - Payment cycle efficiency (15%)
  - Document completeness (10%)
  - Risk mitigation (10%)

```typescript
interface HealthScore {
  overallScore: number;
  zone: 'green' | 'amber' | 'red';
  factors: {
    name: string;
    score: number;
    weight: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  lastUpdated: Date;
}
```

#### 3.3.3 Project Delivery Performance
- **Type:** Horizontal Bar Chart
- **Purpose:** Compare delivery progress across projects
- **Y-Axis:** Project names
- **X-Axis:** Progress percentage (0-100%)
- **Color Coding:**
  - Green bar: Delivered
  - Blue bar: In-transit
  - Gray bar: Pending
- **Sort:** By progress % descending

#### 3.3.4 Risk Heatmap
- **Type:** Matrix Chart
- **Purpose:** Identify high-risk supplier/project combinations
- **X-Axis:** Supplier Risk Level (Low → Medium → High)
- **Y-Axis:** Project Impact (Low → Medium → High → Critical)
- **Cell Color:** Intensity based on risk score
- **Cell Content:** Count of POs in that risk category

```typescript
interface RiskHeatmapCell {
  supplierRisk: 'low' | 'medium' | 'high';
  projectImpact: 'low' | 'medium' | 'high' | 'critical';
  poCount: number;
  totalValue: number;
  riskScore: number;
}
```

#### 3.3.5 Approvals Queue
- **Type:** Table with Status Tags
- **Columns:**
  - Item Type (PO, Invoice, NCR, Milestone)
  - Reference Number
  - Requester
  - Value
  - Days Pending
  - Priority (High/Medium/Low)
  - Action Button
- **Sorting:** By priority, then by days pending
- **Pagination:** 10 items per page

#### 3.3.6 Supplier Performance Trend
- **Type:** Line Chart
- **Purpose:** Track supplier performance over time
- **X-Axis:** Time (months)
- **Y-Axis:** Performance score (0-100)
- **Lines:** Top 5 suppliers by PO value
- **Tooltip:** Show detailed metrics on hover

#### 3.3.7 Compliance Alerts
- **Type:** Card List
- **Categories:**
  - ⚠️ Expiring Documents (within 30 days)
  - 🕐 Delayed POs (past expected delivery)
  - 🚨 Excessive NCRs (suppliers with >3 open NCRs)
- **Card Content:**
  - Alert type icon
  - Description
  - Affected entity
  - Days remaining/overdue
  - Quick action button

---

## 4. Supplier Dashboard

### 4.1 Target Users
- `SUPPLIER` role users

### 4.2 KPIs

| # | KPI Name | Description | Calculation |
|---|----------|-------------|-------------|
| 1 | Total Active POs | Count of POs in active status | `WHERE status NOT IN ('DRAFT', 'CLOSED', 'CANCELLED')` |
| 2 | Pending Deliveries | Shipments not yet delivered | `shipment.status != 'DELIVERED'` |
| 3 | Invoices Pending Approval | Invoices awaiting PM approval | `invoice.status = 'SUBMITTED'` |
| 4 | NCRs Assigned | Open NCRs for this supplier | `ncr.status != 'CLOSED' AND supplierId = ?` |
| 5 | On-Time Delivery Score | % of deliveries on/before due date | `(onTimeCount / totalCount) * 100` |
| 6 | Average Payment Cycle | Days from invoice to payment | `AVG(paidDate - submittedDate)` |
| 7 | Upcoming Deliveries This Week | Deliveries due in next 7 days | `expectedDate BETWEEN NOW AND NOW + 7 days` |
| 8 | Document Compliance Score | % of required docs uploaded & valid | `(validDocs / requiredDocs) * 100` |
| 9 | Milestones Pending Client Approval | Milestones submitted but not approved | `milestone.status = 'SUBMITTED'` |
| 10 | Total Payments Received (Period) | Sum of payments in selected period | `SUM(ledger.amount) WHERE type = 'PAYMENT'` |

### 4.3 Visualizations

#### 4.3.1 PO Status Overview
- **Type:** Radial Progress Chart
- **Segments:**
  - ✅ Delivered (Green)
  - 🔄 Pending (Blue)
  - ⚠️ Overdue (Red)
- **Center:** Total PO count
- **Animation:** Progress fills on load

```typescript
interface POStatusData {
  delivered: { count: number; value: number };
  pending: { count: number; value: number };
  overdue: { count: number; value: number };
  total: { count: number; value: number };
}
```

#### 4.3.2 Delivery Timeline
- **Type:** Gantt-Style Strip Chart
- **Stages:** Shipment → Transit → Delivered → Inspected
- **Rows:** Individual shipments
- **Color:** Based on status (on-time: green, delayed: red)
- **Tooltip:** Detailed shipment info
- **Interaction:** Click to view shipment details

```typescript
interface DeliveryTimelineItem {
  shipmentId: string;
  poNumber: string;
  stages: {
    name: 'shipment' | 'transit' | 'delivered' | 'inspected';
    startDate: Date | null;
    endDate: Date | null;
    status: 'completed' | 'in-progress' | 'pending' | 'delayed';
  }[];
}
```

#### 4.3.3 Invoice Cycle Analytics
- **Type:** Line Graph
- **Purpose:** Show invoice processing timelines
- **X-Axis:** Invoice submission date
- **Y-Axis:** Days to approval
- **Reference Line:** Target approval days (e.g., 14 days)
- **Data Points:** Individual invoices

#### 4.3.4 Compliance Meter
- **Type:** Gauge Chart
- **Purpose:** Supplier's document compliance score
- **Zones:**
  - 🟢 90-100%: Fully Compliant
  - 🟡 70-89%: Attention Needed
  - 🔴 0-69%: Non-Compliant
- **Needle:** Current score
- **Below Gauge:** List of missing/expiring documents

#### 4.3.5 NCR Summary
- **Type:** Stacked Bar Chart
- **Bars:** One per month (last 6 months)
- **Segments:**
  - ✅ Accepted (Green)
  - ❌ Rejected (Red)
  - ⏳ Awaiting Action (Yellow)
- **Tooltip:** Detailed breakdown on hover

#### 4.3.6 Document Status
- **Type:** Grid View (Card Grid)
- **Categories:**
  - 📄 Uploaded & Valid (Green border)
  - ⏰ Expiring Soon (Yellow border)
  - ❌ Missing (Red border)
- **Card Content:**
  - Document type
  - Expiry date (if applicable)
  - Upload date
  - Action button (Upload/Renew)

---

## 5. Project Manager Dashboard

### 5.1 Target Users
- `PM` role users
- `QA` role users (read-only)

### 5.2 KPIs

| # | KPI Name | Description | Calculation |
|---|----------|-------------|-------------|
| 1 | Material Availability Index (%) | % of materials available vs required | `(availableQty / requiredQty) * 100` |
| 2 | Deliveries Due This Week | Count of upcoming deliveries | `expectedDate BETWEEN NOW AND NOW + 7 days` |
| 3 | Overdue Deliveries | Count of delayed shipments | `expectedDate < NOW AND status != 'DELIVERED'` |
| 4 | NCRs Open / Closed | Counts of NCRs by status | `COUNT(*) GROUP BY status` |
| 5 | Supplier Reliability Score | Weighted avg of supplier metrics | AI Calculated |
| 6 | Forecasted Delays (AI %) | AI prediction of delay probability | AI Engine |
| 7 | Milestones Approved / Pending | Milestone status counts | `COUNT(*) GROUP BY status` |
| 8 | COs in Progress | Active change orders | `change_order.status = 'IN_PROGRESS'` |
| 9 | QA Inspection Success Rate (%) | % inspections passed | `(passedCount / totalCount) * 100` |
| 10 | Cost Exposure (Risk-adjusted) | Potential financial risk | `SUM(atRiskValue * riskProbability)` |

### 5.3 Visualizations

#### 5.3.1 Deliveries Status - Traffic Light Chart
- **Type:** Traffic Light / Stoplight Chart
- **Purpose:** Quick status overview
- **Lights:**
  - 🟢 Green: On Time (delivered or on schedule)
  - 🟡 Amber: At Risk (1-7 days delay predicted)
  - 🔴 Red: Delayed (>7 days or confirmed delay)
- **Display:** Count in each category
- **Interaction:** Click to filter delivery list

```typescript
interface TrafficLightData {
  green: { count: number; label: string; items: string[] };
  amber: { count: number; label: string; items: string[] };
  red: { count: number; label: string; items: string[] };
}
```

#### 5.3.2 Milestone Progress
- **Type:** Horizontal Progress Bars
- **Rows:** One per milestone
- **Bar:** Shows % complete
- **Color:** Based on status vs due date
- **Labels:** Milestone name, due date, value

#### 5.3.3 Risk Prediction - AI Heatmap
- **Type:** Heatmap Matrix
- **X-Axis:** Suppliers
- **Y-Axis:** Materials/BOQ Items
- **Cell Color:** Risk intensity (Green → Yellow → Red)
- **Cell Value:** Risk percentage
- **Tooltip:** Risk factors breakdown

```typescript
interface RiskPredictionCell {
  supplierId: string;
  supplierName: string;
  materialId: string;
  materialName: string;
  riskScore: number; // 0-100
  riskFactors: {
    factor: string;
    contribution: number;
  }[];
  prediction: string;
}
```

#### 5.3.4 Inspections Overview
- **Type:** Calendar View
- **Purpose:** Schedule visualization
- **Display:** Month view with inspection markers
- **Color Coding:**
  - Blue: Scheduled
  - Green: Passed
  - Red: Failed
  - Gray: Pending
- **Interaction:** Click date for details

#### 5.3.5 NCR Trend
- **Type:** Line Chart
- **Purpose:** Month-by-month NCR trend
- **X-Axis:** Months (last 12)
- **Y-Axis:** NCR count
- **Lines:**
  - Total Opened
  - Total Closed
  - Critical NCRs
- **Trend Line:** Moving average

#### 5.3.6 Cost Exposure Waterfall Chart
- **Type:** Waterfall Chart
- **Purpose:** Show budget flow and risk exposure
- **Bars:**
  1. Original Budget (starting point)
  2. + Approved Change Orders
  3. - Completed Payments
  4. = Committed Value
  5. + At-Risk Value (potential overruns)
  6. = Total Exposure
- **Colors:** Green (positive), Red (negative), Blue (totals)

```typescript
interface WaterfallData {
  categories: {
    name: string;
    value: number;
    type: 'start' | 'increase' | 'decrease' | 'total';
    breakdown?: { item: string; value: number }[];
  }[];
}
```

#### 5.3.7 Budget Utilization Display
- **Type:** Progress Bar with Labels
- **Purpose:** Show how much budget has been used
- **Segments:**
  - Paid (Dark Green)
  - Committed/Invoiced (Light Green)
  - Remaining (Gray)
- **Labels:** Amounts and percentages

---

## 6. PO Detail Dashboard

### 6.1 Target Users
- All roles (with role-based data filtering)

### 6.2 KPIs

| # | KPI Name | Description | Calculation |
|---|----------|-------------|-------------|
| 1 | PO Progress (%) | Overall completion | `(deliveredValue / totalValue) * 100` |
| 2 | Delivered vs Pending Value | Financial split | `SUM(delivered), SUM(pending)` |
| 3 | Pending Milestones | Incomplete milestones | `COUNT WHERE status != 'COMPLETED'` |
| 4 | Upcoming Deliveries | Next 30 days | `expectedDate BETWEEN NOW AND NOW + 30` |
| 5 | Invoice Status | Invoiced amount vs paid | `SUM(invoiced), SUM(paid)` |
| 6 | Linked NCRs | NCR count for this PO | `COUNT WHERE poId = ?` |
| 7 | Linked COs | Change orders count | `COUNT WHERE poId = ?` |
| 8 | Delivery Delay Risk (%) | AI delay prediction | AI Engine |
| 9 | Inspection Success Rate | % QA passed | `(passed / total) * 100` |
| 10 | Supplier Reliability Score | Supplier's overall score | Calculated |

### 6.3 Visualizations

#### 6.3.1 PO Progress
- **Type:** Circular Progress Chart (Donut)
- **Center:** Percentage complete
- **Ring:** Progress arc
- **Color:** Gradient based on progress
- **Below:** Key metrics summary

#### 6.3.2 BOQ Breakdown
- **Type:** Table with Inline Mini-bars
- **Columns:**
  - Item Number
  - Description
  - Ordered Qty
  - Delivered Qty (with mini progress bar)
  - Installed Qty (with mini progress bar)
  - Unit Price
  - Total Value
  - Status badge
- **Features:**
  - Sortable columns
  - Search/filter
  - Expandable rows for line item details

```typescript
interface BOQTableRow {
  itemNumber: string;
  description: string;
  orderedQty: number;
  deliveredQty: number;
  deliveredPercent: number;
  installedQty: number;
  installedPercent: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  status: 'pending' | 'partial' | 'complete' | 'overdue';
}
```

#### 6.3.3 Delivery Status Timeline
- **Type:** Timeline Visualization
- **Purpose:** Visual delivery journey
- **Nodes:** Key delivery events
- **Connections:** Time-based lines
- **Status Colors:** Per node status
- **Branching:** For split deliveries

#### 6.3.4 NCR Status
- **Type:** Stacked Bars
- **Purpose:** NCR breakdown by severity & status
- **X-Axis:** Severity (Minor, Major, Critical)
- **Stacks:** Open, In-Progress, Closed
- **Interaction:** Click to filter NCR list

#### 6.3.5 Invoice Flow
- **Type:** Sankey Diagram
- **Purpose:** Visualize money flow
- **Flow:** PO Value → Delivered → Invoiced → Approved → Paid
- **Width:** Proportional to value
- **Colors:** Different for each stage
- **Hover:** Show amounts

```typescript
interface SankeyNode {
  id: string;
  label: string;
  value: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}
```

#### 6.3.6 CO Ripple Impact
- **Type:** Spider/Radar Chart
- **Purpose:** Show change order impact across dimensions
- **Axes:**
  - Cost Impact (%)
  - Time Impact (days)
  - Scope Impact (%)
  - Risk Impact (score)
  - Quality Impact (score)
- **Overlays:** Before CO vs After CO

---

## 7. Deep Dive Analytics Pages

### 7.1 Supplier Scorecards

#### Page: `/dashboard/analytics/suppliers`

**Components:**
1. Supplier Ranking Table
   - Sortable by any metric
   - Filters by project, status
   
2. Individual Scorecard (expandable/modal)
   - Overall Score (0-100)
   - Category Scores:
     - Delivery Performance
     - Quality (NCR Rate)
     - Compliance
     - Communication
     - Pricing Competitiveness

3. Comparison View
   - Select 2-3 suppliers
   - Side-by-side metrics

### 7.2 Quality & NCR Analytics

#### Page: `/dashboard/analytics/quality`

**Components:**
1. NCR Trends Dashboard
   - Volume over time
   - By severity
   - By issue type
   - By supplier

2. Root Cause Analysis
   - Pareto chart of issue types
   - Recurring issues identification

3. Resolution Metrics
   - Average resolution time
   - Escalation rate
   - Cost of quality

### 7.3 Logistics Timelines

#### Page: `/dashboard/analytics/logistics`

**Components:**
1. Fleet Overview
   - All active shipments map
   - Status summary

2. Carrier Performance
   - On-time rate by carrier
   - Transit time analysis

3. Route Analysis
   - Common routes performance
   - Bottleneck identification

### 7.4 Cost & Payment Dashboards

#### Page: `/dashboard/analytics/finance`

**Components:**
1. Cash Flow Projection
   - Upcoming payments
   - Invoice aging

2. Budget Variance Analysis
   - Planned vs Actual
   - By category

3. Payment Cycle Analysis
   - Average payment time
   - By supplier
   - By project

---

## 8. Technical Implementation

### 8.1 Data Layer

#### New Database Tables/Views

```sql
-- Materialized view for dashboard metrics (refresh every 15 min)
CREATE MATERIALIZED VIEW dashboard_metrics AS
SELECT 
  organization_id,
  project_id,
  -- KPI calculations here
  ...

-- Risk scoring table (AI-updated)
CREATE TABLE risk_scores (
  id UUID PRIMARY KEY,
  entity_type VARCHAR(50), -- 'SUPPLIER', 'PO', 'SHIPMENT'
  entity_id UUID,
  risk_score DECIMAL(5,2),
  risk_factors JSONB,
  calculated_at TIMESTAMP,
  model_version VARCHAR(20)
);

-- Dashboard cache table
CREATE TABLE dashboard_cache (
  id UUID PRIMARY KEY,
  user_id TEXT,
  dashboard_type VARCHAR(50),
  cache_key VARCHAR(255),
  data JSONB,
  expires_at TIMESTAMP
);
```

### 8.2 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dashboard/executive` | GET | Executive dashboard data |
| `/api/dashboard/supplier` | GET | Supplier dashboard data |
| `/api/dashboard/pm` | GET | PM dashboard data |
| `/api/dashboard/po/[id]` | GET | PO detail dashboard |
| `/api/analytics/suppliers` | GET | Supplier analytics |
| `/api/analytics/quality` | GET | Quality metrics |
| `/api/analytics/logistics` | GET | Logistics data |
| `/api/analytics/finance` | GET | Financial analytics |
| `/api/risk/calculate` | POST | Trigger risk calculation |

### 8.3 Component Library

New Recharts-based components needed:

```
src/components/charts/
├── DonutChart.tsx
├── GaugeMeter.tsx
├── HorizontalBarChart.tsx
├── RiskHeatmap.tsx
├── TrafficLight.tsx
├── GanttStrip.tsx
├── WaterfallChart.tsx
├── SankeyDiagram.tsx
├── SpiderChart.tsx
├── CalendarHeatmap.tsx
└── TimelineChart.tsx
```

### 8.4 State Management

Use React Query for dashboard data:

```typescript
// Example hook
export function useExecutiveDashboard(orgId: string) {
  return useQuery({
    queryKey: ['dashboard', 'executive', orgId],
    queryFn: () => fetchExecutiveDashboard(orgId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}
```

### 8.5 Real-time Updates

WebSocket events for live updates:

```typescript
// Events to subscribe
const DASHBOARD_EVENTS = [
  'po.status_changed',
  'delivery.status_changed',
  'ncr.created',
  'ncr.status_changed',
  'invoice.submitted',
  'invoice.approved',
  'milestone.completed',
];
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create chart component library
- [ ] Set up dashboard API endpoints
- [ ] Implement data aggregation queries
- [ ] Create dashboard layout templates

### Phase 2: Executive Dashboard (Week 3)
- [ ] Portfolio Overview donut chart
- [ ] Procurement Health gauge
- [ ] Project Delivery horizontal bars
- [ ] Risk Heatmap matrix
- [ ] Approvals queue table

### Phase 3: Supplier Dashboard (Week 4)
- [ ] PO Status radial chart
- [ ] Delivery Timeline gantt
- [ ] Invoice Cycle line graph
- [ ] Compliance Meter gauge
- [ ] NCR Summary stacked bars

### Phase 4: PM Dashboard (Week 5)
- [ ] Traffic Light deliveries
- [ ] Milestone progress bars
- [ ] AI Risk Heatmap
- [ ] Inspections Calendar
- [ ] NCR Trend line chart
- [ ] Cost Waterfall chart

### Phase 5: PO Dashboard (Week 6)
- [ ] PO Progress circle
- [ ] BOQ Table with mini-bars
- [ ] Delivery Timeline
- [ ] NCR Stacked bars
- [ ] Invoice Flow Sankey
- [ ] CO Spider chart

### Phase 6: Deep Dive Analytics (Week 7-8)
- [ ] Supplier Scorecards
- [ ] Quality & NCR Analytics
- [ ] Logistics Timelines
- [ ] Cost & Payment Dashboards

### Phase 7: Polish & Optimization (Week 9)
- [ ] Performance optimization
- [ ] Caching implementation
- [ ] Real-time updates
- [ ] Mobile responsiveness
- [ ] User testing & feedback

---

## 10. File Structure

```
src/
├── app/
│   └── dashboard/
│       ├── page.tsx                    # Main dashboard (role-based redirect)
│       ├── executive/
│       │   └── page.tsx                # Executive dashboard
│       ├── supplier/
│       │   └── page.tsx                # Supplier dashboard
│       ├── procurement/
│       │   ├── page.tsx                # PM dashboard
│       │   └── [poId]/
│       │       └── page.tsx            # PO detail dashboard
│       └── analytics/
│           ├── suppliers/
│           │   └── page.tsx
│           ├── quality/
│           │   └── page.tsx
│           ├── logistics/
│           │   └── page.tsx
│           └── finance/
│               └── page.tsx
│
├── components/
│   ├── dashboard/
│   │   ├── executive/
│   │   │   ├── PortfolioDonut.tsx
│   │   │   ├── HealthGauge.tsx
│   │   │   ├── ProjectBars.tsx
│   │   │   ├── RiskHeatmap.tsx
│   │   │   ├── ApprovalsQueue.tsx
│   │   │   ├── SupplierTrend.tsx
│   │   │   └── ComplianceAlerts.tsx
│   │   ├── supplier/
│   │   │   ├── POStatusRadial.tsx
│   │   │   ├── DeliveryGantt.tsx
│   │   │   ├── InvoiceCycleLine.tsx
│   │   │   ├── ComplianceGauge.tsx
│   │   │   ├── NCRStackedBars.tsx
│   │   │   └── DocumentGrid.tsx
│   │   ├── pm/
│   │   │   ├── TrafficLightStatus.tsx
│   │   │   ├── MilestoneProgress.tsx
│   │   │   ├── AIRiskHeatmap.tsx
│   │   │   ├── InspectionCalendar.tsx
│   │   │   ├── NCRTrendLine.tsx
│   │   │   ├── CostWaterfall.tsx
│   │   │   └── BudgetUtilization.tsx
│   │   └── po/
│   │       ├── POProgressCircle.tsx
│   │       ├── BOQTable.tsx
│   │       ├── DeliveryTimeline.tsx
│   │       ├── NCRStatusBars.tsx
│   │       ├── InvoiceSankey.tsx
│   │       └── CORippleSpider.tsx
│   └── charts/
│       ├── base/
│       │   └── ChartContainer.tsx
│       ├── DonutChart.tsx
│       ├── GaugeMeter.tsx
│       ├── HorizontalBarChart.tsx
│       ├── HeatmapMatrix.tsx
│       ├── TrafficLight.tsx
│       ├── GanttStrip.tsx
│       ├── WaterfallChart.tsx
│       ├── SankeyDiagram.tsx
│       ├── SpiderChart.tsx
│       └── CalendarView.tsx
│
├── lib/
│   ├── actions/
│   │   └── analytics/
│   │       ├── executive-dashboard.ts
│   │       ├── supplier-dashboard.ts
│   │       ├── pm-dashboard.ts
│   │       ├── po-dashboard.ts
│   │       └── risk-engine.ts
│   └── services/
│       └── analytics/
│           ├── kpi-calculator.ts
│           ├── risk-scorer.ts
│           └── trend-analyzer.ts
│
└── hooks/
    └── dashboard/
        ├── useExecutiveDashboard.ts
        ├── useSupplierDashboard.ts
        ├── usePMDashboard.ts
        └── usePODashboard.ts
```

---

## 11. Testing Checklist

### Unit Tests
- [ ] KPI calculation functions
- [ ] Data transformation utilities
- [ ] Chart component rendering

### Integration Tests
- [ ] Dashboard API endpoints
- [ ] Role-based access control
- [ ] Real-time update flow

### E2E Tests
- [ ] Executive dashboard loads with data
- [ ] Supplier sees only their data
- [ ] PM dashboard filtering works
- [ ] PO drill-down navigation
- [ ] Chart interactions (tooltips, clicks)

### Performance Tests
- [ ] Dashboard load time < 2 seconds
- [ ] Chart rendering < 500ms
- [ ] API response time < 1 second

---

## 12. Dependencies

### New NPM Packages (if needed)

```json
{
  "dependencies": {
    "recharts": "^2.15.4",           // Already installed
    "d3-sankey": "^0.12.3",          // For Sankey diagrams
    "react-calendar-heatmap": "^1.9.0" // For calendar views
  }
}
```

---

## 13. References

- [Recharts Documentation](https://recharts.org/)
- [D3 Sankey](https://github.com/d3/d3-sankey)
- [Shadcn Charts](https://ui.shadcn.com/charts)
- [Dashboard Design Best Practices](https://www.nngroup.com/articles/dashboard-design/)

---

## Appendix A: Color Palette

```css
/* Status Colors */
--color-success: #22C55E;     /* Green - On time, Passed */
--color-warning: #F59E0B;     /* Amber - At risk, Attention */
--color-danger: #EF4444;      /* Red - Delayed, Failed */
--color-info: #3B82F6;        /* Blue - In progress */
--color-muted: #6B7280;       /* Gray - Pending, Neutral */

/* Chart Colors */
--chart-primary: #6366F1;     /* Indigo */
--chart-secondary: #8B5CF6;   /* Purple */
--chart-tertiary: #EC4899;    /* Pink */
--chart-quaternary: #14B8A6;  /* Teal */
--chart-quinary: #F97316;     /* Orange */
```

---

## Appendix B: KPI Formulas

### Procurement Health Score
```
Health = (OTD × 0.25) + (NCR_Res × 0.20) + (Compliance × 0.20) + 
         (Payment_Eff × 0.15) + (Doc_Complete × 0.10) + (Risk_Mit × 0.10)

Where:
- OTD = (On-time deliveries / Total deliveries) × 100
- NCR_Res = (Closed NCRs / Total NCRs) × 100
- Compliance = (Compliant suppliers / Total suppliers) × 100
- Payment_Eff = MAX(0, 100 - (Avg_payment_days - Target_days))
- Doc_Complete = (Valid documents / Required documents) × 100
- Risk_Mit = 100 - Average_risk_score
```

### Supplier Reliability Score
```
Reliability = (OTD × 0.35) + (Quality × 0.30) + (Compliance × 0.20) + (Comm × 0.15)

Where:
- OTD = On-time delivery rate
- Quality = 100 - (NCR count / Total deliveries × 10)
- Compliance = Document compliance score
- Comm = Response time score
```

### Delivery Delay Risk (AI)
```
Risk = f(historical_data, supplier_score, logistics_status, external_factors)

Factors:
- Supplier's historical OTD rate
- Current shipment status
- Weather/port congestion data
- Distance to destination
- Material criticality
```
