# Contributing to NIGHTJAR

Thanks for helping. The project aims to be a genuinely useful, honest security
tool — evidence over theatre.

## Setup

```bash
npm install
npm run dev          # http://localhost:3000
```

## Before you open a PR

Run the same checks CI runs — all must pass:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

## Ground rules

- **Keep the scanner passive and honest.** New checks must define a request
  method, timeout, expected result, severity rationale, evidence format, and
  remediation. Label unverified matches as `potential`, not `confirmed`. Never
  invent CVE IDs or CVSS scores.
- **Never weaken the SSRF/scope guards.** Any change to `src/lib/scan/engine.ts`
  that touches request or redirect handling must keep the private-address and
  scope checks, and should add a regression test.
- **No offensive capabilities.** No deployable webshells, exploitation,
  credential harvesting, brute-force, or detection evasion.
- **Add tests** for new detectors and for any bug you fix.
- **No secrets in the repo.** Use `.env.example` with placeholders.

## Where things live

- `src/lib/scan/` — live passive scan engine, types, and tests.
- `src/lib/analyze/` — offline URL/phishing analysis.
- `src/app/(app)/` — workspace pages; `src/app/api/` — route handlers.
- `src/components/` — UI. `src/lib/` — shared logic and design tokens live in
  `src/app/globals.css`.
