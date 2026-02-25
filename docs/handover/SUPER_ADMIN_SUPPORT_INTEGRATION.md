# Super Admin Support Module — Integration Guide

**For the agent working on the separate super admin repository.**  
This document tells you exactly what has been built on the main app, what data contracts exist, and what you need to build on the super admin side to make the support ticketing module fully operational end-to-end.

---

## 1. Overview of What Has Been Built

The main application (`infradyn1`) now contains a **complete support ticketing system**:

- Any authenticated user (any role) can raise a support ticket.
- Tickets are saved in the database with a unique ticket number (format: `TKT-YYYYMMDD-XXXX`).
- On ticket creation, two emails fire automatically:
  1. **Confirmation email → to the user who raised the ticket.**
  2. **Notification email → to every user in the database with role `SUPER_ADMIN`.**
- The notification email contains a direct link to the ticket inside the main app's super admin panel.
- When a super admin replies (from inside the main app), a **response email fires → to the ticket raiser**.
- Tickets have statuses, priorities, categories, and full message threading.

The main app has its own super admin support panel at `/dashboard/support`. **However**, per your requirement, the separate super admin repo also needs its own ticket management view. This guide tells you what to build there.

---

## 2. Database Tables (Shared DB or API Access)

If the super admin repo shares the **same PostgreSQL database**, you can query these tables directly with Drizzle or raw SQL.  
If it uses **API calls**, skip to §4 which documents the available server actions / API routes.

### `support_ticket`

| Column | Type | Notes |
|---|---|---|
| `id` | `text` NOT NULL PK | UUID |
| `ticket_number` | `text` NOT NULL UNIQUE | Format: `TKT-YYYYMMDD-XXXX` |
| `raised_by` | `text` NOT NULL FK → `user.id` | User who created the ticket |
| `organization_id` | `text` FK → `organization.id` | Optional — some users may not have an org |
| `category` | `support_ticket_category` enum | See §3 |
| `priority` | `support_ticket_priority` enum | See §3 |
| `status` | `support_ticket_status` enum | See §3 |
| `subject` | `text` NOT NULL | One-line summary |
| `description` | `text` NOT NULL | Full description entered by user |
| `assigned_to` | `text` FK → `user.id` | NULLABLE — set by super admin |
| `resolved_at` | `timestamp` | Set when status → RESOLVED |
| `closed_at` | `timestamp` | Set when status → CLOSED |
| `last_activity_at` | `timestamp` | Auto-updated on new messages |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

### `support_ticket_message`

| Column | Type | Notes |
|---|---|---|
| `id` | `text` NOT NULL PK | UUID |
| `ticket_id` | `text` NOT NULL FK → `support_ticket.id` | |
| `sender_id` | `text` NOT NULL FK → `user.id` | Who sent this message |
| `content` | `text` NOT NULL | Message body |
| `is_from_support` | `boolean` NOT NULL DEFAULT false | True when sent by SUPER_ADMIN |
| `is_internal` | `boolean` NOT NULL DEFAULT false | Internal notes — NOT sent to user |
| `attachment_url` | `text` | S3 URL if user attached a file |
| `attachment_name` | `text` | Original filename |
| `attachment_type` | `text` | MIME type |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

---

## 3. Enum Values

### `support_ticket_category`
```
TECHNICAL       → Platform errors, crashes, unexpected behaviour
BILLING         → Invoices, subscriptions, payment questions
ACCESS_ISSUE    → Login problems, role issues, missing permissions
BUG_REPORT      → Something that doesn't work correctly
DATA_ISSUE      → Incorrect data, missing records, sync problems
FEATURE_REQUEST → Suggest a new feature or improvement
GENERAL         → General enquiry
OTHER           → Anything else
```

### `support_ticket_status`
```
OPEN            → Newly raised, not yet reviewed
IN_PROGRESS     → Super admin is actively working on it
AWAITING_USER   → Super admin responded, waiting for user's reply
RESOLVED        → Issue has been resolved
CLOSED          → Ticket closed (no further action needed)
```

**Status transition rules** (enforce these in your UI):
```
OPEN         → IN_PROGRESS | AWAITING_USER | RESOLVED | CLOSED
IN_PROGRESS  → AWAITING_USER | RESOLVED | CLOSED
AWAITING_USER→ IN_PROGRESS | RESOLVED | CLOSED
RESOLVED     → CLOSED | OPEN (if user re-opens by replying)
CLOSED       → (terminal — no transitions; users must raise a new ticket)
```

### `support_ticket_priority`
```
LOW     → Not urgent, when convenient
MEDIUM  → Standard turnaround
HIGH    → Blocking work
URGENT  → Critical — system down
```

**SLA targets (recommended — not enforced by code)**:
| Priority | First Response | Resolution |
|---|---|---|
| URGENT | 1 hour | 4 hours |
| HIGH | 4 hours | 24 hours |
| MEDIUM | 1 business day | 3 business days |
| LOW | 2 business days | 1 week |

---

## 4. Available Server Actions (main app)

These are `"use server"` functions exported from `src/lib/actions/support-actions.ts`.  
If the super admin repo is a **separate Next.js app** on the same DB, you can call Drizzle directly.  
If it makes HTTP calls to the main app, you will need to expose these as REST API routes (see §5 for recommended routes to create).

### Functions available with `SUPER_ADMIN` role:

#### `getAllTickets(statusFilter?: TicketStatus)`
Returns all tickets in the system. Optionally filter by a single status.

**Returns**: Array of `TicketWithThread` (see type in §6).

---

#### `getTicketWithThread(ticketId: string)`
Returns a single ticket with all messages, raiser user info, and assignee info.  
Super admins see ALL messages (including `is_internal: true` notes).  
Regular users only see non-internal messages.

**Returns**: `TicketWithThread | null`

---

#### `addTicketReply(formData: FormData)`
Posts a new message to a ticket. Required fields:

| Field | Type | Required |
|---|---|---|
| `ticketId` | string | ✅ |
| `content` | string | ✅ |
| `isInternal` | `"true"` or `"false"` | optional (super admin only) |
| `attachmentUrl` | string | optional |
| `attachmentName` | string | optional |
| `attachmentType` | string | optional |

**Side effects**:
- If `isFromSupport = true` (i.e., sender is SUPER_ADMIN): status auto-updates to `IN_PROGRESS`, and **triggers `sendTicketResponseToUser()` email** to the ticket raiser.
- If user replies: status resets to `OPEN`.
- Updates `lastActivityAt` on the ticket.

**Returns**: `{ success: boolean; error?: string }`

---

#### `updateTicketStatus(ticketId: string, status: TicketStatus)`
Updates the ticket status. Also sets `resolvedAt`/`closedAt` timestamps.

**Returns**: `{ success: boolean; error?: string }`

---

#### `assignTicket(ticketId: string, assignToUserId: string)`
Assigns the ticket to a specific super admin user.

**Returns**: `{ success: boolean; error?: string }`

---

#### `getSupportStats()`
Returns aggregate counts for the dashboard.

**Returns**:
```typescript
{
  open: number;
  in_progress: number;
  awaiting_user: number;
  resolved: number;
  closed: number;
  urgent: number;
  high: number;
}
```

---

## 5. REST API Routes to Create (Recommended)

If the super admin repo is a separate Next.js / Express application that **does NOT share the database**, the main app needs to expose REST API endpoints. Below are the endpoints you should request or build on the main app side:

> **Note**: All routes below must be authenticated with a valid super admin session. Implement an API key or shared JWT secret for service-to-service authentication.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/support/tickets` | List all tickets (accepts `?status=OPEN`) |
| `GET` | `/api/support/tickets/:ticketId` | Get ticket with full thread |
| `POST` | `/api/support/tickets/:ticketId/reply` | Post a message to a ticket |
| `PATCH` | `/api/support/tickets/:ticketId/status` | Update status |
| `PATCH` | `/api/support/tickets/:ticketId/assign` | Assign to an admin |
| `GET` | `/api/support/stats` | Get aggregate stats |

**Request/response shapes** for each endpoint map directly to the server action signatures in §4.

---

## 6. TypeScript Types

```typescript
/**
 * Full ticket with message thread — returned by getTicketWithThread()
 */
type TicketWithThread = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: "TECHNICAL" | "BILLING" | "ACCESS_ISSUE" | "BUG_REPORT" | "DATA_ISSUE" | "FEATURE_REQUEST" | "GENERAL" | "OTHER";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "AWAITING_USER" | "RESOLVED" | "CLOSED";
  organizationId: string | null;
  assignedTo: string | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  lastActivityAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  raiser: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    image: string | null;
  } | null;
  assignee: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  messages: TicketMessage[];
};

type TicketMessage = {
  id: string;
  ticketId: string;
  content: string;
  isFromSupport: boolean;
  isInternal: boolean;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  createdAt: Date | null;
  sender: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
};
```

---

## 7. Email Triggers (Do NOT duplicate)

The main app fires all support emails automatically. **Do not duplicate these in the super admin repo** — doing so would send duplicate emails.

| Event | Email Sent | Template |
|---|---|---|
| Ticket created | Confirmation → ticket raiser | `TicketCreatedEmail` |
| Ticket created | Notification → ALL super admins | `TicketAdminNotifyEmail` |
| Super admin replies | Response notification → ticket raiser | `TicketResponseEmail` |

The admin notification email contains a direct link:  
`https://{main-domain}/dashboard/support/{ticketId}`

If the super admin repo also has its own domain, you may want to intercept this link and redirect to the super admin panel instead. This requires updating the `ticketUrl` passed to `sendTicketAdminNotify()` in `src/lib/services/email.ts`.

---

## 8. File Attachment Handling

Users can attach screenshots or PDF files when raising a ticket. Files are stored in S3.

- **Upload endpoint**: `POST /api/support/upload`
- **Accepts**: `{ fileName: string; contentType: string }`
- **Returns**: `{ uploadUrl: string; fileUrl: string; key: string }`
- **Allowed types**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`
- **Max size**: 10 MB
- **S3 key format**: `support/{userId}/{timestamp}_{fileName}`

In your super admin UI, when a ticket message has `attachmentUrl`, render it as:
- An `<img>` tag if `attachment_type` starts with `image/`
- A download link otherwise

The `attachmentUrl` is a **public S3 URL** that can be embedded directly.

---

## 9. UI Screens to Build in the Super Admin Repo

### 9.1 Support Inbox (`/support`)

**Purpose**: Super admin overview of all open tickets.

**Required elements**:
- Stats bar: Open (red), In Progress (blue), Awaiting User (yellow), Resolved (green), Urgent count (urgent badge).
- Tab filter: All | Open | In Progress | Awaiting User | Resolved | Closed.
- Ticket list table/cards with:
  - Ticket number (`TKT-YYYYMMDD-XXXX`)
  - Subject (truncated)
  - Category badge (color coded — see §9.4)
  - Priority badge
  - Status badge
  - Raiser name + email
  - Organization name (if available)
  - Last activity timestamp (relative: "2 hours ago")
  - Assigned to (admin avatar or "Unassigned")
  - Click → navigate to ticket detail

**Sorting**: Default by `lastActivityAt` DESC. Allow sort by `createdAt`, `priority`.

**Filtering**: By status tab, plus search by ticket number or subject.

---

### 9.2 Ticket Detail (`/support/[ticketId]`)

**Purpose**: Full view of one ticket with message thread and admin controls.

**Left / main section — Thread**:
- Ticket header:
  - Ticket number + subject
  - Meta row: Category | Priority | Status | Opened date | Raised by
  - Organisation (if any)
- Original description bubble (user, left-aligned, muted background).
- Message bubbles, ordered by `createdAt` ASC:
  - User messages: left-aligned, muted/secondary bg
  - Support messages (`is_from_support: true`): right-aligned, primary/brand bg
  - Internal notes (`is_internal: true`): amber/yellow bg with "Internal Note" label — only visible to super admins
  - Each bubble shows: sender avatar (initials fallback), sender name, timestamp, content, attachment (if any)
- Reply form at bottom:
  - Textarea (required)
  - File attach button (calls `/api/support/upload`, then stores URL)
  - "Mark as Internal Note" toggle (checkbox) — internal notes NOT shown to user and do NOT trigger email
  - Send / Post Reply button

**Right sidebar — Admin Controls**:
- **Status selector**: Dropdown (`<Select>`) with all 5 status values. On change, calls `updateTicketStatus()`.
- **Priority display**: Show with color badge; optionally allow edit.
- **Assign to**: Dropdown listing all users with `SUPER_ADMIN` or `ADMIN` role. Calls `assignTicket()`.
- **Ticket info card**:
  - Opened: `{createdAt formatted}`
  - Last activity: `{lastActivityAt relative}`
  - Resolved: `{resolvedAt}` (if applicable)
  - Total messages: count
- **Quick actions**:
  - "Mark Resolved" button → `updateTicketStatus(id, 'RESOLVED')`
  - "Close Ticket" button → `updateTicketStatus(id, 'CLOSED')` (with confirmation dialog)

---

### 9.3 Analytics / Stats Panel (`/support/analytics`) — Optional but Recommended

- Ticket volume over time (line chart by week)
- Breakdown by category (pie/donut)
- Breakdown by priority (bar)
- Average first response time
- Resolution rate

Data source: aggregate queries on `support_ticket` + `support_ticket_message`.

---

### 9.4 Colour Coding Reference

| Category | Background | Text |
|---|---|---|
| TECHNICAL | `bg-blue-500/10` | `text-blue-600` |
| BILLING | `bg-cyan-500/10` | `text-cyan-600` |
| ACCESS_ISSUE | `bg-amber-500/10` | `text-amber-600` |
| BUG_REPORT | `bg-red-500/10` | `text-red-600` |
| DATA_ISSUE | `bg-purple-500/10` | `text-purple-600` |
| FEATURE_REQUEST | `bg-emerald-500/10` | `text-emerald-600` |
| GENERAL | `bg-muted` | `text-muted-foreground` |
| OTHER | `bg-muted` | `text-muted-foreground` |

| Status | Badge colour |
|---|---|
| OPEN | Red (`destructive`) |
| IN_PROGRESS | Blue |
| AWAITING_USER | Amber/yellow |
| RESOLVED | Green |
| CLOSED | Grey/muted |

| Priority | Badge colour |
|---|---|
| LOW | Emerald |
| MEDIUM | Amber |
| HIGH | Orange |
| URGENT | Red (bold / destructive) |

---

## 10. Authentication & Authorisation

- All support management actions **require `role === 'SUPER_ADMIN'`**.
- The main app enforces this server-side in every server action.
- In the super admin repo, ensure your session middleware rejects requests from users without `SUPER_ADMIN` role.
- If implementing API-key-based service auth (main app ↔ super admin repo), store the key in `.env` as `SUPER_ADMIN_API_KEY` and validate it in a middleware at `/api/support/**`.

---

## 11. Status Flow Diagram

```
               ┌─────────────────────────────────────────────────────┐
               │                  Ticket Lifecycle                   │
               └─────────────────────────────────────────────────────┘

  User raises ticket
        │
        ▼
    ┌──────┐       ─── Super admin picks up ───►  ┌─────────────┐
    │ OPEN │                                       │ IN_PROGRESS │
    └──────┘◄─── User replies (auto) ─────────────└─────────────┘
        │                                                │
        │                                                │ Admin responds
        │                                                ▼
        │                                       ┌────────────────┐
        │                                       │ AWAITING_USER  │
        │                                       └────────────────┘
        │                                                │
        │◄─────────────── User replies ─────────────────┘
        │
        │─── Admin marks resolved ──────────────────────► ┌──────────┐
        │                                                  │ RESOLVED │
        │                                                  └──────────┘
        │                                                       │
        └───────────────────────────────────────────────────────┼──► ┌────────┐
                                                                │    │ CLOSED │
                 Admin closes directly from any status ─────────┘    └────────┘
                                                                     (Terminal)
```

---

## 12. Checklist for the Super Admin Repo Agent

Use this as your implementation checklist:

- [ ] **Database access**: Confirm whether you share the same DB or call the main app via REST API
- [ ] **Auth guard**: Ensure all support routes require SUPER_ADMIN role
- [ ] **Support Inbox page** with stats bar, tabs, and ticket list (§9.1)
- [ ] **Ticket Detail page** with thread, reply form, and admin controls sidebar (§9.2)
- [ ] **Status update** action/mutation (calls `updateTicketStatus` or `PATCH /api/support/tickets/:id/status`)
- [ ] **Assign ticket** action (calls `assignTicket` or `PATCH /api/support/tickets/:id/assign`)
- [ ] **Post reply** action (calls `addTicketReply` or `POST /api/support/tickets/:id/reply`)
- [ ] **Internal notes** toggle in reply form (is_internal = true, never emailed, amber UI)
- [ ] **File attachments** display (images inline, PDFs as download link)
- [ ] **DO NOT** duplicate email sending — main app handles all emails
- [ ] **Colour coding** applied consistently to categories, statuses, priorities (§9.4)
- [ ] **Ticket number format** displayed as-is: `TKT-YYYYMMDD-XXXX`
- [ ] Relative timestamps ("2 hours ago") for all ticket list and thread dates

---

## 13. Environment Variables

The main app uses these env vars relevant to support tickets. The super admin repo needs the same ones if it shares the DB or calls S3 directly:

```bash
# Database (if shared)
DATABASE_URL=

# S3 (only if displaying attachments from a private bucket — current setup uses public URLs)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_BUCKET_NAME=
```

---

## 14. Key File Locations in the Main App (for reference)

| What | Path |
|---|---|
| Schema (tables + enums) | `db/schema.ts` |
| Migration SQL | `drizzle/0004_support_tickets.sql` |
| Server actions | `src/lib/actions/support-actions.ts` |
| Email: ticket created (user) | `src/emails/ticket-created-email.tsx` |
| Email: admin notification | `src/emails/ticket-admin-notify-email.tsx` |
| Email: admin response (user) | `src/emails/ticket-response-email.tsx` |
| Email service functions | `src/lib/services/email.ts` |
| Upload API route | `src/app/api/support/upload/route.ts` |
| Support list page | `src/app/dashboard/support/page.tsx` |
| New ticket form | `src/app/dashboard/support/new/new-ticket-form.tsx` |
| Ticket thread page | `src/app/dashboard/support/[ticketId]/ticket-thread-client.tsx` |

---

*Generated: infradyn1 support module handover — v1.0*
