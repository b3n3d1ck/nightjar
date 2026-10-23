# NIGHTJAR persistence layer

Assessment management backed by PostgreSQL. This document states exactly what is
implemented, what is only tested against `pg-mem`, and what still requires a real
database and authentication before it is safe for multi-user production use.

## Status

| Capability | Status |
|---|---|
| Schema + migration runner (`0001_init`) | Implemented, tested with pg-mem |
| Typed repository (projects/targets/scopes/assessments/findings/audit) | Implemented, tested with pg-mem |
| REST API over the repository | Implemented; gated on `DATABASE_URL` (503 otherwise) |
| Transaction **rollback** data semantics | **Not verifiable with pg-mem.** Verified only via `postgres.int.test.ts` against real Postgres (skipped unless `DATABASE_TEST_URL` is set) |
| Foreign-key enforcement / cascade | Defined in SQL + app-enforced on delete; FK/cascade verified only against real Postgres |
| **Authentication & multi-user access control** | **Not implemented.** The API is unauthenticated and single-workspace. Not safe for multi-user production. |
| UI wired to persistence | **Not yet.** `/scan`, `/analyze`, dashboard and history are unchanged (demo/localStorage, clearly labelled). |

## Data model

```
projects (id, name, created_at, updated_at)
  └─ targets      (id, project_id→projects, value, kind, UNIQUE(project_id,value))
  └─ scopes       (id, project_id→projects, authorization_ref, allowed_hosts jsonb,
                   categories jsonb, window_start, window_end)
  └─ assessments  (id, project_id→projects, target_id→targets, scope_id→scopes,
                   status, target_url, scanner_version, requests, duration_ms,
                   error, started_at, finished_at, created_at, updated_at)
        └─ findings (id, assessment_id→assessments, finding_key, title, severity,
                     confidence, category, location, observation, risk,
                     recommendation, evidence jsonb, refs jsonb, scanner_version,
                     status, UNIQUE(assessment_id, finding_key))
audit_events (id, project_id→projects SET NULL, assessment_id→assessments SET NULL,
              action, detail jsonb, created_at)   -- append-only
```

- **Deletion:** `projects` cascade to targets/scopes/assessments, and assessments
  cascade to findings. `deleteProject` also performs the deletions explicitly in
  a transaction (so behaviour is deterministic regardless of client), and nulls
  the audit references so the **audit trail survives** (a `project.deleted` event
  is recorded).
- **Idempotency:** findings upsert on `(assessment_id, finding_key)`, so
  re-persisting a scan updates in place and never duplicates.
- **Secret handling:** findings store the scanner's already-masked evidence;
  cookies/authorization headers/unredacted secrets are not persisted. Audit
  `detail` holds only counts/ids/status, never evidence bodies.

## Commands

```bash
# apply migrations to DATABASE_URL
DATABASE_URL=postgres://… npm run db:migrate
# roll back the last migration
DATABASE_URL=postgres://… npm run db:rollback

# unit/integration tests (pg-mem — no DB needed)
npm test

# real-Postgres verification (transaction rollback + FK)
docker run --rm -e POSTGRES_PASSWORD=pw -p 5433:5432 postgres:16
DATABASE_TEST_URL=postgres://postgres:pw@localhost:5433/postgres npm test
```

## API (all gated on `DATABASE_URL`; 503 when unset)

| Method | Path | Purpose |
|---|---|---|
| POST/GET | `/api/projects` | create / list projects |
| GET/POST | `/api/projects/:id/targets` | list / add targets |
| POST | `/api/assessments` | create an assessment, run the guarded scanner, persist result |
| GET | `/api/assessments/:id` | assessment + persisted findings |
| GET | `/api/assessments/:id/audit` | audit events |
| PATCH | `/api/findings/:id` | update finding lifecycle status |

Inputs are validated at the boundary (400 on bad input, 404 on missing records).
Errors never leak connection strings or stack traces (generic 500). `POST
/api/assessments` reuses the existing scanner's authorization gate and SSRF /
scope / redirect protections — it does not introduce arbitrary URL scanning.

## Security limitations (read before deploying)

- **No authentication or authorization.** Any caller who can reach the API can
  create/read/modify records. This is a single-workspace developer API, **not**
  multi-tenant and **not** production-ready for multiple users. Adding auth +
  per-workspace isolation is the next required step.
- `pg-mem` proves schema/CRUD/constraints/idempotency/pagination/audit logic; it
  does **not** prove transaction, concurrency, or FK semantics — those need real
  Postgres (commands above).

## Production activation (not verified here — no database was supplied)

1. Provision a Postgres database (e.g. Neon / Supabase / Vercel Postgres).
2. Set `DATABASE_URL` (and `DATABASE_SSL`/`DATABASE_POOL_MAX` as needed) in the
   deployment environment — never in the repo.
3. Run `npm run db:migrate` against it.
4. Add authentication and workspace authorization before exposing the API to
   multiple users.

None of these steps have been executed in this sprint because no production
database or credentials were supplied.
