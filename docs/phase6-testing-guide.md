# Phase 6 Manual Verification Guide

This guide provides steps to manually verify the Phase 6 (Material Logistics & Delivery Tracking) features in the Infradyn application.

## Prerequisites
- [ ] Dev server running (`pnpm dev`)
- [ ] AfterShip API key in `.env.local`
- [ ] Resend API key in `.env.local` (for digests)
- [ ] Database seeded with at least one PO and BOQ items

---

## 1. Shipment Tracking (Supplier Portal)

### 1.1 Submit Shipment
1. Navigate to a PO as a Supplier.
2. Click **Submit New Shipment**.
3. Select a carrier (e.g., FedEx, DHL) and enter a valid tracking number (or use AfterShip test numbers: `1234567890` for `fedex`).
4. Enter declared quantities for BOQ items.
5. Click **Confirm Shipment**.
6. **Verify**:
   - Shipment appears in the portal.
   - Initial status is `DISPATCHED`.
   - Timeline shows "Shipment created".

### 1.2 AfterShip Sync
1. Click **Sync Now** on the shipment card.
2. **Verify**:
   - Status updates from AfterShip (if tracking number is valid).
   - Timeline shows tracking events.
   - ETA updates if available.

---

## 2. Delivery Confirmation (Site Receiver)

### 2.1 Confirm Delivery
1. Navigate to the shipment as a Site Receiver.
2. Click **Confirm Delivery**.
3. Enter received quantities.
4. Mark items as `GOOD`, `DAMAGED`, or `MISSING`.
5. Click **Submit Confirmation**.
6. **Verify**:
   - Shipment status becomes `DELIVERED` or `PARTIALLY_DELIVERED`.
   - Delivery receipt is generated.
   - BOQ item's "Delivered Qty" updates.
   - PO progress percentage updates.

---

## 3. PM Dashboard (Project Manager)

### 3.1 Review Conflicts
1. Navigate to **Logistics Dashboard** -> **Conflicts**.
2. **Verify**:
   - Check if delayed shipments appear as `DATE_VARIANCE` conflicts.
   - Check if quantity mismatches appear as `QUANTITY_MISMATCH` conflicts.
   - Test "Resolve" functionality.

### 3.2 QA Tasks
1. Navigate to **Logistics Dashboard** -> **QA Inspections**.
2. **Verify**:
   - Inspect pending tasks auto-created from deliveries.
   - Update inspection status to `PASSED` or `FAILED`.

---

## 4. Background Jobs & Admin

### 4.1 Configuration
1. Navigate to **Admin Settings** -> **Logistics Config**.
2. **Verify**:
   - Change "Delay Tolerance" and save.
   - Change "Quantity Variance" and save.
   - Verify values persist in database (`system_config` table).

### 4.2 Cron Endpoints
1. Trigger the logistics poller:
   ```bash
   curl "http://localhost:3000/api/cron/logistics-poll" -H "Authorization: Bearer <CRON_SECRET>"
   ```
2. Trigger the conflict digest:
   ```bash
   curl "http://localhost:3000/api/cron/conflict-digest" -H "Authorization: Bearer <CRON_SECRET>"
   ```
3. **Verify**:
   - Check logs for "Shipments synced" or "Emails sent".
