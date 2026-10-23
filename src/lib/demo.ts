import type { Finding, Scan, SeverityCounts } from "./types";

/**
 * Demonstration data. This is NOT a live scan. Every record is labelled
 * `demo: true` and the UI surfaces that clearly. No metric here is inflated
 * to look impressive — the numbers describe this fixed sample only.
 */

export const DEMO_FINDINGS: Finding[] = [
  {
    id: "NJ-1042",
    title: "Exposed .env file readable over HTTP",
    severity: "critical",
    target: "app.example.test",
    category: "Sensitive data exposure",
    status: "open",
    firstSeen: "2026-02-18",
    lastSeen: "2026-02-20",
    observation:
      "GET /.env returned 200 with a body matching APP_KEY and DB_PASSWORD patterns.",
    risk: "Application and database credentials are downloadable by anyone, which can lead to full compromise of the app and its data store.",
    recommendation:
      "Remove .env from the web root, block dotfiles at the server, and rotate every credential it contained.",
    evidence: {
      location: "https://app.example.test/.env",
      request: "GET /.env HTTP/1.1",
      response: "200 OK · text/plain · 412 B",
      snippet: "APP_KEY=«redacted»\nDB_PASSWORD=«redacted»",
    },
    demo: true,
  },
  {
    id: "NJ-1039",
    title: "Session cookie missing HttpOnly and Secure",
    severity: "high",
    target: "app.example.test",
    category: "Session management",
    status: "reviewing",
    firstSeen: "2026-02-18",
    lastSeen: "2026-02-20",
    observation:
      "Set-Cookie for the session identifier was returned without HttpOnly, Secure, or SameSite attributes.",
    risk: "The session cookie is reachable from JavaScript and may be sent over plaintext, widening the impact of XSS and network interception.",
    recommendation:
      "Set Secure, HttpOnly, and SameSite=Lax on the session cookie and serve the app only over HTTPS.",
    evidence: {
      location: "https://app.example.test/login",
      response: "Set-Cookie: SESSID=«redacted»; Path=/",
    },
    demo: true,
  },
  {
    id: "NJ-1036",
    title: "Page content matches a known webshell interface",
    severity: "critical",
    target: "app.example.test",
    category: "Malware / backdoor",
    status: "open",
    firstSeen: "2026-02-20",
    lastSeen: "2026-02-20",
    observation:
      "A page reached during the crawl returned HTML whose markers match a known webshell UI family.",
    risk: "If genuine, an attacker already has code execution on the host. This is a containment and incident-response situation, not a configuration fix.",
    recommendation:
      "Do not open the page in a browser. Isolate the file, review access logs for its first hit, and begin incident response.",
    evidence: {
      location: "https://app.example.test/tools/x7g9.php",
      response: "200 OK · text/html",
      snippet: "<title>c99shell</title> … $auth_pass=«redacted»",
    },
    demo: true,
  },
  {
    id: "NJ-1031",
    title: "Content-Security-Policy header absent",
    severity: "medium",
    target: "www.example.test",
    category: "Security headers",
    status: "open",
    firstSeen: "2026-02-15",
    lastSeen: "2026-02-20",
    observation: "No Content-Security-Policy header was present on any sampled response.",
    risk: "Without a CSP, injected scripts face no policy restriction, so an XSS flaw escalates more easily to full account takeover.",
    recommendation:
      "Introduce a CSP starting from default-src 'self' and loosen it per real dependency.",
    evidence: { location: "https://www.example.test/" },
    demo: true,
  },
  {
    id: "NJ-1028",
    title: "Server version disclosed in response header",
    severity: "low",
    target: "www.example.test",
    category: "Information disclosure",
    status: "accepted",
    firstSeen: "2026-02-15",
    lastSeen: "2026-02-20",
    observation: "The Server header advertised a specific web server build.",
    risk: "Version disclosure lets an attacker map known vulnerabilities faster. Low on its own; useful during reconnaissance.",
    recommendation: "Suppress the version (server_tokens off / ServerTokens Prod).",
    evidence: {
      location: "https://www.example.test/",
      response: "Server: nginx/1.18.0 (Ubuntu)",
    },
    demo: true,
  },
  {
    id: "NJ-1024",
    title: "Directory listing enabled on uploads path",
    severity: "medium",
    target: "app.example.test",
    category: "Misconfiguration",
    status: "remediated",
    firstSeen: "2026-02-10",
    lastSeen: "2026-02-14",
    observation: "The /uploads/ path returned an auto-generated index of files.",
    risk: "Visitors can enumerate uploaded files directly, exposing material that was meant to be referenced only through the app.",
    recommendation: "Disable auto-index (autoindex off / Options -Indexes).",
    evidence: {
      location: "https://app.example.test/uploads/",
      response: "200 OK · Index of /uploads",
    },
    demo: true,
  },
  {
    id: "NJ-1019",
    title: "File upload form without server-side type checks observed",
    severity: "high",
    target: "app.example.test",
    category: "Upload handling",
    status: "reviewing",
    firstSeen: "2026-02-12",
    lastSeen: "2026-02-20",
    observation:
      "A multipart upload form was found; client-side accept was the only visible restriction.",
    risk: "If the server trusts the extension or MIME type sent by the client, this is a common path for planting a webshell.",
    recommendation:
      "Validate uploads by content (magic bytes), store outside the web root, and disable script execution in the upload directory.",
    evidence: { location: "https://app.example.test/account/avatar" },
    demo: true,
  },
  {
    id: "NJ-1011",
    title: "HTTP does not redirect to HTTPS",
    severity: "low",
    target: "legacy.example.test",
    category: "Transport security",
    status: "open",
    firstSeen: "2026-02-08",
    lastSeen: "2026-02-20",
    observation: "http:// served a 200 response instead of redirecting to https://.",
    risk: "Traffic can be read or modified on the network before any HTTPS upgrade happens.",
    recommendation: "Force a 301 redirect to HTTPS and enable HSTS.",
    evidence: {
      location: "http://legacy.example.test/",
      response: "200 OK (no redirect)",
    },
    demo: true,
  },
];

export const DEMO_SCANS: Scan[] = [
  {
    id: "scan-0241",
    target: "app.example.test",
    startedAt: "2026-02-20T09:12:00Z",
    finishedAt: "2026-02-20T09:14:38Z",
    status: "completed",
    counts: { critical: 2, high: 2, medium: 1, low: 0, info: 3 },
    requests: 214,
    durationMs: 158000,
    demo: true,
  },
  {
    id: "scan-0237",
    target: "www.example.test",
    startedAt: "2026-02-20T08:40:00Z",
    finishedAt: "2026-02-20T08:41:12Z",
    status: "completed",
    counts: { critical: 0, high: 0, medium: 1, low: 1, info: 4 },
    requests: 96,
    durationMs: 72000,
    demo: true,
  },
  {
    id: "scan-0230",
    target: "legacy.example.test",
    startedAt: "2026-02-19T22:05:00Z",
    finishedAt: "2026-02-19T22:06:03Z",
    status: "completed",
    counts: { critical: 0, high: 0, medium: 0, low: 1, info: 2 },
    requests: 54,
    durationMs: 63000,
    demo: true,
  },
  {
    id: "scan-0228",
    target: "staging.example.test",
    startedAt: "2026-02-19T18:30:00Z",
    status: "failed",
    counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    requests: 3,
    durationMs: 9000,
    demo: true,
  },
];

export function totalCounts(scans: Scan[]): SeverityCounts {
  return scans.reduce<SeverityCounts>(
    (acc, s) => ({
      critical: acc.critical + s.counts.critical,
      high: acc.high + s.counts.high,
      medium: acc.medium + s.counts.medium,
      low: acc.low + s.counts.low,
      info: acc.info + s.counts.info,
    }),
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  );
}
