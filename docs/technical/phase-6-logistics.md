# Phase 6: Material Logistics & Delivery Tracking

Phase 6 connects the physical world to the digital ledger by integrating with global logistics carriers and field receiving workflows.

## 1. Global Carrier Integrations

Infradyn communicates directly with major logistics APIs to track shipments.

### Connectors:
- **MAERSK (`maersk-api-connector.ts`)**: USES DCSA (Digital Container Shipping Association) standards for container-level events (`VESSEL_DEPARTURE`, `DISCHARGE`).
- **DHL (`dhl-api-connector.ts`)**: Tracks waybill identifiers for express and freight shipments.
- **Generic Poller**: A scheduled job that updates tracking states every 4 hours.

## 2. Shipment Lifecycle

A shipment goes through several states in the `shipment` table:
`PENDING` -> `DISPATCHED` -> `IN_TRANSIT` -> `DELIVERED` -> `RECEIVED` (Site Confirmation).

### ETA Confidence Scoring:
- **HIGH**: API-provided tracking is active and vessel/plane is on schedule.
- **MEDIUM**: No active API tracking; based on supplier-provided estimated dates.
- **LOW**: Stale tracking data or reported "Exception" from carrier.

## 3. Site Receiving Workflow

Site personnel use a mobile-first interface to confirm deliveries.

### `delivery_receipt` Logic:
1. **Verification**: Receiver scans or enters the Shipping Note Number.
2. **Quantity Mapping**: Receiver inputs received quantities against the original Packing List.
3. **Variance Detection**: If `received_qty < declared_qty`, a discrepancy flag is raised.
4. **Condition Logging**: Photos of damaged goods or open seals are required for "Damaged" status.

## 4. Automated QA Triggers

Upon successful site receiving (`DELIVERED` status), the system automatically generates inspection tasks.
- **`qa_inspection_task`**: Assigned to the Quality Engineer for the project.
- **SLA**: Must be completed within 24 hours of receipt.

---

### Technical Implementation: Logistics API Polling
The `Logistics Poller` job iterates through all active `shipments` with a `tracking_number`. It uses a strategy pattern to select the correct connector (Maersk/DHL/Generic) and updates the `shipment_event` stream.
