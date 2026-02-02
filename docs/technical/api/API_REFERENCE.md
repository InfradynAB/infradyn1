# Infradyn API Reference (Phases 1-3)

This document details the core Server Actions and internal API endpoints used for organization setup, procurement management, and supplier onboarding.

---

## 1. Organization & Projects

### `createOrganization` (Server Action)
**Path**: `src/lib/actions/organization.ts`

Initializes a new multi-tenant organization.
- **Input**: `{ name: string, slug: string, contactEmail: string }`
- **Output**: The created `organization` record.
- **Developer Note**: Also initializes a default `usage_quota` record for the organization.

### `createProject` (Server Action)
**Path**: `src/lib/actions/project.ts`

Creates a workspace/project under the current organization.
- **Input**: `{ name: string, currency: string, budget: number }`
- **Output**: The created `project` record.
- **Security**: Automatically links the current user as a `project_user`.

---

## 2. Procurement & PO Management

### `createPurchaseOrder` (Server Action)
**Path**: `src/lib/actions/procurement.ts`

Creates a new PO record.
- **Input**: `{ projectId: string, supplierId: string, poNumber: string, totalValue: number, currency: string }`
- **Output**: `{ id: string, poNumber: string }`

### `bulkImportBOQ` (Server Action)
**Path**: `src/lib/actions/boq.ts`

Imports multiple BOQ items from a JSON payload (usually provided by the Excel parser).
- **Input**: `items: { description: string, unit: string, quantity: number, unitPrice: number }[]`, `poId: string`
- **Logic**: Calculates `total_price` for each item and validates that the sum matches the PO `total_value`.

### `publishPurchaseOrder` (Server Action)
**Path**: `src/lib/actions/procurement.ts`

Transitions a PO from `DRAFT` to `PUBLISHED` status, making it visible to the linked supplier.
- **Input**: `poId: string`
- **Events**: Triggers a notification email to the supplier contact.

---

## 3. Supplier Management

### `inviteSupplier` (Server Action)
**Path**: `src/lib/actions/invitation.ts`

Sends a secure onboarding invitation to a supplier.
- **Input**: `{ email: string, supplierId: string, role: string }`
- **Logic**: 
    1. Generates a 64-character unique token.
    2. Stores token in `invitation` table with 7-day expiry.
    3. Sends email via Resend with URL `https://app.infradyn.com/register?token=<TOKEN>`.

### `getSupplierRecord` (API Route)
**Path**: `src/app/api/suppliers/[id]/route.ts`

Returns detailed supplier information including their assigned POs and compliance status.
- **Method**: `GET`
- **Security**: Protected by RBAC. Suppliers can only fetch their own ID. PMs can fetch any supplier within their org.

---

## 4. Shared Services (Internal APIs)

### `convertCurrency`
**Path**: `src/lib/services/currency.ts`

Utility service for real-time currency conversion. 
- **Internal Call**: `convert(amount, from, to)`
- **External Integration**: Uses the Currency Converter API configured in environment variables.

### `uploadDocument` (API Route)
**Path**: `src/app/api/upload/route.ts`

Handles multi-part form data for file uploads to AWS S3.
- **Method**: `POST`
- **Returns**: `{ fileUrl: string, fileName: string, mimeType: string }`
