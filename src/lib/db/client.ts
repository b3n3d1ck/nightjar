/** Minimal structural types shared by node-postgres and pg-mem's pg adapter. */

export interface QueryResult<T> {
  rows: T[];
  rowCount: number | null;
}

export interface Queryable {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

export interface PoolClientLike extends Queryable {
  release(): void;
}

export interface PoolLike extends Queryable {
  connect(): Promise<PoolClientLike>;
}

/** Run `fn` inside a transaction, committing on success and rolling back on error. */
export async function withTransaction<T>(
  pool: PoolLike,
  fn: (c: Queryable) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback failure */
    }
    throw e;
  } finally {
    client.release();
  }
}
