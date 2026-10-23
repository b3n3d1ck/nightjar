import { describe, it, expect } from "vitest";
import { scan, ScanRejected, type ScanDeps } from "./engine";

type RouteSpec = { status: number; body?: string; headers?: Headers | Record<string, string> };

function makeFetch(routes: Record<string, RouteSpec>): ScanDeps["fetchImpl"] {
  return (async (input: RequestInfo | URL) => {
    const url = input.toString();
    const r = routes[url] ?? { status: 404 };
    const headers = r.headers instanceof Headers ? r.headers : new Headers(r.headers ?? {});
    return new Response(r.body ?? null, { status: r.status, headers });
  }) as unknown as ScanDeps["fetchImpl"];
}

function makeResolve(map: Record<string, string[]>, fallback: string[] = ["93.184.216.34"]): ScanDeps["resolve"] {
  return async (host: string) => map[host] ?? fallback;
}

const deps = (fetchImpl: ScanDeps["fetchImpl"], resolve: ScanDeps["resolve"]): Partial<ScanDeps> => ({
  fetchImpl,
  resolve,
  reverse: async () => [],
  now: () => Date.parse("2026-06-15T12:00:00Z"),
});

describe("scan() integration — cookies", () => {
  it("analyzes each Set-Cookie separately (one secure cookie does not mask a bare one)", async () => {
    const h = new Headers({ server: "nginx" });
    h.append("set-cookie", "sid=abc123");
    h.append("set-cookie", "theme=dark; Secure; HttpOnly; SameSite=Lax");
    const fetchImpl = makeFetch({
      "https://site.test/": { status: 200, body: "<html></html>", headers: h },
      "http://site.test/": { status: 301, headers: { location: "https://site.test/" } },
    });
    const r = await scan("https://site.test", { deps: deps(fetchImpl, makeResolve({})) });
    const cookieFindings = r.findings.filter((f) => f.category === "Session management");
    expect(cookieFindings).toHaveLength(1);
    expect(cookieFindings[0].title).toContain("sid");
    expect(JSON.stringify(r)).not.toContain("theme");
  });
});

describe("scan() integration — SSRF via redirect", () => {
  it("aborts when a (in-scope) redirect resolves to a private address", async () => {
    const fetchImpl = makeFetch({
      "https://site.test/": { status: 302, headers: { location: "https://internal.test/" } },
    });
    const resolve = makeResolve({ "site.test": ["93.184.216.34"], "internal.test": ["10.0.0.5"] });
    await expect(
      scan("https://site.test", {
        scope: { allowedHosts: ["internal.test"] },
        deps: deps(fetchImpl, resolve),
      }),
    ).rejects.toBeInstanceOf(ScanRejected);
  });

  it("does not follow an off-scope redirect and records a note", async () => {
    const fetchImpl = makeFetch({
      "https://site.test/": { status: 301, headers: { location: "https://evil.test/" } },
    });
    const r = await scan("https://site.test", { deps: deps(fetchImpl, makeResolve({})) });
    expect(r.notes.some((n) => /off-scope/i.test(n))).toBe(true);
    expect(r.target).toBe("https://site.test/");
  });

  it("rejects a target resolving to private IPv6", async () => {
    const fetchImpl = makeFetch({ "https://site.test/": { status: 200 } });
    const resolve = makeResolve({ "site.test": ["fc00::1"] });
    await expect(scan("https://site.test", { deps: deps(fetchImpl, resolve) })).rejects.toBeInstanceOf(ScanRejected);
  });

  it("rejects an obfuscated numeric private host before any request", async () => {
    let called = false;
    const fetchImpl = makeFetch({});
    const resolve: ScanDeps["resolve"] = async () => {
      called = true;
      return ["93.184.216.34"];
    };
    await expect(scan("http://2130706433/", { deps: deps(fetchImpl, resolve) })).rejects.toBeInstanceOf(ScanRejected);
    expect(called).toBe(false);
  });
});

describe("scan() integration — scope", () => {
  it("runs only the selected categories and notes the skipped ones", async () => {
    const h = new Headers();
    h.append("set-cookie", "sid=abc"); // would be flagged if cookies ran
    const fetchImpl = makeFetch({
      "https://site.test/": { status: 200, body: "<html></html>", headers: h },
    });
    const r = await scan("https://site.test", {
      scope: { categories: ["headers"], authorizationRef: "PO-2026-42" },
      deps: deps(fetchImpl, makeResolve({})),
    });
    expect(r.findings.some((f) => f.category === "Session management")).toBe(false);
    expect(r.findings.some((f) => f.category === "Security headers")).toBe(true);
    expect(r.notes.some((n) => /skipped by scope/i.test(n))).toBe(true);
    expect(r.scope.authorizationRef).toBe("PO-2026-42");
    expect(r.scope.categories).toEqual(["headers"]);
  });

  it("refuses to run outside the assessment window", async () => {
    const fetchImpl = makeFetch({ "https://site.test/": { status: 200 } });
    await expect(
      scan("https://site.test", {
        scope: { window: { end: "2020-01-01T00:00:00Z" } },
        deps: deps(fetchImpl, makeResolve({})),
      }),
    ).rejects.toBeInstanceOf(ScanRejected);
  });
});

describe("scan() integration — exposure + masking", () => {
  it("flags an exposed .env as critical and masks the secret in the result", async () => {
    const fetchImpl = makeFetch({
      "https://site.test/": { status: 200, body: "<html></html>" },
      "https://site.test/.env": { status: 200, body: "APP_KEY=base64:ZZZ\nDB_PASSWORD=supersecret123\n" },
    });
    const r = await scan("https://site.test", { deps: deps(fetchImpl, makeResolve({})) });
    const env = r.findings.find((f) => f.title === "Exposed .env file");
    expect(env?.severity).toBe("critical");
    expect(JSON.stringify(r)).not.toContain("supersecret123");
  });
});

describe("scan() integration — input validation", () => {
  it("rejects a malformed URL", async () => {
    const fetchImpl = makeFetch({});
    await expect(scan("not a url ::::", { deps: deps(fetchImpl, makeResolve({})) })).rejects.toBeInstanceOf(ScanRejected);
  });
});
