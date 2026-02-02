# Business Logic & Calculations

This document explains the mathematical formulas and logical rules used throughout the Infradyn platform to ensure financial accuracy and operational efficiency.

## 1. Procurement Financials

### BOQ Item Valuation
Every BOQ (Bill of Quantities) item has its total price strictly calculated as:
`Item Total Price = Quantity * Unit Price`

- **Precision**: Calculations use the Postgres `numeric` type with a scale of 2 to avoid floating-point errors.
- **Validation**: The system refuses to publish a PO if:
  `Σ(Item Total Price) ≠ PO Total Value` (within a ±0.01 tolerance).

### Milestone Payments
Milestones are financial triggers. 
`Milestone Payment = (Payment Percentage / 100) * PO Total Value`

The sum of all `payment_percentage` values for a single PO must equal `100%`.

---

## 2. Supplier Performance Metrics (Phase 3+)

### Readiness Score
The Readiness Score determines if a supplier is "Project Ready".

| Item | Weight | Logic |
| :--- | :--- | :--- |
| **Profile** | 20% | Binary (Present/Absent). |
| **Mandatory Docs** | 50% | `(Approved Mandatory Docs / Total Required Mandatory Docs) * 50` |
| **Bank Verification** | 30% | Manual verification flag by PM. |

`Total Score = Profile + Mandatory Docs + Bank Verification`

---

## 3. Currency Normalization

Infradyn allows multi-currency operations but normalizes reporting to a "Project Base Currency" (e.g., USD).

### Formula:
`Reporting Value = Active PO Value * Conversion Rate`

- **Source**: Conversion rates are fetched via API at the time of **PO Publication** and stored as a snapshot to prevent retrospective financial fluctuations. 
- **Historical Tracking**: For analytics, the system uses the conversion rate timestamped at the date of the specific financial event (invoice date, completion date).

---

## 4. Required-On-Site (ROS) Buffer Calculation

The system flagging engine uses a buffer logic to identify risks.

`Risk Level = Expected Delivery Date - ROS Date`

- **Critical Risk**: `Risk Level > 0` (Delivery is after ROS).
- **Potential Risk**: `Risk Level` is within 3 days of ROS.
- **Safe**: `Risk Level < -3 days`.
