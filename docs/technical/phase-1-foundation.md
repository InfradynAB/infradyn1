# Phase 1: Foundation & Identity Management

Phase 1 establishes the core structural integrity of the Infradyn platform. This includes multi-tenant organization management, secure identity via Better-Auth, and the basic project workspace environment.

## 1. Identity Management (Better-Auth)

Infradyn utilizes [Better-Auth](https://www.better-auth.com/) for its security layer. 

### Core Features:
- **Session Management**: Secure, server-side session tracking.
- **Two-Factor Authentication (2FA)**: Support for TOTP based 2FA for enhanced security.
- **Role-Based Access Control (RBAC)**: Integration with the `userRoleEnum` to enforce platform-wide permissions.

### User Schema:
The `user` table extends the standard auth fields with Infradyn-specific data:
- `organizationId`: Link to the user's current working organization.
- `role`: One of `SUPER_ADMIN`, `ADMIN`, `PM`, `SUPPLIER`, `QA`, `SITE_RECEIVER`.
- `supplierId`: If the user is a `SUPPLIER` role, they are linked to a specific supplier record.

## 2. Multi-Tenancy Architecture

The multi-tenancy model is "Shared Database, Shared Schema" with logical isolation.

### Organization Model:
- **`organization`**: The root entity for all data.
- **`member`**: Join table connecting users to organizations with specific memberships.
- **`invitation`**: Secure token-based onboarding system.

### Isolation Strategy:
Every server action and API request must validate that the requested resource belongs to the `organizationId` found in the user's session.

```typescript
// Example Isolation Logic
const session = await auth.getSession();
const orgId = session.user.organizationId;

const po = await db.query.purchaseOrder.findFirst({
    where: and(
        eq(purchaseOrder.id, requestedId),
        eq(purchaseOrder.organizationId, orgId)
    )
});
```

## 3. RBAC (Role-Based Access Control)

The RBAC system is defined in `src/lib/rbac.ts`.

| Role | Description | Access Scope |
| :--- | :--- | :--- |
| **PM (Project Manager)** | Internal project lead. | Full access to all modules within their organization. |
| **Supplier** | External partner. | Limited to their assigned POs, Shipments, and NCRs. |
| **QA (Inspector)** | Quality control specialist. | Focuses on NCR and Inspection modules. No financial access. |
| **Site Receiver** | Field personnel. | Logistics and delivery confirmation. No financial access. |

## 4. Infrastructure Ops

### Database: PostgreSQL (Neon)
Utilizes Neon's serverless Postgres for high availability and branching capabilities.
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) for type-safe database interactions and migrations.

### Transactional Media: AWS S3
All documents (POs, Invoices, Delivery Photos) are stored in AWS S3 buckets.
- **Security**: Files are served via signed URLs or private access logic to prevent unauthorized direct links.

### Transactional Email: Resend
Used for all system communications:
- Invitation links.
- PO alerts.
- NCR notifications.
- Weekly digests.
