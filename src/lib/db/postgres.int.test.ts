import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { applyMigrations } from "./migrate";
import { withTransaction, type PoolLike } from "./client";
import { Repository } from "./repository";

/**
 * Real-PostgreSQL verification of the guarantees pg-mem cannot prove:
 * transaction rollback data semantics and foreign-key enforcement.
 *
 * Skipped unless DATABASE_TEST_URL points at a DISPOSABLE Postgres, e.g.:
 *   docker run --rm -e POSTGRES_PASSWORD=pw -p 5433:5432 postgres:16
 *   DATABASE_TEST_URL=postgres://postgres:pw@localhost:5433/postgres npm test
 */
const url = process.env.DATABASE_TEST_URL;
const d = url ? describe : describe.skip;

d("real Postgres", () => {
  let pool: Pool;
  const schema = `nj_test_${Date.now()}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await pool.query(`SET search_path TO ${schema}`);
    await applyMigrations(pool as unknown as PoolLike);
  });
  afterAll(async () => {
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await pool.end();
    }
  });

  it("rolls back data on a failed transaction", async () => {
    const id = randomUUID();
    await expect(
      withTransaction(pool as unknown as PoolLike, async (c) => {
        await c.query(`INSERT INTO projects(id, name) VALUES ($1,$2)`, [id, "rollme"]);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    const { rows } = await pool.query(`SELECT 1 FROM projects WHERE id=$1`, [id]);
    expect(rows).toHaveLength(0);
  });

  it("enforces foreign keys (finding without a real assessment is rejected)", async () => {
    await expect(
      pool.query(
        `INSERT INTO findings(id, assessment_id, finding_key, title, severity, confidence, category)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [randomUUID(), randomUUID(), "NJ-x", "t", "low", "confirmed", "Security headers"],
      ),
    ).rejects.toBeTruthy();
  });

  it("cascades finding deletion when an assessment is deleted", async () => {
    const repo = new Repository(pool as unknown as PoolLike);
    const p = await repo.createProject("cascade");
    const t = await repo.addTarget(p.id, "https://x.test");
    const a = await repo.createAssessment({ projectId: p.id, targetId: t.id, targetUrl: "https://x.test/" });
    await repo.persistFindings(a.id, [
      { id: "NJ-a", title: "t", severity: "low", confidence: "confirmed", category: "Security headers", observation: "", risk: "", recommendation: "", evidence: { location: "x" }, references: [], scannerVersion: "1.2.0", detectedAt: new Date().toISOString() },
    ]);
    await pool.query(`DELETE FROM assessments WHERE id=$1`, [a.id]);
    const { rows } = await pool.query(`SELECT 1 FROM findings WHERE assessment_id=$1`, [a.id]);
    expect(rows).toHaveLength(0);
  });
});
