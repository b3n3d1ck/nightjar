import { lookup, reverse as dnsReverse } from "node:dns/promises";
import { createHash } from "node:crypto";
import { isDisallowedIp } from "./net";
import type { Severity } from "@/lib/types";
import type { Confidence, ScanFinding, ScanPath, ScanResult } from "./types";

/* ============================================================================
   Passive scan engine (server-side). GET only. No brute-force wordlists beyond
   a short fixed list of well-known sensitive files. Never follows the target
   into private address space (SSRF guard). This is the same class of check a
   public tool like securityheaders.com performs.
   ========================================================================== */

export const SCANNER_VERSION = "1.2.0";
const UA = `NIGHTJAR/${SCANNER_VERSION} (+passive security audit)`;
const PER_REQUEST_TIMEOUT = 6000;
const MAX_REQUESTS = 24;
const MAX_REDIRECTS = 4;
const MAX_BODY = 500_000;

export class ScanRejected extends Error {}

/**
 * Injectable I/O so the engine's security behaviour (SSRF, redirects, cookies,
 * oversized responses) is deterministically testable without touching the
 * network. Production uses the real DNS resolver and global fetch.
 */
export interface ScanDeps {
  resolve: (host: string) => Promise<string[]>;
  reverse: (ip: string) => Promise<string[]>;
  fetchImpl: typeof fetch;
  now: () => number;
}

// Reverse DNS is best-effort and must never block a scan: cap it with a timeout
// and swallow failures. (Without the cap, a slow PTR lookup can hang the run.)
async function boundedReverse(ip: string): Promise<string[]> {
  try {
    return await Promise.race([
      dnsReverse(ip),
      new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 2500)),
    ]);
  } catch {
    return [];
  }
}

const defaultDeps: ScanDeps = {
  resolve: async (host) => (await lookup(host, { all: true })).map((a) => a.address),
  reverse: boundedReverse,
  fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
  now: () => Date.now(),
};

/** Category keys the scope can enable/disable. */
export type CheckCategory =
  | "headers"
  | "cookies"
  | "tls"
  | "exposure"
  | "content"
  | "discovery";

export const ALL_CATEGORIES: CheckCategory[] = [
  "headers", "cookies", "tls", "exposure", "content", "discovery",
];

/** Server-enforced assessment scope. */
export interface ScanScope {
  /** extra in-scope hosts besides the target; redirects may not leave this set */
  allowedHosts?: string[];
  /** which check categories to run; omitted/empty = all */
  categories?: CheckCategory[];
  /** operator-supplied authorization reference, recorded in the result */
  authorizationRef?: string;
  /** assessment window; a scan outside it is refused */
  window?: { start?: string; end?: string };
}

export function sameScope(baseHostname: string, hostname: string): boolean {
  const norm = (h: string) => h.toLowerCase().replace(/^www\./, "");
  return norm(baseHostname) === norm(hostname);
}

// ---- SSRF guard -----------------------------------------------------------

/**
 * True when an address must not be connected to. Delegates to the parsed
 * global-routability policy in net.ts (IPv4/IPv6/mapped/NAT64/reserved,
 * fail-closed). Kept as a named export for existing call sites and tests.
 */
export function ipIsPrivate(ip: string): boolean {
  return isDisallowedIp(ip);
}

// Normalize obfuscated IPv4 literals (decimal 2130706433, hex 0x7f000001,
// 0177.0.0.1, etc.) to dotted form so they can't slip past the private check.
export function numericToIpv4(host: string): string | null {
  const h = host.replace(/^\[|\]$/g, "").trim().toLowerCase();
  const toDotted = (n: number) =>
    n >= 0 && n <= 0xffffffff
      ? [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".")
      : null;
  if (/^0x[0-9a-f]+$/.test(h)) return toDotted(parseInt(h, 16));
  if (/^\d+$/.test(h)) return toDotted(parseInt(h, 10));
  // dotted parts that use octal/hex, e.g. 0177.0.0.1 or 0x7f.0.0.1
  if (/^(0x[0-9a-f]+|\d+)(\.(0x[0-9a-f]+|\d+)){1,3}$/.test(h)) {
    const parts = h.split(".").map((p) =>
      p.startsWith("0x") ? parseInt(p, 16) : p.length > 1 && p.startsWith("0") ? parseInt(p, 8) : parseInt(p, 10),
    );
    if (parts.length === 4 && parts.every((p) => p >= 0 && p <= 255)) return parts.join(".");
  }
  return null;
}

async function assertPublicHost(host: string, resolve: ScanDeps["resolve"]): Promise<string[]> {
  const bare = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase();
  if (
    bare === "localhost" ||
    bare.endsWith(".localhost") ||
    bare.endsWith(".local") ||
    bare.endsWith(".internal") ||
    bare === "metadata.google.internal" ||
    bare === "0.0.0.0"
  ) {
    throw new ScanRejected("Target resolves to a non-public host.");
  }
  // reject obfuscated numeric literals that decode to private space
  const numeric = numericToIpv4(bare);
  if (numeric && ipIsPrivate(numeric)) {
    throw new ScanRejected("Target points to an internal/private address.");
  }
  let addrs: string[];
  try {
    addrs = await resolve(bare);
  } catch {
    throw new ScanRejected("Could not resolve the host.");
  }
  if (addrs.length === 0) throw new ScanRejected("Could not resolve the host.");
  if (addrs.some((a) => ipIsPrivate(a))) {
    throw new ScanRejected("Target points to an internal/private address.");
  }
  return addrs;
}

// ---- http -----------------------------------------------------------------

interface Resp {
  status: number;
  headers: Headers;
  body: string;
  ok: boolean;
  location: string | null;
  /** set when a redirect left the authorized scope and was NOT followed */
  offScope?: string;
}

// A single request. Redirects are NEVER followed automatically — the caller
// decides, after re-validating the destination. This is what closes the
// redirect-based SSRF / scope-escape hole.
async function get(url: string, fetchImpl: ScanDeps["fetchImpl"]): Promise<Resp | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PER_REQUEST_TIMEOUT);
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "*/*" },
    });
    const reader = res.body?.getReader();
    let body = "";
    if (reader) {
      const dec = new TextDecoder();
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        body += dec.decode(value, { stream: true });
        if (total >= MAX_BODY) {
          await reader.cancel();
          break;
        }
      }
    }
    return {
      status: res.status,
      headers: res.headers,
      body,
      ok: res.ok,
      location: res.headers.get("location"),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Follow redirects manually, re-validating every hop: the destination must
// resolve to a public address (SSRF guard) AND stay within the authorized
// scope. A redirect into private space aborts the scan; an off-scope redirect
// is reported and not followed.
async function getFollow(
  startUrl: string,
  bump: () => boolean,
  deps: ScanDeps,
  inScope: (hostname: string) => boolean,
): Promise<Resp | null> {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!bump()) return null;
    const r = await get(url, deps.fetchImpl);
    if (!r) return null;
    const isRedirect = r.status >= 300 && r.status < 400 && r.location;
    if (!isRedirect) return r;

    let next: URL;
    try {
      next = new URL(r.location!, url);
    } catch {
      return r;
    }
    if (next.protocol !== "http:" && next.protocol !== "https:") return r;
    if (!inScope(next.hostname)) {
      r.offScope = next.href;
      return r; // stop at the redirect; do not leave scope
    }
    await assertPublicHost(next.host, deps.resolve); // throws on private/internal
    url = next.href;
  }
  return null; // too many redirects
}

// ---- detectors ------------------------------------------------------------

const reTitle = /<title[^>]*>([\s\S]*?)<\/title>/i;
const reAttr = /(?:href|src)\s*=\s*["']([^"'#\s>]+)/gi;
const reLoc = /<loc>\s*([^<\s]+)/gi;
const reLogin = /<input[^>]+type=["']password["']|name=["']pass(?:word)?["']/i;
const reUpload = /type=["']file["']|enctype=["']multipart\/form-data/i;
const reDirList = /<title>\s*index of \/|>\s*Parent Directory\s*</i;
const reShell =
  /c99shell|r57shell|b374k|filesman|wso\s*\d|indoxploit|alfa team|p0wny|\$auth_pass|uname -a</i;
const reSecret =
  /(pass(?:word|wd)?|secret|api[_-]?key|token|auth_pass)\s*[=:]\s*['"]?[^'"\s,;)]{3,}/gi;

const REFERENCES: Record<string, string[]> = {
  "Security headers": [
    "https://owasp.org/www-project-secure-headers/",
    "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers",
  ],
  "Session management": [
    "https://owasp.org/www-community/controls/SecureCookieAttribute",
  ],
  "Information disclosure": [
    "https://owasp.org/www-project-web-security-testing-guide/",
  ],
  "Sensitive data exposure": [
    "https://owasp.org/Top10/A05_2021-Security_Misconfiguration/",
  ],
  "Transport security": [
    "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security",
  ],
  "Misconfiguration": [
    "https://owasp.org/Top10/A05_2021-Security_Misconfiguration/",
  ],
  "Malware / backdoor": [
    "https://owasp.org/www-community/attacks/Web_Shell",
  ],
  "Upload handling": [
    "https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload",
  ],
};

const SEC_HEADERS: { key: string; label: string; sev: Severity; fix: string }[] = [
  { key: "content-security-policy", label: "Content-Security-Policy", sev: "medium", fix: "Add a CSP, starting from default-src 'self'." },
  { key: "strict-transport-security", label: "Strict-Transport-Security", sev: "medium", fix: "Set Strict-Transport-Security: max-age=31536000; includeSubDomains." },
  { key: "x-frame-options", label: "X-Frame-Options", sev: "low", fix: "Set X-Frame-Options: SAMEORIGIN (or CSP frame-ancestors)." },
  { key: "x-content-type-options", label: "X-Content-Type-Options", sev: "low", fix: "Set X-Content-Type-Options: nosniff." },
  { key: "referrer-policy", label: "Referrer-Policy", sev: "low", fix: "Set Referrer-Policy: strict-origin-when-cross-origin." },
];

const SENSITIVE: { path: string; re: RegExp; title: string; risk: string }[] = [
  { path: "/.env", re: /APP_KEY|DB_(HOST|PASSWORD|DATABASE)|SECRET|MAIL_/i, title: "Exposed .env file", risk: "Application and database credentials are downloadable, which can lead to full compromise." },
  { path: "/.git/config", re: /\[core\]|\[remote/i, title: "Exposed .git/config", risk: "The source repository is downloadable, exposing code and history." },
  { path: "/.git/HEAD", re: /ref:\s*refs\//i, title: "Exposed .git directory", risk: "The git directory is reachable; the full source tree may be reconstructable." },
  { path: "/phpinfo.php", re: /phpinfo\(\)|PHP Version/i, title: "phpinfo() exposed", risk: "phpinfo leaks server configuration and paths useful to an attacker." },
  { path: "/.DS_Store", re: /Bud1|\x00\x00\x00/, title: ".DS_Store exposed", risk: "Directory contents can leak through the macOS index file." },
  { path: "/backup.sql", re: /CREATE TABLE|INSERT INTO/i, title: "Database dump exposed", risk: "A database dump is downloadable." },
];

export function mask(s: string): string {
  let out = s.replace(reSecret, (m) => {
    const i = m.search(/[=:]/);
    return i >= 0 ? m.slice(0, i + 1) + " «redacted»" : "«redacted»";
  });
  out = out.replace(/[A-Za-z0-9+/]{40,}={0,2}/g, "«blob»");
  out = out.replace(/\s+/g, " ").trim();
  return out.length > 200 ? out.slice(0, 200) + " …" : out;
}

export function sameHostPath(base: URL, ref: string): string | null {
  try {
    const low = ref.trim().toLowerCase();
    if (!ref || ["data:", "mailto:", "javascript:", "tel:", "#"].some((p) => low.startsWith(p)))
      return null;
    const u = new URL(ref, base);
    if (u.host !== base.host) return null;
    return u.pathname + (u.search || "");
  } catch {
    return null;
  }
}

function title(body: string): string | undefined {
  const m = body.match(reTitle);
  if (!m) return undefined;
  const t = m[1].replace(/\s+/g, " ").trim();
  return t ? (t.length > 70 ? t.slice(0, 70) + "…" : t) : undefined;
}

// Individual Set-Cookie headers. `Headers.get("set-cookie")` collapses multiple
// cookies into one string, which lets one cookie's attributes mask another's —
// getSetCookie() keeps them separate (Node 18.14+/undici, and the Fetch spec).
function getSetCookies(h: Headers): string[] {
  const anyH = h as Headers & { getSetCookie?: () => string[] };
  if (typeof anyH.getSetCookie === "function") return anyH.getSetCookie();
  const v = h.get("set-cookie");
  return v ? [v] : [];
}

function fingerprint(r: Resp): { server: string | null; tech: string[] } {
  const set = new Set<string>();
  const xp = r.headers.get("x-powered-by");
  if (xp) set.add(xp);
  const cookies = getSetCookies(r.headers).join("; ").toLowerCase();
  const cookieMap: Record<string, string> = {
    laravel_session: "Laravel", phpsessid: "PHP", "connect.sid": "Express/Node",
    jsessionid: "Java", csrftoken: "Django", ci_session: "CodeIgniter", wordpress_: "WordPress",
  };
  for (const [frag, t] of Object.entries(cookieMap)) if (cookies.includes(frag)) set.add(t);
  const body = r.body.toLowerCase();
  const bodyMap: Record<string, string> = {
    "/wp-content/": "WordPress", "__next_data__": "Next.js", "data-reactroot": "React",
    "ng-version": "Angular", "/_nuxt/": "Nuxt.js", "drupal-settings-json": "Drupal",
  };
  for (const [frag, t] of Object.entries(bodyMap)) if (body.includes(frag)) set.add(t);
  return { server: r.headers.get("server"), tech: [...set] };
}

// ---- main -----------------------------------------------------------------

export async function scan(
  rawUrl: string,
  opts: { scope?: ScanScope; deps?: Partial<ScanDeps> } = {},
): Promise<ScanResult> {
  const deps: ScanDeps = { ...defaultDeps, ...opts.deps };
  const scope = opts.scope ?? {};
  const started = deps.now();

  // assessment window enforcement
  const nowMs = deps.now();
  if (scope.window?.start && nowMs < Date.parse(scope.window.start)) {
    throw new ScanRejected("The assessment window has not started yet.");
  }
  if (scope.window?.end && nowMs > Date.parse(scope.window.end)) {
    throw new ScanRejected("The assessment window has closed.");
  }

  let base: URL;
  try {
    base = new URL(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`);
  } catch {
    throw new ScanRejected("That does not look like a valid URL.");
  }
  if (base.protocol !== "http:" && base.protocol !== "https:")
    throw new ScanRejected("Only http and https targets are supported.");
  base.hash = "";

  const ips = await assertPublicHost(base.host, deps.resolve);
  const reverseDns = await deps.reverse(ips[0]);

  // scope: which hosts a redirect may reach, and which categories run
  const allowed = new Set(
    (scope.allowedHosts ?? []).map((h) => h.toLowerCase().replace(/^www\./, "")),
  );
  const inScope = (hostname: string) =>
    sameScope(base.hostname, hostname) ||
    allowed.has(hostname.toLowerCase().replace(/^www\./, ""));
  const selected = new Set<CheckCategory>(
    scope.categories && scope.categories.length ? scope.categories : ALL_CATEGORIES,
  );
  const runCat = (c: CheckCategory) => selected.has(c);

  let requests = 0;
  const findings: ScanFinding[] = [];
  const paths: ScanPath[] = [];
  const notes: string[] = [];
  const origin = `${base.protocol}//${base.host}`;

  const skippedCats = ALL_CATEGORIES.filter((c) => !selected.has(c));
  if (skippedCats.length) notes.push(`Checks skipped by scope: ${skippedCats.join(", ")}.`);
  if (scope.authorizationRef) notes.push(`Authorization ref: ${scope.authorizationRef}.`);

  const bump = () => {
    if (requests >= MAX_REQUESTS) return false;
    requests++;
    return true;
  };
  // follows redirects, re-validating each hop (SSRF + scope)
  const fetchFollow = (p: string) => getFollow(origin + p, bump, deps, inScope);
  // single request, no redirect following (for sensitive-file probes etc.)
  const fetchOnce = (p: string) =>
    bump() ? get(origin + p, deps.fetchImpl) : Promise.resolve(null);

  const root = await fetchFollow(base.pathname || "/");
  let fp: { server: string | null; tech: string[] } = { server: null, tech: [] };
  if (!root) throw new ScanRejected("The target did not respond.");
  if (root.offScope) notes.push(`Root redirected off-scope to ${root.offScope}; not followed.`);
  fp = fingerprint(root);

  const seenIds = new Set<string>();
  const add = (
    f: Omit<ScanFinding, "id" | "scannerVersion" | "detectedAt" | "references" | "confidence"> & {
      confidence?: Confidence;
      references?: string[];
    },
  ) => {
    const id = "NJ-" + createHash("sha1").update(`${f.category}|${f.title}|${f.evidence.location}`).digest("hex").slice(0, 10);
    if (seenIds.has(id)) return; // duplicate detection
    seenIds.add(id);
    findings.push({
      ...f,
      id,
      confidence: f.confidence ?? "confirmed",
      references: f.references ?? REFERENCES[f.category] ?? [],
      scannerVersion: SCANNER_VERSION,
      detectedAt: new Date().toISOString(),
    });
  };

  // --- header audit ---
  if (runCat("headers")) {
    for (const h of SEC_HEADERS) {
      if (!root.headers.get(h.key)) {
        add({
          title: `Missing header: ${h.label}`,
          severity: h.sev,
          category: "Security headers",
          observation: `No ${h.label} header was present on the main response.`,
          risk: "Response headers are a cheap defensive layer; their absence widens the impact of other flaws.",
          recommendation: h.fix,
          evidence: { location: base.href },
        });
      }
    }

    // version disclosure (same family as headers)
    if (fp.server && /\d/.test(fp.server)) {
      add({
        title: "Server version disclosed",
        severity: "low",
        category: "Information disclosure",
        observation: `The Server header advertises a specific build.`,
        risk: "Version disclosure lets an attacker map known vulnerabilities faster.",
        recommendation: "Suppress the version (server_tokens off / ServerTokens Prod).",
        evidence: { location: base.href, response: `Server: ${fp.server}` },
      });
    }
  }

  // --- cookies (each Set-Cookie analyzed independently) ---
  if (runCat("cookies")) {
    for (const raw of getSetCookies(root.headers)) {
      const name = raw.split("=", 1)[0].trim() || "(cookie)";
      const attrs = raw.toLowerCase();
      const miss = ["secure", "httponly", "samesite"].filter((a) => !attrs.includes(a));
      if (miss.length) {
        add({
          title: `Cookie "${name}" missing attributes: ${miss.join(", ")}`,
          severity: miss.includes("httponly") || miss.includes("secure") ? "medium" : "low",
          category: "Session management",
          observation: `The Set-Cookie for "${name}" was returned without: ${miss.join(", ")}.`,
          risk: "A cookie without HttpOnly is reachable from JavaScript; without Secure it can travel over plaintext; without SameSite it is exposed to CSRF.",
          recommendation: "Set Secure; HttpOnly; SameSite=Lax, especially on session cookies.",
          evidence: { location: base.href, response: `Set-Cookie: ${mask(raw)}` },
        });
      }
    }
  }

  // --- content checks on root ---
  const inspect = (loc: string, body: string) => {
    if (reShell.test(body))
      add({
        title: "Page content matches a known webshell",
        severity: "critical",
        confidence: "potential",
        category: "Malware / backdoor",
        observation: "A served page contains markers of a known webshell interface. This is a signature match and must be verified by hand.",
        risk: "If genuine, an attacker already has code execution on the host. Treat as incident response.",
        recommendation: "Do not open it in a browser. Isolate the file, review access logs, begin IR.",
        evidence: { location: loc, snippet: mask(body.slice(0, 300)) },
      });
    if (reUpload.test(body))
      add({
        title: "File upload form observed",
        severity: "high",
        confidence: "potential",
        category: "Upload handling",
        observation: "A multipart file upload form is present on this page. Whether it is exploitable depends on server-side validation, which a passive scan cannot see.",
        risk: "If the server trusts the client-supplied type, this is a common route to a planted webshell.",
        recommendation: "Validate uploads by content, store outside the web root, disable execution there.",
        evidence: { location: loc },
      });
    if (reLogin.test(body))
      add({
        title: "Login form",
        severity: "info",
        confidence: "informational",
        category: "Surface",
        observation: "This page carries a login form.",
        risk: "Authentication surface worth noting for rate-limiting and credential-stuffing defences.",
        recommendation: "Ensure rate limiting, lockout, and MFA where appropriate.",
        evidence: { location: loc },
      });
    if (reDirList.test(body))
      add({
        title: "Directory listing enabled",
        severity: "medium",
        category: "Misconfiguration",
        observation: `An auto-generated directory index was returned at ${loc}.`,
        risk: "Visitors can enumerate files directly, exposing material meant to be referenced only by the app.",
        recommendation: "Disable auto-index (autoindex off / Options -Indexes).",
        evidence: { location: loc },
      });
  };
  if (runCat("content")) inspect(base.href, root.body);

  // --- wordless path discovery (links + robots + sitemap) ---
  if (runCat("discovery")) {
  const seeds = new Set<string>();
  let m: RegExpExecArray | null;
  reAttr.lastIndex = 0;
  while ((m = reAttr.exec(root.body)) && seeds.size < 12) {
    const p = sameHostPath(base, m[1]);
    if (p) seeds.add(p);
  }
  const robots = await fetchFollow("/robots.txt");
  if (robots?.status === 200) {
    for (const line of robots.body.split("\n")) {
      const dm = line.match(/^\s*(?:dis)?allow\s*:\s*(\S+)/i);
      if (dm) {
        const p = sameHostPath(base, dm[1]);
        if (p && p !== "/") seeds.add(p);
      }
    }
  }
  const sitemap = await fetchFollow("/sitemap.xml");
  if (sitemap?.status === 200) {
    reLoc.lastIndex = 0;
    while ((m = reLoc.exec(sitemap.body)) && seeds.size < 16) {
      const p = sameHostPath(base, m[1]);
      if (p) seeds.add(p);
    }
  }

  const seedList = [...seeds].filter((p) => p !== (base.pathname || "/")).slice(0, 8);
  await Promise.all(
    seedList.map(async (p) => {
      const r = await fetchFollow(p);
      if (r && r.status === 200) {
        const ct = r.headers.get("content-type") ?? "";
        paths.push({ path: p, status: 200, title: ct.includes("html") ? title(r.body) : undefined });
        if (ct.includes("html") && runCat("content")) inspect(origin + p, r.body);
      }
    }),
  );
  } // end discovery

  // --- sensitive files (short fixed list, signature-matched) ---
  if (runCat("exposure"))
  await Promise.all(
    SENSITIVE.map(async (sf) => {
      const r = await fetchOnce(sf.path);
      if (r && r.status === 200 && sf.re.test(r.body)) {
        add({
          title: sf.title,
          severity: sf.path === "/.env" || sf.path.startsWith("/.git") ? "critical" : "medium",
          category: "Sensitive data exposure",
          observation: `GET ${sf.path} returned 200 with content matching a known signature.`,
          risk: sf.risk,
          recommendation: "Remove the file from the web root, block the path at the server, and rotate anything exposed.",
          evidence: {
            location: origin + sf.path,
            request: `GET ${sf.path}`,
            response: "200 OK",
            snippet: mask(r.body.slice(0, 300)),
          },
        });
      }
    }),
  );

  // --- HTTP -> HTTPS redirect ---
  if (runCat("tls") && base.protocol === "https:") {
    const httpRes = bump() ? await get(`http://${base.host}/`, deps.fetchImpl) : null;
    if (httpRes) {
      const loc = (httpRes.headers.get("location") ?? "").toLowerCase();
      const redirected =
        httpRes.status >= 300 && httpRes.status < 400 && loc.startsWith("https://");
      if (!redirected) {
        add({
          title: "HTTP is not redirected to HTTPS",
          severity: "medium",
          category: "Transport security",
          observation: `http://${base.host}/ answered ${httpRes.status} without redirecting to HTTPS.`,
          risk: "Traffic can be read or modified on the network before any HTTPS upgrade.",
          recommendation: "Force a 301 redirect to HTTPS and enable HSTS.",
          evidence: { location: `http://${base.host}/` },
        });
      }
    }
  }

  const order: Severity[] = ["critical", "high", "medium", "low", "info"];
  findings.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  paths.sort((a, b) => a.path.localeCompare(b.path));

  if (requests >= MAX_REQUESTS) {
    notes.push(`Request budget (${MAX_REQUESTS}) reached; some checks may be partial.`);
  }

  return {
    target: base.href,
    ips,
    reverseDns,
    server: fp.server,
    tech: fp.tech,
    paths,
    findings,
    requests,
    durationMs: deps.now() - started,
    scannedAt: new Date().toISOString(),
    scannerVersion: SCANNER_VERSION,
    notes,
    scope: {
      authorizationRef: scope.authorizationRef,
      allowedHosts: scope.allowedHosts ?? [],
      categories: [...selected],
    },
    live: true,
  };
}
