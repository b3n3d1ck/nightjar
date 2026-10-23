import { NextResponse } from "next/server";
import { getPool, DbNotConfigured } from "./pool";
import { Repository } from "./repository";
import { NotFoundError, ValidationError } from "./types";

export function getRepo(): Repository {
  return new Repository(getPool());
}

/**
 * Map errors to responses without leaking internals. Connection strings,
 * driver errors, and stack traces never reach the client; they are logged
 * server-side only.
 */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof DbNotConfigured) {
    return NextResponse.json(
      { error: "Persistence is not configured on this deployment." },
      { status: 503 },
    );
  }
  if (e instanceof ValidationError) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  if (e instanceof NotFoundError) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
  console.error("[db-api] unexpected error:", e);
  return NextResponse.json({ error: "Internal error." }, { status: 500 });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    throw new ValidationError("Invalid JSON body.");
  }
}
