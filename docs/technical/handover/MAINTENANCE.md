# Maintenance & Operations Guide

This document outlines standard procedures for maintaining the Infradyn codebase and database.

---

## 1. Database Migrations (Drizzle)

The project uses Drizzle ORM for schema management.

### Generate Migrations
Run this when you modify `db/schema.ts`:
```bash
pnpm db:generate
```

### Push Schema (Development)
Directly pushes changes to the database (use for fast dev cycles):
```bash
pnpm db:push
```

### Run Migrations (Production/Staging)
```bash
pnpm db:migrate
```

---

## 2. Seeding & Initialization

### Seed Default Configs
The system requires certain global configurations to be present in the `system_config` table.
```bash
pnpm db:seed
```
*(This triggers `src/lib/actions/config-engine.ts -> seedDefaultConfigs()`)*

---

## 3. Testing

The project uses **Vitest** for unit and integration tests.

### Run All Tests
```bash
pnpm test
```

### Watch Mode
```bash
pnpm test:watch
```

---

## 4. Deployment Check-list

Before merging to `main` for production:
1. **Schema Check**: Ensure `pnpm db:generate` has been run and migration files are committed.
2. **Env Check**: Verify any new environment variables correspond to `.env.example`.
3. **Build Check**: Run `pnpm build` locally to catch any SSR or TypeScript errors.
4. **Permissions**: Review `src/lib/rbac.ts` if any new routes were added.

---

## 5. Troubleshooting Crons

If automated forecasting or chasing isn't working:
1. Check the Vercel "Logs" tab for `GET /api/cron/forecast`.
2. Ensure the `CRON_SECRET` header is being sent correctly by Vercel.
3. Manually trigger the endpoint with the secret:
   `GET /api/cron/forecast?secret=YOUR_CRON_SECRET`

---

## 6. Disaster Recovery & Backups

Use the dedicated DR runbook for database recovery procedures, ownership, and restore drills:

- `docs/technical/handover/DISASTER_RECOVERY.md`

Minimum operational requirements:

1. Verify Neon restore window is set appropriately for production RPO.
2. Run nightly logical backups (`pg_dump`) to independent storage.
3. Run weekly restore drills into staging and record outcomes.
4. Alert on backup or restore drill failures.

Automation workflows included in repo:

- `.github/workflows/nightly-db-backup.yml`
- `.github/workflows/weekly-restore-drill.yml`

Manual trigger path:

1. GitHub → Actions → select workflow.
2. Click **Run workflow**.
3. Verify artifact upload + successful completion logs.
