# Infradyn Platform

**High-Performance Infrastructure Procurement & Supply Chain Management**

Infradyn is a next-generation SaaS solution designed to handle complex industrial procurement lifecycles. From Bill of Quantities (BOQ) ingestion to AI-powered logistics tracking and Non-Conformance Report (NCR) management, Infradyn provides big corporations with a single source of truth for their massive capital projects.

---

##  Technology Stack

- **Frontend**: Next.js 15 (App Router), Tailwind CSS 4, Radix UI.
- **Backend**: Next.js Server Actions, PostgreSQL (Neon), Drizzle ORM.
- **Identity**: Better-Auth (Secure Session & 2FA).
- **Infrastructure**: AWS S3 (Media), Resend (Email), OpenAI (GPT-4o), AWS Textract (OCR).

---

##  Technical Documentation

We maintain a comprehensive technical knowledge base for developers and system architects.

### [Technical Overview](./docs/technical/OVERVIEW.md)
Architectural diagrams, service layer descriptions, and system-wide design principles.

### [API Reference](./docs/technical/api/API_REFERENCE.md)
Detailed documentation for all Server Actions and internal API endpoints.

### [Implementation Phases]
Step-by-step technical breakdown of the platform's core modules:
1. **[Phase 1: Foundation & Identity](./docs/technical/phase-1-foundation.md)**
2. **[Phase 2: Procurement & BOQ Engine](./docs/technical/phase-2-procurement.md)**
3. **[Phase 3: Supplier Ecosystem](./docs/technical/phase-3-suppliers.md)**
4. **[Phase 4: Dual-Path Tracking](./docs/technical/phase-4-tracking.md)**
5. **[Phase 5: AI Ingestion & COs](./docs/technical/phase-5-ingestion.md)**
6. **[Phase 6: Logistics & Delivery](./docs/technical/phase-6-logistics.md)**
7. **[Phase 7: Quality & NCR](./docs/technical/phase-7-quality.md)**
8. **[Phase 8: Analytics & Dashboards](./docs/technical/phase-8-analytics.md)**

### [Logic & Calculations](./docs/technical/guides/CALCULATIONS.md)
Formulaic breakdowns of the financial ledger, currency normalization, and risk assessment algorithms.

### [Handover & Operations]
- **[Environment Setup](./docs/technical/handover/ENVIRONMENT.md)**: How to configure external services and API keys.
- **[Maintenance Guide](./docs/technical/handover/MAINTENANCE.md)**: DB migrations, seeding, and deployment checklists.

---

##  Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (Neon recommended)

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/infradyn.git
   cd infradyn
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and populate the fields (Neon URL, AWS Credentials, OpenAI Key, Better-Auth Secret).

4. **Initialize Database**:
   ```bash
   pnpm db:push
   ```

5. **Start Development Server**:
   ```bash
   pnpm dev
   ```

---

##  Security & Compliance

Infradyn is built with an "Enterprise-First" mindset:
- **RBAC**: Strict role-based access control across all modules.
- **Data Isolation**: Force-filtered multi-tenancy at the database level.
- **Audit Logs**: Comprehensive tracking of every financial and quality-related change.

---

&copy; 2026 Infradyn Technologies. All rights reserved.
