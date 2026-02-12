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
- **Extraction Service**: [Python FastAPI](https://fastapi.tiangolo.com/) Microservice for high-throughput parallel processing
- **Document Analysis**: [AWS Textract](https://aws.amazon.com/textract/)
- **Observability**: [Sentry](https://sentry.io/) for full-stack error tracking and performance monitoring
- **Logistics APIs**: Maersk DCSA & DHL API Connectors
- **Excel/Docx**: [XLSX](https://npm.im/xlsx) and [Mammoth](https://npm.im/mammoth)

---

## 3. Architecture & Core Modules

The application follows a **"Modular Engine"** architecture located in `src/lib/actions`, supported by parallel intelligence services.

### 🛡️ Access Control & Multitenancy
...
### 🏗️ Intelligence Infrastructure: Parallel Extraction Service
To handle high-volume document ingestion without blocking the main event loop, Infradyn employs a **FastAPI-based Python microservice**. 

- **Asynchronous Processing**: Uses `asyncio` for parallel OCR and data extraction tasks.
- **Document Intelligence**: Specialized pipelines for:
    - **Purchase Orders**: Extraction of BOQ line items, milestones, and commercial terms.
    - **Invoices**: Logical mapping of line items to original PO units.
    - **Shipment Lists**: Granular parsing of packing lists and weight metrics.
- **KPI Analysis**: Calculates complex project health metrics and S-Curve data (Planned vs. Actual Spend) using high-performance Python libraries.
- **Decoupled Connectivity**: Integration via `src/lib/services/python-api.ts` with circuit-breaking health checks.

### ⚠️ Quality Management (NCR)
...
### 🚚 Logistics & Delivery Tracking
...
### 🔍 Observability & Operational Excellence
Monitoring is integrated at the core of the platform to ensure 99.9% uptime and rapid incident response.

- **Sentry Error Tracking**: Full-stack coverage across Client, Server, and Edge runtimes.
- **Source Map Security**: Automated build-time uploads ensure readable stack traces without exposing source code to end-users.
- **Performance Profiling**: Tracing of long-running Server Actions and database query latency.
- **Proactive Fallbacks**: Custom React Error Boundaries catch component-level failures and provide graceful recovery paths.

---

## 4. Directory Structure

```text
/
├── db/                   # Drizzle schema, migrations, and seeds
├── python-services/      # High-performance AI & Extraction microservice (FastAPI)
├── src/
│   ├── app/              # Next.js App Router (Pages, API, Layouts)
│   ├── components/       # UI Components (Atomic Design)
...
│   ├── lib/
│   │   ├── actions/      # SERVER ACTIONS (Core Business Logic)
│   │   ├── services/     # Third-party integrations (S3, Python API, etc.)
│   │   ├── sentry/       # Monitoring configuration & utilities
│   │   └── utils.ts      # Shared helper functions
│   └── hooks/            # Custom React hooks
└── DOCUMENTATION.md      # This technical guide
```

---

## 5. Security Model
...
---

## 6. Phase-by-Phase Implementation
...
### Phase 8: Observability & Operational Maturity
- **Sentry Integration**: Global error tracking and performance monitoring.
- **Extraction Parallelism**: Migration of heavy OCR tasks to the Python microservice.
- **Health Monitoring**: Real-time service availability tracking for third-party dependencies.

---

---

## 7. Development Workflow

- **Database Updates**: 
  1. Modify `db/schema.ts`
  2. Run `npm run db:generate` to create migration
  3. Run `npm run db:push` for development or `db:migrate` for production.
- **AI Features**: AI prompts are managed in `src/lib/actions/ncr-ai-parser.ts` using structured JSON output.
- **Email Testing**: Use React Email studio for previewing templates.

---
