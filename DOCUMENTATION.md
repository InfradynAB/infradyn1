# Infradyn - Technical Documentation

## 1. Project Overview
Infradyn is a next-generation **Procurement & Supply Chain Management** platform designed to streamline material tracking, quality control, and financial settlement for large-scale infrastructure projects.

It bridges the gap between **Project Managers (PMs)**, **Procurement Teams**, and **Suppliers** by providing a unified source of truth for:
- Purchase Orders (POs) and Bill of Quantities (BOQs)
- Delivery & Logistics tracking (Maersk/DHL integrations)
- Quality Control (NCR Engine)
- Financial Milestone Settlements & Dispute Resolution

---

## 2. Technology Stack

### Core Framework
- **Modern Web**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Runtime**: [Node.js](https://nodejs.org/)

### Frontend
- **UI Architecture**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/) (Radix UI primitives)
- **Icons**: [Phosphor Icons](https://phosphoricons.com/) & [Lucide React](https://lucide.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation
- **Visualization**: [Recharts](https://recharts.org/) for analytics and heatmaps
- **Toasts**: [Sonner](https://sonner.emilkowal.ski/)

### Backend & Database
- **Auth**: [Better-Auth](https://www.better-auth.com/) (Lucia-based authentication)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (Hosted on Neon)
- **Email**: [React Email](https://react.email/) + [Resend](https://resend.com/)
- **Storage**: [AWS S3](https://aws.amazon.com/s3/) (Presigned URLs for secure uploads)

### Intelligence & Services
- **AI Engine**: [OpenAI GPT-4o](https://openai.com/) (Vision for OCR, Text for Summarization)
- **Document Analysis**: [AWS Textract](https://aws.amazon.com/textract/)
- **Logistics APIs**: Maersk DCSA & DHL API Connectors
- **Excel/Docx**: [XLSX](https://npm.im/xlsx) and [Mammoth](https://npm.im/mammoth)

---

## 3. Architecture & Core Modules

The application follows a **"Modular Engine"** architecture located in `src/lib/actions`.

### 🛡️ Access Control & Multitenancy
- **Organization Management**: Users belong to Organizations.
- **Role-Based Access (RBAC)**: Supports roles like `SUPER_ADMIN`, `ADMIN`, `PM`, `QA`, `FINANCE`, and `SUPPLIER`.
- **Super-Admin Interface**: Direct management of organizations and platform-wide users.

### 📦 Procurement Engine
- **Lifecycle**: Draft PO → Approval → Issued → In-Transit → Delivered.
- **BOQ Tracking**: Line-item tracking for quantity installed vs. quantity received.
- **Milestones**: Payment triggers linked to physical or document-based completion.

### ⚠️ Quality Management (NCR)
- **AI Document Scan**: Upload site reports/photos; AI extracts PO# and defect details.
- **Payment Shield**: Automatically locks milestone payments when a "Critical" NCR is opened.
- **Audit Trails**: Full history log of supplier responses, QA approvals, and evidence uploads.
- **Evidence System**: Support for photos, PDFs, and **Voice Notes** recorded from site.

### 🚚 Logistics & Delivery Tracking
- **Carrier Connectors**: Real-time tracking for Maersk and DHL.
- **Dual Verification**: Site receiver vs. Logistics carrier data mapping.
- **Conflict Management**: Automated flags for quantity mismatches or date variances.

---

## 4. Directory Structure

```text
/
├── db/                   # Drizzle schema, migrations, and seeds
├── src/
│   ├── app/              # Next.js App Router (Pages, API, Layouts)
│   ├── components/       # UI Components (Atomic Design)
│   │   ├── ui/           # Shared shadcn/radix primitives
│   │   ├── ncr/          # Quality management components
│   │   ├── procurement/  # PO & BOQ specific components
│   │   └── supplier/     # Supplier-facing components
│   ├── emails/           # React Email templates
│   ├── lib/
│   │   ├── actions/      # SERVER ACTIONS (Core Business Logic)
│   │   ├── services/     # Third-party integrations (S3, OpenAI, etc.)
│   │   └── utils.ts      # Shared helper functions
│   └── hooks/            # Custom React hooks
└── DOCUMENTATION.md      # This technical guide
```

---

## 5. Security Model

1. **Authentication**: Handled by Better-Auth with session support and 2FA capabilities.
2. **Authorization**: Middleware and Server Action guards enforce `SUPER_ADMIN` or specific `organizationId` scope.
3. **Storage Security**: Files are stored in private S3 buckets and accessed via **Presigned URLs** for ephemeral secure access.
4. **Audit Logging**: Every critical action (Status change, payment lock, invitation) is logged in the `audit_log` table with user/timestamp/IP data.

---

---

## 6. Phase-by-Phase Implementation

### Phase 1: Foundation & Base Access
- **Infrastructure**: Next.js App Router setup with Tailwind CSS 4.
- **Identity**: Better-Auth integration for secure login, sessions, and roles.
- **Multitenancy**: `organization` and `member` schema established to separate client data.

### Phase 2: Procurement & BOQ Engine
- **Data Model**: `purchase_order` and `boq_item` tables with versioning support.
- **Business Logic**: Implementation of PO lifecycle (Draft → Approved → Issued).
- **BOQ Manager**: Line-item tracking with unit prices, quantities, and total value calculations.

### Phase 3: Supplier Ecosystem
- **Onboarding**: invitation-based supplier registration flow.
- **Supplier Portal**: Private dashboard for suppliers to view POs and manage progress.
- **Compliance**: Document upload system for supplier certifications and tax IDs.

### Phase 4: Financial Milestones & Approvals
- **Milestone Engine**: Payment triggers based on percentage completion or specific events.
- **Approval Flow**: Multi-stage approval hierarchy (PM → Finance → Executive).
- **Ledger System**: Tracking of committed vs. paid vs. pending amounts.

### Phase 5: Automated Ingestion (AI & OCR)
- **Excel Import**: Bulk upload support for complex BOQs (using `xlsx`).
- **OCR Engine**: AI-powered data extraction from scanned POs and Invoices (AWS Textract + OpenAI).
- **Drafting**: Intelligent field mapping to reduce manual data entry.

### Phase 6: Logistics & Delivery Tracking
- **Carrier Connectos**: API integration with Maersk and DHL for live shipment tracking.
- **Shipment Schema**: `shipment` and `shipment_event` tables for granular tracking.
- **Delivery Verification**: Site receivers confirm physical arrival against carrier status.

### Phase 7: Quality Excellence (NCR & AI Vision)
- **NCR Engine**: "Payment Shield" logic that blocks milestones on critical defects.
- **AI Vision**: GPT-4 Vision analyzes defect photos to auto-fill reports.
- **Evidence Management**: S3-backed storage for site photos, PDFs, and Voice Notes.
- **Audit Reports**: Exportable HTML/PDF history logs for compliance and accountability.

### Phase 8: Super-Admin & Governance (Planned)
- **Admin Module**: Central dashboard for Infradyn staff to manage all organizations.
- **Invite Orchestration**: Platform-level PM invitation system.
- **System Metrics**: Monitoring of platform usage, health, and audit trails.

---

## 7. Development Workflow

- **Database Updates**: 
  1. Modify `db/schema.ts`
  2. Run `npm run db:generate` to create migration
  3. Run `npm run db:push` for development or `db:migrate` for production.
- **AI Features**: AI prompts are managed in `src/lib/actions/ncr-ai-parser.ts` using structured JSON output.
- **Email Testing**: Use React Email studio for previewing templates.

---
