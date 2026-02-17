# AI Assistant — Technical Documentation

**Version:** 1.0  
**Phase:** AI Intelligence  
**Status:** v1 Live  

---

## Overview

A context-aware AI procurement copilot embedded in the Infradyn dashboard. Appears as a floating button in the bottom-right corner, opens into a chat panel, and answers questions about the user's projects, POs, NCRs, shipments, and more — all scoped to their role and organization.

**Model:** GPT-4o via OpenAI SDK v6  
**Streaming:** Server-Sent Events (SSE)  
**Icons:** Phosphor Icons  
**Auth:** Better-Auth session  

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND (Dashboard)                                        │
│                                                              │
│  ┌─────────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ AI Widget (FAB)  │───▶│ useAIChat    │───▶│ AIMessage   │  │
│  │ ai-assistant-    │    │ Hook         │    │ Renderer    │  │
│  │ widget.tsx       │    │ use-ai-chat  │    │ ai-message  │  │
│  └─────────────────┘    │ .ts          │    │ .tsx        │  │
│                         └──────┬───────┘    └─────────────┘  │
│                                │ SSE Stream                   │
└────────────────────────────────┼──────────────────────────────┘
                                 │ POST /api/ai-assistant
┌────────────────────────────────┼──────────────────────────────┐
│  BACKEND (API Route)           ▼                              │
│                                                              │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────────┐  │
│  │ Auth     │──▶│ Context      │──▶│ OpenAI GPT-4o        │  │
│  │ Session  │   │ Engine       │   │ (streaming + tools)   │  │
│  └──────────┘   │ context.ts   │   └──────────┬───────────┘  │
│                 └──────────────┘              │              │
│                                    tool_calls │              │
│                                              ▼              │
│                                   ┌──────────────────────┐  │
│                                   │ Tool Executor        │  │
│                                   │ tools.ts             │  │
│                                   │ (10 role-scoped      │  │
│                                   │  DB query wrappers)  │  │
│                                   └──────────┬───────────┘  │
│                                              │              │
│                                              ▼              │
│                                   ┌──────────────────────┐  │
│                                   │ PostgreSQL (Drizzle) │  │
│                                   └──────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Request Flow

1. User sends message → `useAIChat` sends conversation history to `POST /api/ai-assistant`
2. Better-Auth session validates user, extracts `role`, `organizationId`, `supplierId`
3. `resolveUserContext()` fetches org name, project name, supplier ID from DB
4. `buildSystemPrompt()` generates a role-aware prompt (PM vs Supplier) with guardrails
5. GPT-4o is called with the system prompt, conversation, and role-scoped tool definitions
6. If the model calls a tool (e.g. `get_open_ncrs`), the executor runs the DB query and feeds results back
7. Text deltas are streamed back via SSE; frontend renders them word-by-word

---

## File Map

### Backend (`src/lib/ai-assistant/`)

| File | Lines | Purpose |
|---|---|---|
| `types.ts` | ~126 | Shared types: `ChatMessage`, `AssistantUserContext`, `StreamEvent` |
| `context.ts` | ~177 | Resolves user context from session; builds system prompt with guardrails |
| `tools.ts` | ~450 | 10 tool definitions + executor, each wrapping a DB query |

### API Route

| File | Purpose |
|---|---|
| `src/app/api/ai-assistant/route.ts` | Auth → context → OpenAI streaming → multi-round tool loop (max 5 rounds) |

### Frontend

| File | Purpose |
|---|---|
| `src/hooks/use-ai-chat.ts` | React hook: messages state, SSE stream parsing, navigation handling |
| `src/components/ai-assistant/ai-message.tsx` | Message bubble: markdown rendering, tool activity indicator, streaming dots |
| `src/components/ai-assistant/ai-assistant-widget.tsx` | Floating FAB + chat panel with welcome view and quick suggestions |

### Integration

| File | Change |
|---|---|
| `src/app/dashboard/layout.tsx` | Added `<AIAssistantWidget>` with `user`, `activeOrgId`, `activeProjectId` props |

---

## Tool System

Tools are role-scoped — the model only receives tools relevant to the user's role.

| Tool | PM | Supplier | Description |
|---|---|---|---|
| `get_my_notifications` | ✅ | ✅ | Recent 10 notifications |
| `get_purchase_orders` | ✅ | ✅ | POs with optional status filter |
| `get_open_ncrs` | ✅ | ✅ | Non-closed NCRs |
| `get_active_shipments` | ✅ | ✅ | Shipments in transit / pending |
| `explain_feature` | ✅ | ✅ | Role-aware how-to guides |
| `navigate_to_page` | ✅ | ✅ | Returns URL for client-side navigation |
| `get_project_overview` | ✅ | ❌ | Aggregated project stats |
| `get_supplier_performance` | ✅ | ❌ | Supplier reliability metrics |
| `get_pending_approvals` | ✅ | ❌ | Pending invoices / conflicts |
| `get_my_action_items` | ❌ | ✅ | Supplier's pending tasks |

### Role-Aware Feature Guides (`explain_feature`)

The tool returns different instructions depending on the user's role. For example:

| Feature | PM hears | Supplier hears |
|---|---|---|
| NCR | "Go to Quality (NCR) → New NCR" | "Go to POs → open PO → scroll down to NCR section" |
| Invoice | "Open PO → Invoices tab → approve/reject" | "Open PO → Invoices tab → Upload Invoice" |
| PO | "Procurement → New PO" | "Dashboard → POs to view assigned POs" |

---

## Guardrails

### Allowed (always answer)
- Project status, PO details, NCR queries, shipment tracking
- Notifications, action items, pending approvals
- How-to guides for any Infradyn feature
- Any casual phrasing of the above

### Refused (always block)
- Code generation or programming help
- General knowledge (history, science, math)
- Creative writing, personal advice
- Jailbreak attempts or prompt injection

### Ambiguous
If the model isn't sure whether a request is procurement-related, it asks the user to clarify rather than refusing.

---

## Streaming Protocol (SSE Events)

| Event | Payload | When |
|---|---|---|
| `text_delta` | `{ content: string }` | Each token from GPT-4o |
| `tool_start` | `{ name: string }` | Model invokes a tool |
| `tool_result` | `{ name: string }` | Tool execution completes |
| `error` | `{ message: string }` | Error during processing |
| `done` | `{}` | Response complete |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o |

---

## Multi-Tenancy

All data queries are scoped by:
- `organizationId` — from the active org cookie / session
- `supplierId` — for supplier-specific queries
- `projectId` — when the user has an active project filter

This ensures no data leaks between organizations or suppliers.

---

## Design Tokens

| Element | Value |
|---|---|
| Brand color | `cyan-700` (#0E7490) |
| Panel size | 400×560px |
| Icons | Phosphor (`@phosphor-icons/react`) |
| Effects | Glassmorphism backdrop, pulse ring, streaming dots |
| Position | Fixed, bottom-right (z-index 99-100) |
