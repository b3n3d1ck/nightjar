import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { newDb } from "pg-mem";
import { applyMigrations } from "./migrate";
import { withTransaction, type PoolLike } from "./client";
import { Repository } from "./repository";
import { NotFoundError, ValidationError } from "./types";
import type { ScanFinding } from "@/lib/scan/types";

function freshPool(): PoolLike {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  return new Pool() as unknown as PoolLike;
}

function finding(key: string, severity = "medium"): ScanFinding {
  return {
    id: key, title: `Finding ${key}`, severity: severity as ScanFinding["severity"],
    confidence: "confirmed", category: "Security headers",
    observation: "obs", risk: "risk", recommendation: "fix",
    evidence: { location: "https://site.test/" }, references: ["https://owasp.org"],
    scannerVersion: "1.2.0", detectedAt: new Date().toISOString(),
  };
}

let pool: PoolLike;
let repo: Repository;

beforeEach(async () => {
  pool = freshPool();
  await applyMigrations(pool);
  repo = new Repository(pool);
});

describe("migrations", () => {
  it("applies once and is idempotent", async () => {
    // already applied in beforeEach; a second run should apply nothing
    expect(await applyMigrations(pool)).toEqual([]);
  });
});

describe("projects / targets / scopes", () => {
  it("creates and reads a project", async () => {
    const p = await repo.createProject("Acme audit");
    expect(p.name).toBe("Acme audit");
    expect(await repo.getProject(p.id)).toMatchObject({ id: p.id });
    expect((await repo.listProjects()).length).toBeGreaterThan(0);
  });

  it("rejects an empty project name and a malformed id", async () => {
    await expect(repo.createProject("")).rejects.toBeInstanceOf(ValidationError);
    await expect(repo.getProject("not-a-uuid")).rejects.toBeInstanceOf(ValidationError);
    await expect(repo.getProject(randomUUID())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("adds targets idempotently (unique per project)", async () => {
    const p = await repo.createProject("P");
    const t1 = await repo.addTarget(p.id, "https://site.test");
    const t2 = await repo.addTarget(p.id, "https://site.test"); // same value
    expect(t2.id).toBe(t1.id);
    expect(await repo.listTargets(p.id)).toHaveLength(1);
  });

  it("round-trips scope arrays", async () => {
    const p = await repo.createProject("P");
    const s = await repo.createScope(p.id, { authorizationRef: "PO-1", allowedHosts: ["a.test"], categories: ["headers"] });
    const got = await repo.getScope(s.id);
    expect(got.allowedHosts).toEqual(["a.test"]);
    expect(got.categories).toEqual(["headers"]);
    expect(got.authorizationRef).toBe("PO-1");
  });
});

describe("assessments & findings", () => {
  async function seed() {
    const p = await repo.createProject("P");
    const t = await repo.addTarget(p.id, "https://site.test");
    const a = await repo.createAssessment({ projectId: p.id, targetId: t.id, targetUrl: "https://site.test/" });
    return { p, t, a };
  }

  it("creates an assessment and records status transitions with audit", async () => {
    const { a } = await seed();
    await repo.setAssessmentStatus(a.id, "running", { startedAt: new Date().toISOString() });
    const done = await repo.setAssessmentStatus(a.id, "completed", { requests: 10, durationMs: 1234 });
    expect(done.status).toBe("completed");
    expect(done.requests).toBe(10);
    const audit = await repo.listAudit(a.id);
    expect(audit.some((e) => e.action === "assessment.created")).toBe(true);
    expect(audit.filter((e) => e.action === "assessment.status")).toHaveLength(2);
  });

  it("persists findings idempotently (no duplicates on retry)", async () => {
    const { a } = await seed();
    const fs = [finding("NJ-a", "high"), finding("NJ-b", "low")];
    await repo.persistFindings(a.id, fs);
    await repo.persistFindings(a.id, fs); // retry
    const all = await repo.listFindings(a.id);
    expect(all).toHaveLength(2);
  });

  it("filters and paginates findings", async () => {
    const { a } = await seed();
    await repo.persistFindings(a.id, [finding("NJ-a", "high"), finding("NJ-b", "high"), finding("NJ-c", "low")]);
    expect(await repo.listFindings(a.id, { severity: "high" })).toHaveLength(2);
    expect(await repo.listFindings(a.id, { limit: 1 })).toHaveLength(1);
  });

  it("saveScanResult marks completed + persists findings atomically", async () => {
    const { a } = await seed();
    const saved = await repo.saveScanResult(a.id, {
      target: "https://site.test/", ips: ["1.1.1.1"], reverseDns: [], server: null, tech: [],
      paths: [], findings: [finding("NJ-x")], requests: 5, durationMs: 100,
      scannedAt: new Date().toISOString(), scannerVersion: "1.2.0", notes: [],
      scope: { allowedHosts: [], categories: [] }, live: true,
    });
    expect(saved.status).toBe("completed");
    const { findings } = await repo.getAssessmentWithFindings(a.id);
    expect(findings).toHaveLength(1);
  });

  it("updates a finding's lifecycle status with audit", async () => {
    const { a } = await seed();
    await repo.persistFindings(a.id, [finding("NJ-a")]);
    const f = (await repo.listFindings(a.id))[0];
    const updated = await repo.updateFindingStatus(f.id, "remediated");
    expect(updated.status).toBe("remediated");
    await expect(repo.updateFindingStatus(f.id, "bogus" as never)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("transactions (control flow)", () => {
  // NOTE: pg-mem's pg adapter does NOT emulate BEGIN/ROLLBACK data semantics,
  // so we assert here only that withTransaction issues BEGIN then ROLLBACK and
  // rethrows. The DATA-level rollback guarantee is verified against real
  // Postgres in postgres.int.test.ts (run with DATABASE_TEST_URL).
  it("issues BEGIN then ROLLBACK and rethrows when the body fails", async () => {
    const issued: string[] = [];
    const spy: PoolLike = {
      query: ((t: string, p?: unknown[]) => pool.query(t, p)) as PoolLike["query"],
      connect: async () => {
        const c = await pool.connect();
        return {
          query: ((t: string, p?: unknown[]) => {
            issued.push(String(t).trim().split(/\s+/)[0].toUpperCase());
            return c.query(t, p);
          }) as PoolLike["query"],
          release: () => c.release(),
        };
      },
    };
    await expect(
      withTransaction(spy, async (c) => {
        await c.query(`SELECT 1`);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(issued).toContain("BEGIN");
    expect(issued).toContain("ROLLBACK");
  });
});

describe("deletion", () => {
  it("deletes a project and its children, preserving the audit trail", async () => {
    const p = await repo.createProject("P");
    const t = await repo.addTarget(p.id, "https://site.test");
    const a = await repo.createAssessment({ projectId: p.id, targetId: t.id, targetUrl: "https://site.test/" });
    await repo.persistFindings(a.id, [finding("NJ-a")]);

    await repo.deleteProject(p.id);
    await expect(repo.getProject(p.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await repo.listFindings(a.id)).toHaveLength(0);

    const { rows } = await pool.query(`SELECT * FROM audit_events WHERE action='project.deleted'`);
    expect(rows.length).toBe(1);
  });
});
