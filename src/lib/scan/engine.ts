import { lookup, reverse } from "node:dns/promises";
import type { Severity } from "@/lib/types";
import type { ScanFinding, ScanPath, ScanResult } from "./types";

/* ============================================================================
   Passive scan engine (server-side). GET only. No brute-force wordlists beyond
   a short fixed list of well-known sensitive files. Never follows the target
   into private address space (SSRF guard). This is the same class of check a
   public tool like securityheaders.com performs.
   ========================================================================== */

const UA = "NIGHTJAR/1.0 (+passive security audit)";
const PER_REQUEST_TIMEOUT = 6000;
const MAX_REQUESTS = 24;
const MAX_BODY = 500_000;

export class ScanRejected extends Error {}

// ---- SSRF guard -----------------------------------------------------------

export function ipIsPrivate(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd")) return true;
  // IPv4-mapped IPv6
  const mapped = v.startsWith("::ffff:") ? v.slice(7) : v;
  const m = mapped.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

async function assertPublicHost(host: string): Promise<string[]> {
  const bare = host.replace(/:\d+$/, "").toLowerCase();
  if (
    bare === "localhost" ||
    bare.endsWith(".localhost") ||
    bare.endsWith(".local") ||
    bare.endsWith(".internal") ||
    bare === "metadata.google.internal"
  ) {
    throw new ScanRejected("Target resolves to a non-public host.");
  }
  let addrs: { address: string }[];
  try {
    addrs = await lookup(bare, { all: true });
  } catch {
    throw new ScanRejected("Could not resolve the host.");
  }
  if (addrs.length === 0) throw new ScanRejected("Could not resolve the host.");
  if (addrs.some((a) => ipIsPrivate(a.address))) {
    throw new ScanRejected("Target points to an internal/private address.");
  }
  return addrs.map((a) => a.address);
}

// ---- http -----------------------------------------------------------------

interface Resp {
  status: number;
  headers: Headers;
  body: string;
  ok: boolean;
}

async function get(
  url: string,
  opts: { redirect?: RequestRedirect } = {},
): Promise<Resp | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PER_REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: opts.redirect ?? "follow",
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
    return { status: res.status, headers: res.headers, body, ok: res.ok };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
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

function fingerprint(r: Resp): { server: string | null; tech: string[] } {
  const set = new Set<string>();
  const xp = r.headers.get("x-powered-by");
  if (xp) set.add(xp);
  const cookies = (r.headers.get("set-cookie") ?? "").toLowerCase();
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

export async function scan(rawUrl: string): Promise<ScanResult> {
  const started = Date.now();
  let base: URL;
  try {
    base = new URL(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`);
  } catch {
    throw new ScanRejected("That does not look like a valid URL.");
  }
  if (base.protocol !== "http:" && base.protocol !== "https:")
    throw new ScanRejected("Only http and https targets are supported.");
  base.hash = "";

  const ips = await assertPublicHost(base.host);
  let reverseDns: string[] = [];
  try {
    reverseDns = await reverse(ips[0]);
  } catch {
    /* no PTR */
  }

  let requests = 0;
  const findings: ScanFinding[] = [];
  const paths: ScanPath[] = [];
  const origin = `${base.protocol}//${base.host}`;
  const fetchPath = async (p: string, redirect?: RequestRedirect) => {
    if (requests >= MAX_REQUESTS) return null;
    requests++;
    return get(origin + p, { redirect });
  };

  const root = await fetchPath(base.pathname || "/");
  let fp: { server: string | null; tech: string[] } = { server: null, tech: [] };
  if (!root) throw new ScanRejected("The target did not respond.");
  fp = fingerprint(root);

  const add = (f: Omit<ScanFinding, "id">) =>
    findings.push({ ...f, id: `LV-${findings.length + 1}` });

  // --- header audit ---
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

  // --- cookies ---
  const setCookie = root.headers.get("set-cookie");
  if (setCookie) {
    const low = setCookie.toLowerCase();
    const miss = ["secure", "httponly", "samesite"].filter((a) => !low.includes(a));
    if (miss.length) {
      add({
        title: `Cookie missing attributes: ${miss.join(", ")}`,
        severity: miss.includes("httponly") || miss.includes("secure") ? "medium" : "low",
        category: "Session management",
        observation: `Set-Cookie was returned without: ${miss.join(", ")}.`,
        risk: "A cookie without HttpOnly is reachable from JavaScript; without Secure it can travel over plaintext.",
        recommendation: "Set Secure; HttpOnly; SameSite=Lax, especially on session cookies.",
        evidence: { location: base.href, response: `Set-Cookie: ${mask(setCookie)}` },
      });
    }
  }

  // --- version disclosure ---
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

  // --- content checks on root ---
  const inspect = (loc: string, body: string) => {
    if (reShell.test(body))
      add({
        title: "Page content matches a known webshell",
        severity: "critical",
        category: "Malware / backdoor",
        observation: "A served page contains markers of a known webshell interface.",
        risk: "If genuine, an attacker already has code execution on the host. Treat as incident response.",
        recommendation: "Do not open it in a browser. Isolate the file, review access logs, begin IR.",
        evidence: { location: loc, snippet: mask(body.slice(0, 300)) },
      });
    if (reUpload.test(body))
      add({
        title: "File upload form observed",
        severity: "high",
        category: "Upload handling",
        observation: "A multipart file upload form is present on this page.",
        risk: "If the server trusts the client-supplied type, this is a common route to a planted webshell.",
        recommendation: "Validate uploads by content, store outside the web root, disable execution there.",
        evidence: { location: loc },
      });
    if (reLogin.test(body))
      add({
        title: "Login form",
        severity: "info",
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
  inspect(base.href, root.body);

  // --- wordless path discovery (links + robots + sitemap) ---
  const seeds = new Set<string>();
  let m: RegExpExecArray | null;
  reAttr.lastIndex = 0;
  while ((m = reAttr.exec(root.body)) && seeds.size < 12) {
    const p = sameHostPath(base, m[1]);
    if (p) seeds.add(p);
  }
  const robots = await fetchPath("/robots.txt");
  if (robots?.status === 200) {
    for (const line of robots.body.split("\n")) {
      const dm = line.match(/^\s*(?:dis)?allow\s*:\s*(\S+)/i);
      if (dm) {
        const p = sameHostPath(base, dm[1]);
        if (p && p !== "/") seeds.add(p);
      }
    }
  }
  const sitemap = await fetchPath("/sitemap.xml");
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
      const r = await fetchPath(p);
      if (r && r.status === 200) {
        const ct = r.headers.get("content-type") ?? "";
        paths.push({ path: p, status: 200, title: ct.includes("html") ? title(r.body) : undefined });
        if (ct.includes("html")) inspect(origin + p, r.body);
      }
    }),
  );

  // --- sensitive files (short fixed list, signature-matched) ---
  await Promise.all(
    SENSITIVE.map(async (sf) => {
      const r = await fetchPath(sf.path, "manual");
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
  if (base.protocol === "https:") {
    const httpRes = await (async () => {
      if (requests >= MAX_REQUESTS) return null;
      requests++;
      return get(`http://${base.host}/`, { redirect: "manual" });
    })();
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

  return {
    target: base.href,
    ips,
    reverseDns,
    server: fp.server,
    tech: fp.tech,
    paths,
    findings,
    requests,
    durationMs: Date.now() - started,
    scannedAt: new Date().toISOString(),
    live: true,
  };
}
