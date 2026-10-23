# NIGHTJAR

A workspace for **reviewing web security findings** — the raw observation, why it
matters, and the fix — kept inside an authorized scope. It is the review layer
that sits on top of command-line scanning engines like
[ghostmap](https://github.com/b3n3d1ck/ghostmap) and
[shellhound](https://github.com/b3n3d1ck/shellhound).

> This build ships the interface running on **clearly-labelled demonstration
> data**. No live scanning backend is connected, and no metric here is inflated.

## Stack

- Next.js 16 (App Router, React 19, mostly Server Components)
- TypeScript (strict)
- Tailwind CSS v4 — design tokens live in `src/app/globals.css`
- lucide-react for icons

## What's implemented

- **Public landing** (`/`) — what it does, how it fits together, scope.
- **Live passive scan** (`/scan` + `POST /api/scan`) — enter a URL you are
  authorized to test and the server performs a passive audit (GET only): host
  info (IP, reverse DNS, server, tech), missing security headers, bare cookies,
  version disclosure, exposed sensitive files (signature-matched, secrets
  masked), directory listing, login/upload/webshell detection, and HTTP→HTTPS
  check. Findings carry a stable ID, **confidence** (confirmed / potential /
  informational), standards references, and a scanner version; the run records
  notes about skipped or partial checks. Export as **Markdown or JSON**.
  - **Server-side scope & SSRF defence:** the request is refused without an
    explicit authorization confirmation (403); the target host and every
    resolved address are checked against private/loopback/link-local/metadata
    ranges (IPv4 + IPv4-mapped IPv6); **redirects are followed manually and
    re-validated per hop**, aborting on private destinations and refusing to
    leave the authorized scope; a best-effort per-IP rate limit applies. See
    `SECURITY.md`.
- **Offline URL / phishing analysis** (`/analyze`) — pure, no-network inspection
  of a link for userinfo obfuscation (`user@host`), punycode/IDN homoglyphs,
  raw-IP hosts, brand terms used away from the real domain, risky TLDs, and deep
  subdomain nesting. Indicators, not verdicts.
- **Workspace** — a distinct app shell with responsive navigation (persistent
  sidebar on desktop, drawer on mobile):
  - `/dashboard` — posture overview, remediation progress, severity chart
  - `/findings` — searchable, filterable table (cards on mobile) with a detail
    panel, status you can set (persisted), and Markdown export
  - `/scans` — demo run history
  - `/learn` — plain explanations of each weakness class
  - `/settings` — preferences persisted to `localStorage` (no server)
- **Command palette** (⌘K / Ctrl+K) — jump to any page or finding.

## Design system

Dark-first, charcoal foundation, with a muted deep-red accent reserved for
primary actions, active states, and critical risk. Severity always pairs a hue
with an icon and a label, so it never relies on colour alone. Tokens for colour,
type, spacing, radius, shadow, focus, motion, and z-index are defined as CSS
custom properties in `src/app/globals.css` and mapped into Tailwind via
`@theme`. Motion is CSS-only and honours `prefers-reduced-motion`.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (also type-checks)
npm run lint
npm test        # unit + component tests (Vitest)
```

## Verification run

- **Unit + component tests** — 43 tests across 8 files (Vitest + Testing
  Library): formatting, report generation, demo-data integrity, the status
  store, UI primitives, the command palette, the scan engine's SSRF
  classification / secret masking / same-host / **redirect-scope** logic, and
  the URL/phishing analyzer.
- **Scan API** — authorization guard (403), SSRF guard (private/loopback/
  metadata → 400), and rate limit (429) verified against the running endpoint.
  The live fetch runs on the deployment; it is not exercised in a sandbox
  without outbound DNS. End-to-end redirect-follow behaviour needs a network
  fixture (noted in `docs/AUDIT.md`); its building blocks are unit-tested.
- **CI** — `.github/workflows/ci.yml` runs lint, type-check, tests, and build on
  every push and PR.

## Architecture & limitations

NIGHTJAR deploys to Vercel as a single Next.js app; the scanner runs in a
serverless route handler (Node runtime). This keeps the stack small but bounds
what the scanner can do: no long-running crawls, background workers, or
filesystem inspection of a remote host (the `ghostmap`/`shellhound` CLIs cover
the filesystem case). Workspace state (finding status, settings) is stored
per-browser in `localStorage` and the dashboard/history use clearly-labelled
demo data — there is no shared multi-user database yet. See `docs/AUDIT.md` for
the full audit and the roadmap for durable persistence and authentication.
- **Lint & types** — ESLint and `tsc --noEmit` both clean.
- **Build** — production build prerenders all seven routes as static.
- **Layout** — checked with a headless browser across widths 320 / 360 / 768 /
  1280 / 1920 on every route: no horizontal overflow, no console errors
  (30 checks). This was viewport (browser-emulation) testing, not physical-device
  testing. Screenshots of the running app are in `docs/screens/`.

## Scope

NIGHTJAR is a tool for people with authorization to test a system. It does not
grant any. Run assessments only against systems you own or are permitted to test.
