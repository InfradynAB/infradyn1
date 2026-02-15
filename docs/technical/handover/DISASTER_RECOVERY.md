# Disaster Recovery & Backup Runbook

This runbook defines how Infradyn handles database recovery and business continuity at production scale.

---

## 1) Recovery Targets (SLOs)

For enterprise tenants and high user concurrency, use these minimum targets:

- **RPO (data loss tolerance):** 15 minutes
- **RTO (service restore time):** 60 minutes for critical flows, 4 hours for full analytics/export workflows

Service priorities:

1. **P0 (Critical):** Authentication, org/project access, PO/invoice read/write
2. **P1 (High):** Dashboard APIs, supplier workflows, notifications
3. **P2 (Normal):** Exports, historical analytics, non-critical cron outputs

---

## 2) What Neon Covers vs What We Own

### Neon covers

- Point-in-time recovery (Instant Restore / PITR) within configured restore window
- Branch-based restore and fast rewind to a historical state
- Managed Postgres infrastructure, storage history retention by plan

### We still own

- Long-term backup retention and compliance evidence
- Independent logical backups (outside Neon control plane)
- Recovery of non-database assets (S3 files, secrets, app config)
- Restore drills, incident runbooks, and operator readiness

---

## 3) Backup Strategy (Required)

Use a **hybrid** model: Neon PITR + independent logical backups.

### A. PITR configuration (Neon)

- Set restore window to meet target RPO:
  - Minimum recommended for production: **7 days**
  - If compliance requires: **30 days** (plan permitting)
- Document chosen restore window in incident docs and onboarding.

### B. Logical backups (`pg_dump`)

- **Nightly full logical backup** of production database
- Store encrypted dumps in dedicated backup bucket (different credentials from app runtime)
- Keep retention:
  - Daily backups: 35 days
  - Weekly backups: 12 weeks
  - Monthly backups: 12 months (or compliance requirement)

### C. Non-DB assets

- Backup object storage metadata + files (documents, evidence, uploads)
- Ensure mapping tables and file keys are included in DB backup verification
- Keep infra/app config snapshots (.env inventory, Vercel env exports, cron config)

---

## 4) Backup Schedule

- **Every 15 minutes:** PITR history continuously maintained by Neon
- **Daily 01:00 UTC:** `pg_dump` full backup to secure bucket
- **Daily 01:30 UTC:** Backup integrity check (artifact exists, checksum valid, readable)
- **Weekly Sunday 02:00 UTC:** Restore rehearsal to staging from latest backup
- **Monthly (first business day):** Full DR simulation (DB restore + app validation)

---

## 5) Restore Procedures

## Scenario A: Accidental data deletion or bad migration (within restore window)

1. Freeze writes (maintenance mode / disable mutating routes if needed).
2. Create a restore branch in Neon at timestamp just before incident.
3. Validate branch data integrity (row counts, critical queries).
4. Promote restored branch path according to Neon best-practice workflow.
5. Run smoke tests for P0/P1 flows.
6. Re-enable writes.

Target: **RTO <= 60 minutes**.

## Scenario B: Restore outside PITR window or platform-level issue

1. Provision recovery database.
2. Restore latest logical backup with `pg_restore`.
3. Replay acceptable delta from business logs (if available).
4. Reconnect app and run migration/state checks.
5. Validate critical business paths and reopen traffic.

Target: **RTO <= 4 hours** for critical operations.

---

## 6) Restore Validation Checklist

After every restore (real incident or drill), verify:

- User sign-in and org switching work
- Project listing and procurement read/write work
- Invoice creation/approval reads and writes work
- Dashboard analytics endpoint returns valid payload
- File links resolve for latest documents
- Cron endpoints can execute without fatal errors

Record result in incident log with timestamp, operator, restore source, and duration.

---



Escalation timing:

- T+0: Alert acknowledged
- T+10 min: Recovery path selected (PITR vs logical restore)
- T+30 min: Status update to stakeholders
- T+60 min: P0 service recovery target checkpoint

---

## 8) Minimum Tooling Requirements

- Monitoring and alerting for:
  - DB errors / saturation
  - API 5xx and latency SLO breaches
  - Backup job failures
  - Restore drill failures
- Backup job must fail loudly (pager/email/Slack)
- Access to backup bucket must use least-privilege IAM and separate keys

---

## 9) Immediate Action Plan (This Repo)

1. Confirm Neon restore window is set to at least 7 days.
2. Enable automated nightly `pg_dump` job (`.github/workflows/nightly-db-backup.yml`).
3. Enable weekly automated restore drill (`.github/workflows/weekly-restore-drill.yml`).
4. Add DR verification script for P0 API checks.
5. Add incident template for DR events in ops docs.

---

## 10) Commands Reference

Example backup command:

```bash
pg_dump "$POSTGRES_URL" -Fc -f infradyn-prod-$(date +%F).dump
```

Example restore command:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges -d "$RESTORE_DB_URL" infradyn-prod-YYYY-MM-DD.dump
```

