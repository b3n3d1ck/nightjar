# NIGHTJAR engineering audit

A working document. Findings are ordered by priority; each notes the fix status.

## Sprint A — persistent assessment management

- **Implemented:** a PostgreSQL persistence layer — versioned schema +
  migration runner (`src/lib/db/migrations.ts`, `migrate.ts`), a connection pool
  gated on `DATABASE_URL` (`pool.ts`), a typed repository with parameterized SQL,
  transactions, idempotent finding upserts, pagination, and append-only audit
  events (`repository.ts`), and a REST API (`/api/projects`, `/api/assessments`,
  `/api/findings`, …) that reuses the existing guarded scanner. Full data model
  and commands in `docs/DATABASE.md`.
- **Tested with pg-mem** (12 cases): migrations idempotency, CRUD, unique
  constraints, status transitions + audit, idempotent finding persistence,
  filtering/pagination, finding-status updates, deletion with audit survival,
  and transaction control-flow (BEGIN→ROLLBACK issued on error).
- **pg-mem limitations found and handled honestly:** pg-mem's pg adapter does
  not emulate `BEGIN/ROLLBACK` data semantics and does not fully enforce FKs, and
  it trips on re-parsing `CREATE TABLE IF NOT EXISTS` constraints. The migration
  runner was adjusted (probe-then-create), and transaction-rollback + FK/cascade
  are verified against **real Postgres** in `postgres.int.test.ts` (skipped
  unless `DATABASE_TEST_URL` is set — reported as skipped, never faked).
- **Not done (needs infra/approval):** authentication + multi-user authorization
  (the API is single-workspace/unauthenticated), UI wiring to persistence, and
  production verification against a real provisioned database (none was supplied).

## Round 3 (address policy & docs)

- **Weak IP classification.** `ipIsPrivate` used string prefixes and missed many
  reserved ranges (TEST-NET, benchmarking, multicast, reserved/future, several
  IPv6 specials) and some representations. **Fixed:** replaced with a parsed
  global-routability policy (`src/lib/scan/net.ts`) across the IANA
  special-purpose registries for IPv4, IPv6, IPv4-mapped/compatible, and NAT64,
  **failing closed** on unparseable input. Covered by 10 dedicated test cases
  (`net.test.ts`) exercising dozens of addresses across every range.
- **Oversized responses.** Confirmed the stream is capped at `MAX_BODY` and the
  reader cancelled; added a regression test proving a 10 MB stream is cut near
  the ~500 KB cap.
- **Client IP / rate limiting.** Switched to `x-real-ip` (Vercel-set) with an
  `x-forwarded-for` fallback, and documented the per-instance + trusted-proxy
  limitations in `SECURITY.md`.
- **Docs reconciliation.** `README.md` now has a precise real/demo/not-implemented
  status table; live results and demo data are never mixed.

### Not done this round (needs infrastructure/approval — exact blockers)

- **Durable assessment management + auth** (projects, targets, scopes, findings,
  audit events): requires a provisioned database (`DATABASE_URL`) and an auth
  provider. The persistence layer can be built and tested now with `pg-mem`;
  activation needs the real database. No fake in-memory "durable" store was
  added.
- **Ghostmap / Shellhound import + CLI execution:** needs a separate worker
  (serverless routes cannot host long-running processes). The import-adapter
  contract can be built against sample output; running the CLIs needs the worker.

## Round 2 (scanner v1.2.0)

- **Confirmed bug — `Set-Cookie` collapse.** `Headers.get("set-cookie")` joins
  all cookies into one string, so one cookie carrying `Secure; HttpOnly` masked
  another cookie's missing attributes. **Fixed:** cookies are read with
  `getSetCookie()` and analyzed individually; regression test proves a bare
  cookie is still flagged when a secure cookie is also present.
- **Engine was not testable.** Network and DNS were hard-wired, so SSRF/redirect
  behaviour could not be tested without a live target. **Fixed:** the engine is
  dependency-injected (`resolve`, `fetchImpl`, `now`); 9 deterministic
  integration tests now cover the security-critical paths with no network.
- **Scope enforced only by a checkbox.** **Fixed:** a real `ScanScope`
  (authorization reference, also-allowed hosts, check categories, assessment
  window) is enforced server-side — redirects cannot leave the allowed host set,
  out-of-window scans are refused, and disabled categories are skipped and noted.
- **Obfuscated numeric SSRF hosts** (`0x7f000001`, `2130706433`, `0177.0.0.1`)
  are now decoded and rejected before any request.
- **CI audit honesty.** Replaced `npm audit … || true` with a **gating**
  production-dependency audit plus a clearly non-blocking dev advisory.

## Critical

- **SSRF via followed redirects** — `src/lib/scan/engine.ts`. The HTTP helper
  followed redirects automatically (`redirect: "follow"`), so a public target
  could 3xx-redirect to a private/metadata address and the scanner would fetch
  it, bypassing the SSRF guard.
  **Fixed:** all requests now use `redirect: "manual"`; `getFollow` revalidates
  every hop with the SSRF guard and a scope check, aborts on private
  destinations, and does not follow off-scope redirects. Regression tests cover
  the private-address classification (`ipIsPrivate`) and scope decision
  (`sameScope`). _Remaining:_ DNS rebinding is only partially mitigated (see
  SECURITY.md) because platform `fetch` cannot be pinned to an IP.

## High

- **Scope enforced only by a checkbox** — scope now lives in backend code: the
  API requires `authorized: true` (403 otherwise), and redirects cannot leave the
  registrable host. **Fixed.**
- **No rate limiting on the scan endpoint** — added a best-effort per-IP limit
  (429) and a URL length bound. **Fixed** (best-effort on serverless; durable
  limiter noted in `.env.example`).

## Medium

- **Thin finding model** — findings lacked confidence, references, a scanner
  version, and stable IDs. **Fixed:** added `confidence`
  (confirmed/potential/informational), standards references, `scannerVersion`,
  deterministic SHA1-based IDs, duplicate detection, and run `notes` (skipped /
  partial checks, off-scope redirects).
- **Only Markdown export** — **Fixed:** added JSON export; both redact secrets.
- **No phishing/URL analysis** — **Added:** offline `/analyze` (userinfo
  obfuscation, punycode/IDN, raw-IP host, brand-away-from-domain, risky TLD,
  deep subdomains), with unit tests. No network, no SSRF surface.
- **No CI** — **Added:** `.github/workflows/ci.yml` runs lint, type-check, tests,
  build, and an advisory dependency audit.

## Low

- Removed experimental Next flags (`cacheComponents`, `partialPrefetching`) for
  predictable production behaviour. **Fixed.**
- Added security response headers (CSP, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy, HSTS) — the app now passes its own scan.
  **Fixed.**
- Added SECURITY.md, CONTRIBUTING.md, `.env.example`, and this audit. **Fixed.**

## Deferred — require infrastructure/approval (not faked)

- **Durable multi-user persistence & authentication.** The dashboard and finding
  status use labelled demo data plus per-browser `localStorage`; this is stated
  in the UI, not presented as shared production data. Real multi-user storage
  needs a database (e.g. Postgres) with migrations, server-side auth, and
  per-user authorization — new infrastructure and credentials. `.env.example`
  reserves the variables.
- **Long-running / agent-based scanning** (deeper crawls, authenticated checks,
  filesystem/webshell inspection of a remote host) exceeds Vercel's serverless
  limits and cannot inspect a server's filesystem without an authorized agent.
  The command-line engines (ghostmap, shellhound) cover the filesystem case.
- **Reputation/WHOIS enrichment** for URL analysis is left optional and offline
  by default.
