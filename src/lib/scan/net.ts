/**
 * Address parsing and an explicit global-routability policy for the SSRF guard.
 *
 * Instead of ad-hoc string prefixes, addresses are parsed to numbers and tested
 * against the IANA special-purpose registries. The policy is allow-by-exclusion
 * and FAILS CLOSED: anything that does not parse, or falls in any reserved /
 * private / special range, is treated as disallowed.
 */

// ---- IPv4 -----------------------------------------------------------------

/** Parse canonical dotted-decimal IPv4 to a uint32, or null. */
export function parseIpv4(s: string): number | null {
  const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  if (o.some((n) => n < 0 || n > 255)) return null;
  return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
}

function inV4(ip: number, cidr: string): boolean {
  const [base, lenStr] = cidr.split("/");
  const b = parseIpv4(base)!;
  const len = Number(lenStr);
  if (len === 0) return true;
  const mask = len === 32 ? 0xffffffff : (~0 << (32 - len)) >>> 0;
  return (ip & mask) === (b & mask);
}

// IANA IPv4 Special-Purpose Address Registry (non-globally-routable).
const V4_BLOCK = [
  "0.0.0.0/8", // "this network"
  "10.0.0.0/8", // private
  "100.64.0.0/10", // CGNAT
  "127.0.0.0/8", // loopback
  "169.254.0.0/16", // link-local (incl. cloud metadata 169.254.169.254)
  "172.16.0.0/12", // private
  "192.0.0.0/24", // IETF protocol assignments
  "192.0.2.0/24", // TEST-NET-1
  "192.88.99.0/24", // 6to4 relay anycast
  "192.168.0.0/16", // private
  "198.18.0.0/15", // benchmarking
  "198.51.100.0/24", // TEST-NET-2
  "203.0.113.0/24", // TEST-NET-3
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // reserved (incl. 255.255.255.255)
];

function v4Disallowed(ip: number): boolean {
  return V4_BLOCK.some((c) => inV4(ip, c));
}

// ---- IPv6 -----------------------------------------------------------------

/** Parse an IPv6 address (incl. embedded IPv4) to 8 × 16-bit groups, or null. */
export function parseIpv6(input: string): number[] | null {
  let s = input.trim().toLowerCase();
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);
  const zone = s.indexOf("%");
  if (zone >= 0) s = s.slice(0, zone);
  if (!s.includes(":")) return null;

  // embedded IPv4 tail (e.g. ::ffff:1.2.3.4 or 64:ff9b::1.2.3.4)
  let tail: number[] = [];
  const dot = s.lastIndexOf(":");
  const last = s.slice(dot + 1);
  if (last.includes(".")) {
    const v4 = parseIpv4(last);
    if (v4 === null) return null;
    tail = [(v4 >>> 16) & 0xffff, v4 & 0xffff];
    s = s.slice(0, dot + 1) + "0:0";
  }

  const halves = s.split("::");
  if (halves.length > 2) return null;
  const toGroups = (part: string) =>
    part === "" ? [] : part.split(":").map((h) => (/^[0-9a-f]{1,4}$/.test(h) ? parseInt(h, 16) : NaN));

  const head = toGroups(halves[0]);
  const rest = halves.length === 2 ? toGroups(halves[1]) : [];
  if ([...head, ...rest].some((n) => Number.isNaN(n))) return null;

  let groups: number[];
  if (halves.length === 2) {
    const fill = 8 - head.length - rest.length;
    if (fill < 0) return null;
    groups = [...head, ...Array(fill).fill(0), ...rest];
  } else {
    groups = head;
  }
  // replace the synthesized tail placeholder with the real embedded v4
  if (tail.length) groups = [...groups.slice(0, 6), ...tail];
  return groups.length === 8 ? groups : null;
}

function v6Disallowed(g: number[]): boolean {
  const isZeroThrough = (n: number) => g.slice(0, n).every((x) => x === 0);

  // IPv4-mapped ::ffff:a.b.c.d  and IPv4-compatible ::a.b.c.d  → classify as v4
  if (isZeroThrough(5) && g[5] === 0xffff) return v4Disallowed(((g[6] << 16) | g[7]) >>> 0);
  if (isZeroThrough(6) && (g[6] !== 0 || g[7] !== 0) && !(g[6] === 0 && g[7] === 1))
    return v4Disallowed(((g[6] << 16) | g[7]) >>> 0);
  // NAT64 64:ff9b::/96
  if (g[0] === 0x64 && g[1] === 0xff9b && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0)
    return v4Disallowed(((g[6] << 16) | g[7]) >>> 0);

  if (g.every((x) => x === 0)) return true; // ::  unspecified
  if (isZeroThrough(7) && g[7] === 1) return true; // ::1 loopback
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 ULA
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // 2001:db8::/32 documentation
  if (g[0] === 0x2001 && g[1] === 0x0000) return true; // 2001::/32 Teredo
  if (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true; // 100::/64 discard
  if (g[0] === 0x2002) return true; // 2002::/16 6to4
  return false;
}

// ---- policy ---------------------------------------------------------------

/**
 * True when `ip` must NOT be connected to (private, reserved, special, or
 * unparseable). Fails closed.
 */
export function isDisallowedIp(ip: string): boolean {
  const v4 = parseIpv4(ip);
  if (v4 !== null) return v4Disallowed(v4);
  const v6 = parseIpv6(ip);
  if (v6) return v6Disallowed(v6);
  return true; // unparseable → disallow
}
