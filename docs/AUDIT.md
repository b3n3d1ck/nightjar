# NIGHTJAR engineering audit

A working document. Findings are ordered by priority; each notes the fix status.

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
