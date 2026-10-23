# Security policy

## Scope and intent

NIGHTJAR is a tool for **authorized** application-security work: reviewing your
own sites, assessments you have written permission to perform, defensive
operations, and learning. It does not grant authorization and must not be used
against systems you do not own or have permission to test.

## How the live scanner protects itself and others

The live scanner (`/scan`, `POST /api/scan`) is **passive** (GET only, no
brute-force, no exploitation) and enforces scope in backend code, not just in the
UI:

- **Authorization gate** — the API refuses to run without an explicit
  `authorized: true` confirmation.
- **SSRF guard** — the target host is resolved and every resulting address is
  checked against a parsed global-routability policy (`src/lib/scan/net.ts`)
  covering the IANA special-purpose registries: loopback, RFC 1918 private,
  CGNAT, link-local / cloud-metadata (169.254/16), benchmarking, documentation,
  multicast and reserved ranges, for IPv4, IPv6, IPv4-mapped/compatible IPv6 and
  NAT64-embedded IPv4. The policy **fails closed**: an address that does not
  parse is rejected. Obfuscated numeric host literals (`0x7f000001`,
  `2130706433`, `0177.0.0.1`) are decoded and rejected before any request.
- **Redirect re-validation** — redirects are never followed automatically. Each
  hop is re-resolved and re-checked against the SSRF guard, and a redirect that
  leaves the authorized scope (a different registrable host) is reported and not
  followed. This closes redirect-based SSRF and scope-escape.
- **Rate limiting** — a best-effort per-IP limit on the scan endpoint. The
  client IP is taken from `x-real-ip` (which Vercel sets to the connecting
  client and overwrites), falling back to `x-forwarded-for`. **Limitations:**
  the in-memory counter is per serverless instance (not global), and off-Vercel
  the forwarded headers are spoofable without a verified trusted-proxy chain. A
  durable, global limit needs a shared store (e.g. Upstash/Redis) — the
  environment variables are reserved in `.env.example`.
- **Secret redaction** — evidence snippets mask password/token/base64-like
  values before they are shown or exported.

### Known limitation

DNS **rebinding** (the host resolving to a public address during the guard check
and to a private address at fetch time) is only partially mitigated, because the
platform `fetch` cannot be pinned to a specific resolved IP. For assessments of
internal networks, run the engine in a controlled environment with an explicit
allow-policy rather than exposing it publicly.

## Persistence API — authentication status

The assessment-management API (`/api/projects`, `/api/assessments`, …) is
**unauthenticated and single-workspace**. Any caller who can reach it can
create, read, and modify records. It is a developer/self-hosted API, **not**
multi-tenant and **not** safe to expose publicly for multiple users until
authentication and per-workspace authorization are added. It is gated on
`DATABASE_URL` and returns 503 when no database is configured — it never falls
back to demo data. Errors are mapped to generic responses so connection strings
and driver internals never reach the client. See `docs/DATABASE.md`.

## Reporting a vulnerability

If you find a security issue in NIGHTJAR itself, please open a private report via
GitHub Security Advisories on the repository, or open an issue describing the
impact without a working exploit. Please do not disclose publicly until a fix is
available. There is no bug-bounty program.
