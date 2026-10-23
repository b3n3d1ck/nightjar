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
  checked. Loopback, private (RFC 1918), link-local / cloud-metadata
  (169.254.0.0/16), CGNAT, and IPv6 ULA/link-local ranges are rejected, for both
  IPv4 and IPv4-mapped IPv6.
- **Redirect re-validation** — redirects are never followed automatically. Each
  hop is re-resolved and re-checked against the SSRF guard, and a redirect that
  leaves the authorized scope (a different registrable host) is reported and not
  followed. This closes redirect-based SSRF and scope-escape.
- **Rate limiting** — a best-effort per-IP limit on the scan endpoint.
- **Secret redaction** — evidence snippets mask password/token/base64-like
  values before they are shown or exported.

### Known limitation

DNS **rebinding** (the host resolving to a public address during the guard check
and to a private address at fetch time) is only partially mitigated, because the
platform `fetch` cannot be pinned to a specific resolved IP. For assessments of
internal networks, run the engine in a controlled environment with an explicit
allow-policy rather than exposing it publicly.

## Reporting a vulnerability

If you find a security issue in NIGHTJAR itself, please open a private report via
GitHub Security Advisories on the repository, or open an issue describing the
impact without a working exploit. Please do not disclose publicly until a fix is
available. There is no bug-bounty program.
