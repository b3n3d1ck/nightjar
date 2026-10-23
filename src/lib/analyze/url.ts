import type { Severity } from "@/lib/types";

/**
 * Passive URL / domain analysis. Pure string work — no network, no requests,
 * safe to run client-side. It surfaces *indicators*, not verdicts of malice:
 * a suspicious-looking name is not proof a site is malicious.
 */

export interface UrlIndicator {
  id: string;
  title: string;
  severity: Severity;
  detail: string;
}

export interface UrlAnalysis {
  input: string;
  valid: boolean;
  error?: string;
  normalized?: string;
  scheme?: string;
  hostname?: string;
  isIp?: boolean;
  hasUserinfo?: boolean;
  punycode?: boolean;
  nonAscii?: boolean;
  subdomainDepth?: number;
  indicators: UrlIndicator[];
  /** highest-severity summary word */
  concern: "clear" | "low" | "medium" | "high";
}

// Brand NAMES only. Generic words (login, secure, account, verify, update) are
// common in legitimate paths, so they would be too noisy for lookalike detection.
const BRAND_TERMS = [
  "paypal", "google", "apple", "microsoft", "amazon", "facebook", "instagram",
  "whatsapp", "netflix", "metamask", "binance", "coinbase", "steam", "roblox",
];

const RISKY_TLDS = ["zip", "mov", "tk", "gq", "ml", "cf", "top", "xyz", "country", "kim", "work"];

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

function sev(indicators: UrlIndicator[]): UrlAnalysis["concern"] {
  const order: Severity[] = ["critical", "high", "medium", "low", "info"];
  let worst = 99;
  for (const i of indicators) worst = Math.min(worst, order.indexOf(i.severity));
  if (worst <= 1) return "high";
  if (worst === 2) return "medium";
  if (worst === 3) return "low";
  return "clear";
}

export function analyzeUrl(raw: string): UrlAnalysis {
  const input = raw.trim();
  if (!input) return { input, valid: false, error: "Enter a URL.", indicators: [], concern: "clear" };

  let u: URL;
  try {
    u = new URL(input.includes("://") ? input : `http://${input}`);
  } catch {
    return { input, valid: false, error: "Not a parseable URL.", indicators: [], concern: "clear" };
  }

  const indicators: UrlIndicator[] = [];
  const host = u.hostname;
  const labels = host.split(".");
  const isIp = IPV4.test(host) || host.includes(":") || host.startsWith("[");
  const nonAscii = /[^\u0000-\u007F]/.test(host);
  const punycode = labels.some((l) => l.startsWith("xn--"));
  const tld = labels.length > 1 ? labels[labels.length - 1].toLowerCase() : "";
  const registrable = labels.length >= 2 ? labels.slice(-2).join(".").toLowerCase() : host.toLowerCase();

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    indicators.push({ id: "scheme", title: `Unusual scheme: ${u.protocol}`, severity: "medium", detail: "Only http/https are expected for a website." });
  }
  if (u.protocol === "http:") {
    indicators.push({ id: "http", title: "Plain HTTP (no TLS)", severity: "low", detail: "The link is not encrypted; credentials or data could be read on the network." });
  }
  if (u.username) {
    indicators.push({ id: "userinfo", title: "Credentials embedded in the URL (user@host)", severity: "high", detail: `Everything before '@' is userinfo, not the host. The real destination is '${host}'. This pattern is used to disguise the true site.` });
  }
  if (isIp) {
    indicators.push({ id: "ip", title: "Host is a raw IP address", severity: "medium", detail: "Legitimate services almost always use a domain name, not a bare IP." });
  }
  if (punycode) {
    indicators.push({ id: "punycode", title: "Internationalized domain (punycode, xn--)", severity: "medium", detail: "Punycode can render as letters that look identical to ASCII (homoglyph). Verify the real registered name." });
  }
  if (nonAscii && !punycode) {
    indicators.push({ id: "nonascii", title: "Non-ASCII characters in the hostname", severity: "medium", detail: "Mixed or non-Latin scripts can impersonate a familiar name through look-alike characters." });
  }
  if (tld && RISKY_TLDS.includes(tld)) {
    indicators.push({ id: "tld", title: `Higher-risk TLD: .${tld}`, severity: "low", detail: "This TLD is disproportionately used for abuse; not malicious by itself." });
  }
  if (!isIp && labels.length >= 5) {
    indicators.push({ id: "subdepth", title: `Deep subdomain nesting (${labels.length} labels)`, severity: "low", detail: "Long subdomain chains are often used to bury the real domain or mimic a brand." });
  }
  // brand term appearing OUTSIDE the registrable domain (subdomain or path)
  const outside = [...labels.slice(0, -2), u.pathname].join(" ").toLowerCase();
  const brandHit = BRAND_TERMS.find((b) => new RegExp(`(^|[^a-z])${b}([^a-z]|$)`).test(outside) && !registrable.includes(b));
  if (brandHit) {
    indicators.push({ id: "brand", title: `Brand term "${brandHit}" used away from the real domain`, severity: "medium", detail: `"${brandHit}" appears in a subdomain or path, but the registered domain is "${registrable}". This is a common lookalike tactic.` });
  }
  // digit-for-letter substitution in a name label
  const leet = labels.slice(0, -1).find((l) => /[a-z]/.test(l) && /[0-9]/.test(l) && /[013457]/.test(l) && l.length >= 4);
  if (leet) {
    indicators.push({ id: "leet", title: `Digits mixed into a name label ("${leet}")`, severity: "low", detail: "Digit-for-letter swaps (0 for o, 1 for l) are used to imitate real names." });
  }
  if (input.length > 120) {
    indicators.push({ id: "length", title: "Very long URL", severity: "low", detail: "Overlong URLs can hide the real destination; inspect it carefully." });
  }

  return {
    input,
    valid: true,
    normalized: u.href,
    scheme: u.protocol.replace(":", ""),
    hostname: host,
    isIp,
    hasUserinfo: !!u.username,
    punycode,
    nonAscii,
    subdomainDepth: isIp ? 0 : Math.max(0, labels.length - 2),
    indicators,
    concern: sev(indicators),
  };
}
