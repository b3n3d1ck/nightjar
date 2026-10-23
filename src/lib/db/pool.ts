import { Pool } from "pg";
import type { PoolLike } from "./client";

/** Thrown when a persistence operation is attempted without a configured DB. */
export class DbNotConfigured extends Error {
  constructor() {
    super("Persistence is not configured (DATABASE_URL is not set).");
    this.name = "DbNotConfigured";
  }
}

export function isDbConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return typeof url === "string" && url.length > 0;
}

let pool: Pool | null = null;

/**
 * Lazily create a shared connection pool. Server-only (imports `pg`). Keeps the
 * pool small for serverless connection limits. Throws `DbNotConfigured` when no
 * DATABASE_URL is set — callers surface this as a clear 503, never a silent
 * fall back to demo data.
 */
export function getPool(): PoolLike {
  if (!isDbConfigured()) throw new DbNotConfigured();
  if (!pool) {
    const connectionString = process.env.DATABASE_URL!;
    const sslDisabled = process.env.DATABASE_SSL === "disable";
    pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 3),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      // Hosted Postgres (Neon/Supabase/Vercel) generally requires TLS.
      ssl: sslDisabled ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool as unknown as PoolLike;
}
