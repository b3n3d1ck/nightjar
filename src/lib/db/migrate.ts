import { MIGRATIONS } from "./migrations";
import type { PoolLike } from "./client";

/**
 * Apply any pending migrations in order, each in its own transaction, recording
 * applied versions in `schema_migrations`. Idempotent: already-applied versions
 * are skipped. Returns the versions applied by this call.
 */
async function ensureMigrationsTable(pool: PoolLike): Promise<void> {
  // Probe-then-create rather than CREATE TABLE IF NOT EXISTS: re-parsing the
  // constraints of an already-existing table trips pg-mem's strict AST checker.
  try {
    await pool.query(`SELECT 1 FROM schema_migrations LIMIT 1`);
    return;
  } catch {
    /* table does not exist yet */
  }
  await pool.query(
    `CREATE TABLE schema_migrations (
       version text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
}

export async function applyMigrations(pool: PoolLike): Promise<string[]> {
  await ensureMigrationsTable(pool);
  const { rows } = await pool.query<{ version: string }>(`SELECT version FROM schema_migrations`);
  const done = new Set(rows.map((r) => r.version));

  const applied: string[] = [];
  for (const m of MIGRATIONS) {
    if (done.has(m.version)) continue;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(m.up);
      await client.query(`INSERT INTO schema_migrations(version) VALUES ($1)`, [m.version]);
      await client.query("COMMIT");
      applied.push(m.version);
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* ignore */
      }
      throw e;
    } finally {
      client.release();
    }
  }
  return applied;
}

/** Roll back the most recent migration (for recovery/dev). */
export async function rollbackLast(pool: PoolLike): Promise<string | null> {
  const { rows } = await pool.query<{ version: string }>(
    `SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1`,
  );
  if (rows.length === 0) return null;
  const version = rows[0].version;
  const m = MIGRATIONS.find((x) => x.version === version);
  if (!m) throw new Error(`No migration definition for ${version}`);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(m.down);
    await client.query(`DELETE FROM schema_migrations WHERE version = $1`, [version]);
    await client.query("COMMIT");
    return version;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}
