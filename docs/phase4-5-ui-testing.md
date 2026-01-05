# Phase 4 & 5 UI Testing Guide

Complete testing checklist for all Phase 4 (Supplier Collaboration) and Phase 5 (Integrations) features.

---

## 🧪 Pre-Test Setup

### Test Accounts Required
| Role | Email | Purpose |
|------|-------|---------|
| PM (Admin) | Your main account | Create POs, manage suppliers, view integrations |
| Supplier | Create test supplier | Submit progress, upload evidence |

### Create Test Data
1. **Organization** - Create at Organizations page
2. **Project** - Create with a budget and currency
3. **Supplier** - Invite a supplier via email
4. **Purchase Order** - Create with milestones

---

## 📋 PM Role Tests

### 1. Dashboard & Navigation
| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| Sidebar shows Integrations | Look for plug icon in sidebar | "Integrations" visible between Suppliers and Settings | |
| Bell icon in header | Check top-right of dashboard | Bell icon next to theme toggle | |
| Click notification bell | Click bell icon | Dropdown shows notifications or "No notifications" | |

---

### 2. Create Purchase Order with Milestones
| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| Create new PO | Procurement → New PO | Form loads with project/supplier selection | |
| Add milestones | Save PO, then add milestones | Milestones appear in list | |
| Upload PO PDF | Use "Upload Version" button | PDF uploaded, version number increases | |

---

### 3. Progress Tab (Quick Entry Form)
**Navigate to**: Procurement → [Any PO] → **Progress Tab**

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| View progress tab | Click "Progress" tab on PO detail | Form and history visible | |
| Log internal progress | Enter % for milestone, click save | Progress saved with "INTERNAL" trust badge | |
| See forecast badge | Look at stale milestone (7+ days) | "⚠ Forecast" badge appears | |

---

### 4. Conflicts Tab (Side-by-Side Resolution)
**Navigate to**: Procurement → [Any PO] → **Conflicts Tab**

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| View conflicts | Click "Conflicts" tab | Queue shows any open conflicts | |
| Open conflict resolver | Click on a conflict | Side-by-side view with internal vs supplier values | |
| Resolve conflict | Choose Approve/Reject/Override | Conflict closes, resolution saved | |

---

### 5. Gallery Tab (Photo/Video Upload)
**Navigate to**: Procurement → [Any PO] → **Gallery Tab**

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| View gallery | Click "Gallery" tab | Grid of uploaded media (or empty state) | |
| Upload photo | Click "Upload Files" button | Photo appears in gallery | |
| Upload video | Upload a video file | Video plays with controls | |
| View fullscreen | Click on media item | Lightbox opens with zoom/navigation | |

---

### 6. Integrations Page
**Navigate to**: Settings → Integrations (or sidebar Integrations)

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| Page loads | Click Integrations | No errors, page displays | |
| Usage quotas visible | Look at top section | OCR, AI Parsing, Email bars with usage | |
| External syncs section | Look for "Add Sync" button | Button to add Smartsheet sync | |
| Add sync dialog | Click "Add Sync" | Modal opens with provider/API key fields | |
| Email inbox visible | Scroll to email section | List of ingested emails (or empty) | |
| Copy email address | Click "Copy Address" | Toast confirms address copied | |
| Quick stats visible | Look at "This Month" card | Shows OCR/AI/Email counts | |

---

### 7. Test Smartsheet Sync (Optional)
| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| Add Smartsheet sync | Enter API key + Sheet ID | "Connection successful" message | |
| Trigger manual sync | Click sync button on config | Items processed message | |
| View sync logs | Expand sync config | History of sync attempts visible | |

---

## 👷 Supplier Role Tests

### Switch to Supplier Account
Log out and log in with supplier credentials.

---

### 1. Supplier Dashboard
| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| View supplier dashboard | Navigate to /dashboard/supplier | Dashboard with assigned POs | |
| My POs visible | Click "My POs" in sidebar | List of POs assigned to supplier | |

---

### 2. Submit Progress Update
**Navigate to**: My POs → [Select a PO]

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| View PO details | Click on a PO | PO details with milestones | |
| Update progress | Enter % for a milestone | Progress saved | |
| Upload evidence | Attach photo/document | File uploaded with progress | |
| See update in timeline | Look at history | Update appears with "SUPPLIER" badge | |

---

### 3. Profile & Compliance
**Navigate to**: Profile & Compliance (sidebar)

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| View onboarding page | Click Profile & Compliance | Onboarding checklist visible | |
| Upload compliance docs | Add insurance/license docs | Documents saved to profile | |
| Complete profile | Fill all required fields | Progress indicator updates | |

---

## 🔔 Escalation & Chase Tests

### Trigger Chase Reminder
1. Create a milestone with an expected date in the past
2. Wait for chase cron to run (or manually trigger)
3. Check supplier email for reminder

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| Chase email sent | Trigger chase cron | Supplier receives reminder email | |
| Escalation after 8hrs | Wait or simulate time | PM receives escalation email | |
| Bell notification | Check PM bell icon | Escalation appears in notifications | |

---

## 📧 Email Ingestion Test

### Send Test Email
1. Copy your org's ingest email from Integrations page
2. Send email with PDF attachment to that address
3. Wait 1-2 minutes for processing

| Test | Steps | Expected | ✓/✗ |
|------|-------|----------|-----|
| Email received | Check Email Inbox on Integrations | Email appears in list | |
| Attachment processed | Click on email | Attachment extracted | |
| AI parsed | Check extracted data | Document data parsed from PDF | |

---

## ✅ Final Checklist Summary

### Phase 4 Core Flows
- [ ] Submit document via email → appears in dashboard auto-parsed
- [ ] Manually log progress for silent supplier (Quick Entry form)
- [ ] See "Forecast" badge on stale data (7+ days)
- [ ] View side-by-side conflict (internal vs supplier)
- [ ] Upload & view photos/videos in PO Gallery
- [ ] Receive escalation alert when Critical Path ignored 8hrs

### Phase 5 Core Flows  
- [ ] Integrations page loads with usage quotas
- [ ] Add Smartsheet sync configuration
- [ ] Email inbox shows incoming emails
- [ ] Notification bell shows escalations
- [ ] Copy ingestion email address

---

## 🐛 Bug Report Template

If you find issues, note:

```
**Issue**: [Brief description]
**Page**: [URL/Location]
**Role**: PM / Supplier
**Steps**: 
1. 
2. 
3. 
**Expected**: [What should happen]
**Actual**: [What happened]
**Screenshot**: [Attach if possible]
```
