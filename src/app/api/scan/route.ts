import { NextResponse } from "next/server";
import { scan, ScanRejected, ALL_CATEGORIES, type ScanScope, type CheckCategory } from "@/lib/scan/engine";

function parseScope(input: unknown): ScanScope | undefined {
  if (!input || typeof input !== "object") return undefined;
  const o = input as Record<string, unknown>;
  const scope: ScanScope = {};
  if (typeof o.authorizationRef === "string") scope.authorizationRef = o.authorizationRef.slice(0, 200);
  if (Array.isArray(o.allowedHosts)) {
    scope.allowedHosts = o.allowedHosts.filter((h): h is string => typeof h === "string").slice(0, 20).map((h) => h.slice(0, 253));
  }
  if (Array.isArray(o.categories)) {
    scope.categories = o.categories.filter(
      (c): c is CheckCategory => typeof c === "string" && (ALL_CATEGORIES as string[]).includes(c),
    );
  }
  if (o.window && typeof o.window === "object") {
    const w = o.window as Record<string, unknown>;
    scope.window = {
      start: typeof w.start === "string" ? w.start : undefined,
      end: typeof w.end === "string" ? w.end : undefined,
    };
  }
  return scope;
}

export const maxDuration = 30;

// Best-effort in-memory rate limit. On serverless each instance keeps its own
// counter, so this throttles a hot instance rather than being a global guarantee
// — a durable store (e.g. Upstash/Redis) is the production upgrade (see README).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const buckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff ? xff.split(",")[0] : null)?.trim() || "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  b.count++;
  return b.count > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json(
      { error: "Too many scans. Wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: { url?: unknown; authorized?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "A target URL is required." }, { status: 400 });
  }
  if (url.length > 2048) {
    return NextResponse.json({ error: "URL is too long." }, { status: 400 });
  }
  if (body.authorized !== true) {
    return NextResponse.json(
      { error: "You must confirm you are authorized to test this target." },
      { status: 403 },
    );
  }

  try {
    const result = await scan(url, { scope: parseScope((body as Record<string, unknown>).scope) });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ScanRejected) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "The scan could not complete. The target may be unreachable." },
      { status: 502 },
    );
  }
}
