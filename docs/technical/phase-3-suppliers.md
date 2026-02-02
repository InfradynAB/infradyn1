# Phase 3: Supplier Ecosystem

Phase 3 extends the platform to external stakeholders, allowing suppliers to view theirPOs, update progress, and manage compliance documentation.

## 1. Supplier Onboarding Workflow

The onboarding process is designed to be frictionless yet secure.

### Step-by-Step:
1. **Initial Registry**: PM adds a supplier name and contact email in the Project Portal.
2. **PO Assignment**: A PO is linked to the supplier record.
3. **Invitation Trigger**: The PM triggers an invitation via `src/lib/actions/invitation.ts`.
4. **Secure Token**: A unique, time-limited token is generated in the `invitation` table and sent via Resend.
5. **Registration**: The supplier clicks the link, creates a password (Identity via Better-Auth), and accepts the organization's terms.

## 2. Supplier Portal Logic

The Supplier Portal (`/portal/supplier`) is a filtered view of the main application.

### Data Filtering (RBAC Middleware):
The middleware ensures that a user with the `SUPPLIER` role can only access records where `supplier_id` matches their own `user.supplierId`.

```typescript
// Example Supplier Filter in a Server Action
const user = await auth.getUser();
if (user.role === 'SUPPLIER') {
    query = and(query, eq(schema.purchaseOrder.supplierId, user.supplierId));
}
```

## 3. Compliance & Qualification Engine

Suppliers must upload mandatory qualification documents (e.g., ISO certificates, Insurance, Tax IDs).

### `supplierDocument` Table:
- `documentType`: Categorization (e.g., "CERTIFICATE", "INSURANCE").
- `status`: `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`.
- `validUntil`: Expiration tracking.

### Automated Notifications:
The system tracks `validUntil` dates and automatically generates notifications via `escalation-engine.ts` when a document is near expiry or has expired, blocking certain portal actions if compliance is not maintained.

## 4. Readiness Scoring

The readiness score is a heuristic value used to evaluate supplier maturity.

### Calculation Method:
The `readinessScore` (0-100) is a weighted average of:
- **Profile Completion (20%)**: Name, Address, Contact details.
- **Qualification Docs (40%)**: Ratio of approved mandatory docs.
- **Bank Details (20%)**: Present and verified.
- **Initial Verification (20%)**: PM manual verification flag.

---

### Technical Implementation: Secure Document Upload
Supplier documents are uploaded via `src/app/api/upload/route.ts` using direct-to-S3 multipart uploads. The metadata is then persisted in `supplierDocument` with its association to the supplier record.
