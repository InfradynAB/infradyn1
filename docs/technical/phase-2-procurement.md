# Phase 2: Procurement & BOQ Engine

Phase 2 introduces the primary data ingestion and management engine for Purchase Orders (POs) and Bill of Quantities (BOQs).

## 1. Purchase Order (PO) Lifecycle

POs represent the financial and commitment baseline for all project activities.

### Data Model:
- **`purchaseOrder`**: Header level data (Total Value, Currency, Vendor).
- **`boqItem`**: Granular line items associated with the PO.
- **`milestone`**: Schedule of payments based on progress.

### State Transitions:
- `DRAFT`: Initial creation or AI extraction state.
- `PUBLISHED`: Data verified and shared with the supplier.
- `ACTIVE`: Work is ongoing and progress is being tracked.
- `CLOSED`: All milestones completed and final payments made.

## 2. BOQ Calculations & logic

The BOQ (Bill of Quantities) items are the building blocks of the procurement ledger.

### Core Calculation:
Each item calculates its total price as:
`Total Price = Quantity * Unit Price`

The sum of all BOQ Item `total_price` values must equal the `purchaseOrder.totalValue`.

### Phase 2 "Required-On-Site" (ROS) Logic:
- **`rosDate`**: The mandatory date the material must arrive at the project site.
- **`isCritical`**: Boolean flag identifying items that affect the project's critical path.
- **`rosStatus`**: Tracking if the ROS date has been formally agreed upon.

## 3. Milestone Engine

Milestones determine how the `purchase_order` value is paid out over time.

### Payment Logic:
Milestones are based on a percentage of the total PO value.
`Milestone Amount = (Payment Percentage / 100) * PO Total Value`

### Sequence:
Milestones follow a logical sequence (e.g., Engineering -> Fabrication -> Shipping -> Site Acceptance). This sequence is used for forecasting and delay identification.

## 4. Audit Trail & Versioning

To support corporate compliance, Phase 2 implements immutable versioning for POs.

### `poVersion` Table:
Every time a published PO is modified (e.g., via a Change Order or correction), a new record is created in `poVersion` with:
- A link to the previous state.
- A PDF snapshot of the PO document at that time.
- A description of the change.

---

### Technical Implementation: BOQ Import
The `src/lib/services/excel-importer.ts` service handles bulk BOQ imports. It includes:
1. **Schema Validation**: Ensures all mandatory columns (UOM, Qty, Rate) are present.
2. **DataType Normalization**: Converts various numeric formats from Excel to standard Postgres `numeric` types.
3. **Hierarchy Preservation**: Maintains the relationship between parent items and sub-items if present.
