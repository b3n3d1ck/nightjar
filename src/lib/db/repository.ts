import { randomUUID } from "node:crypto";
import type { PoolLike, Queryable } from "./client";
import { withTransaction } from "./client";
import type { ScanFinding, ScanResult } from "@/lib/scan/types";
import {
  type Assessment,
  type AssessmentStatus,
  type AuditEvent,
  type Finding,
  type FindingLifecycle,
  type Project,
  type Scope,
  type Target,
  ASSESSMENT_STATUSES,
  FINDING_STATUSES,
  NotFoundError,
  ValidationError,
} from "./types";
import type { Severity } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUuid(id: unknown, field = "id"): string {
  if (typeof id !== "string" || !UUID_RE.test(id)) throw new ValidationError(`Invalid ${field}.`);
  return id;
}
function requireText(v: unknown, field: string, max = 2000): string {
  if (typeof v !== "string" || v.trim() === "") throw new ValidationError(`${field} is required.`);
  if (v.length > max) throw new ValidationError(`${field} is too long.`);
  return v.trim();
}

/* ---- row → domain mappers ------------------------------------------------ */

type Row = Record<string, unknown>;
const asArr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : typeof v === "string" ? JSON.parse(v) : []);
const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : typeof v === "string" ? JSON.parse(v) : {};
const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v));
const isoN = (v: unknown): string | null => (v == null ? null : iso(v));

const mapProject = (r: Row): Project => ({
  id: r.id as string, name: r.name as string, createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
});
const mapTarget = (r: Row): Target => ({
  id: r.id as string, projectId: r.project_id as string, value: r.value as string,
  kind: r.kind as string, createdAt: iso(r.created_at),
});
const mapScope = (r: Row): Scope => ({
  id: r.id as string, projectId: r.project_id as string,
  authorizationRef: (r.authorization_ref as string) ?? null,
  allowedHosts: asArr(r.allowed_hosts), categories: asArr(r.categories),
  windowStart: isoN(r.window_start), windowEnd: isoN(r.window_end), createdAt: iso(r.created_at),
});
const mapAssessment = (r: Row): Assessment => ({
  id: r.id as string, projectId: r.project_id as string, targetId: r.target_id as string,
  scopeId: (r.scope_id as string) ?? null, status: r.status as AssessmentStatus,
  targetUrl: r.target_url as string, scannerVersion: (r.scanner_version as string) ?? null,
  requests: (r.requests as number) ?? null, durationMs: (r.duration_ms as number) ?? null,
  error: (r.error as string) ?? null, startedAt: isoN(r.started_at), finishedAt: isoN(r.finished_at),
  createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
});
const mapFinding = (r: Row): Finding => ({
  id: r.id as string, assessmentId: r.assessment_id as string, key: r.finding_key as string,
  title: r.title as string, severity: r.severity as Severity, confidence: r.confidence as string,
  category: r.category as string, location: (r.location as string) ?? null,
  observation: (r.observation as string) ?? null, risk: (r.risk as string) ?? null,
  recommendation: (r.recommendation as string) ?? null, evidence: asObj(r.evidence),
  references: asArr(r.refs), scannerVersion: (r.scanner_version as string) ?? null,
  status: r.status as FindingLifecycle, createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
});
const mapAudit = (r: Row): AuditEvent => ({
  id: r.id as string, projectId: (r.project_id as string) ?? null,
  assessmentId: (r.assessment_id as string) ?? null, action: r.action as string,
  detail: asObj(r.detail), createdAt: iso(r.created_at),
});

function clampLimit(n: unknown, def = 50, max = 500): number {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return def;
  return Math.min(Math.floor(v), max);
}
function clampOffset(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/* ---- repository ---------------------------------------------------------- */

export class Repository {
  constructor(private readonly pool: PoolLike) {}

  private async audit(
    c: Queryable,
    e: { projectId?: string | null; assessmentId?: string | null; action: string; detail?: Record<string, unknown> },
  ): Promise<void> {
    await c.query(
      `INSERT INTO audit_events(id, project_id, assessment_id, action, detail)
       VALUES ($1,$2,$3,$4,$5)`,
      [randomUUID(), e.projectId ?? null, e.assessmentId ?? null, e.action, JSON.stringify(e.detail ?? {})],
    );
  }

  // --- projects ---
  async createProject(name: string): Promise<Project> {
    const n = requireText(name, "name", 200);
    const id = randomUUID();
    return withTransaction(this.pool, async (c) => {
      const { rows } = await c.query<Row>(
        `INSERT INTO projects(id, name) VALUES ($1,$2) RETURNING *`, [id, n],
      );
      await this.audit(c, { projectId: id, action: "project.created", detail: { name: n } });
      return mapProject(rows[0]);
    });
  }

  async getProject(id: string): Promise<Project> {
    const { rows } = await this.pool.query<Row>(`SELECT * FROM projects WHERE id = $1`, [requireUuid(id)]);
    if (!rows[0]) throw new NotFoundError("Project not found.");
    return mapProject(rows[0]);
  }

  async listProjects(opts: { limit?: number; offset?: number } = {}): Promise<Project[]> {
    const { rows } = await this.pool.query<Row>(
      `SELECT * FROM projects ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [clampLimit(opts.limit), clampOffset(opts.offset)],
    );
    return rows.map(mapProject);
  }

  // --- targets ---
  async addTarget(projectId: string, value: string, kind = "url"): Promise<Target> {
    const pid = requireUuid(projectId, "projectId");
    const v = requireText(value, "target value", 2000);
    await this.getProject(pid); // 404 if missing (also enforces FK clearly)
    const { rows } = await this.pool.query<Row>(
      `INSERT INTO targets(id, project_id, value, kind) VALUES ($1,$2,$3,$4)
       ON CONFLICT (project_id, value) DO UPDATE SET value = EXCLUDED.value
       RETURNING *`,
      [randomUUID(), pid, v, kind === "host" ? "host" : "url"],
    );
    return mapTarget(rows[0]);
  }

  async listTargets(projectId: string): Promise<Target[]> {
    const { rows } = await this.pool.query<Row>(
      `SELECT * FROM targets WHERE project_id = $1 ORDER BY created_at`, [requireUuid(projectId, "projectId")],
    );
    return rows.map(mapTarget);
  }

  // --- scopes ---
  async createScope(
    projectId: string,
    input: { authorizationRef?: string; allowedHosts?: string[]; categories?: string[]; windowStart?: string; windowEnd?: string } = {},
  ): Promise<Scope> {
    const pid = requireUuid(projectId, "projectId");
    await this.getProject(pid);
    const { rows } = await this.pool.query<Row>(
      `INSERT INTO scopes(id, project_id, authorization_ref, allowed_hosts, categories, window_start, window_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        randomUUID(), pid, input.authorizationRef ?? null,
        JSON.stringify(input.allowedHosts ?? []), JSON.stringify(input.categories ?? []),
        input.windowStart ?? null, input.windowEnd ?? null,
      ],
    );
    return mapScope(rows[0]);
  }

  async getScope(id: string): Promise<Scope> {
    const { rows } = await this.pool.query<Row>(`SELECT * FROM scopes WHERE id = $1`, [requireUuid(id)]);
    if (!rows[0]) throw new NotFoundError("Scope not found.");
    return mapScope(rows[0]);
  }

  // --- assessments ---
  async createAssessment(input: {
    projectId: string; targetId: string; scopeId?: string | null; targetUrl: string;
    scannerVersion?: string; status?: AssessmentStatus;
  }): Promise<Assessment> {
    const pid = requireUuid(input.projectId, "projectId");
    const tid = requireUuid(input.targetId, "targetId");
    const sid = input.scopeId ? requireUuid(input.scopeId, "scopeId") : null;
    const url = requireText(input.targetUrl, "targetUrl", 2048);
    const status = input.status && ASSESSMENT_STATUSES.includes(input.status) ? input.status : "queued";
    const id = randomUUID();
    return withTransaction(this.pool, async (c) => {
      const { rows } = await c.query<Row>(
        `INSERT INTO assessments(id, project_id, target_id, scope_id, status, target_url, scanner_version)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [id, pid, tid, sid, status, url, input.scannerVersion ?? null],
      );
      await this.audit(c, { projectId: pid, assessmentId: id, action: "assessment.created", detail: { targetUrl: url } });
      return mapAssessment(rows[0]);
    });
  }

  async setAssessmentStatus(
    id: string, status: AssessmentStatus,
    patch: { startedAt?: string; finishedAt?: string; requests?: number; durationMs?: number; error?: string } = {},
  ): Promise<Assessment> {
    const aid = requireUuid(id);
    if (!ASSESSMENT_STATUSES.includes(status)) throw new ValidationError("Invalid status.");
    return withTransaction(this.pool, async (c) => {
      const { rows } = await c.query<Row>(
        `UPDATE assessments SET status=$2, started_at=COALESCE($3, started_at),
           finished_at=COALESCE($4, finished_at), requests=COALESCE($5, requests),
           duration_ms=COALESCE($6, duration_ms), error=COALESCE($7, error), updated_at=now()
         WHERE id=$1 RETURNING *`,
        [aid, status, patch.startedAt ?? null, patch.finishedAt ?? null,
         patch.requests ?? null, patch.durationMs ?? null, patch.error ?? null],
      );
      if (!rows[0]) throw new NotFoundError("Assessment not found.");
      await this.audit(c, { assessmentId: aid, projectId: rows[0].project_id as string, action: "assessment.status", detail: { to: status } });
      return mapAssessment(rows[0]);
    });
  }

  async getAssessment(id: string): Promise<Assessment> {
    const { rows } = await this.pool.query<Row>(`SELECT * FROM assessments WHERE id=$1`, [requireUuid(id)]);
    if (!rows[0]) throw new NotFoundError("Assessment not found.");
    return mapAssessment(rows[0]);
  }

  // --- findings ---
  private async upsertFinding(c: Queryable, assessmentId: string, f: ScanFinding): Promise<void> {
    await c.query(
      `INSERT INTO findings(id, assessment_id, finding_key, title, severity, confidence, category,
         location, observation, risk, recommendation, evidence, refs, scanner_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (assessment_id, finding_key) DO UPDATE SET
         title=EXCLUDED.title, severity=EXCLUDED.severity, confidence=EXCLUDED.confidence,
         category=EXCLUDED.category, location=EXCLUDED.location, observation=EXCLUDED.observation,
         risk=EXCLUDED.risk, recommendation=EXCLUDED.recommendation, evidence=EXCLUDED.evidence,
         refs=EXCLUDED.refs, scanner_version=EXCLUDED.scanner_version, updated_at=now()`,
      [
        randomUUID(), assessmentId, f.id, f.title, f.severity, f.confidence, f.category,
        f.evidence.location ?? null, f.observation ?? null, f.risk ?? null, f.recommendation ?? null,
        JSON.stringify(f.evidence ?? {}), JSON.stringify(f.references ?? []), f.scannerVersion ?? null,
      ],
    );
  }

  /** Idempotent: re-running with the same findings updates in place, never duplicates. */
  async persistFindings(assessmentId: string, findings: ScanFinding[]): Promise<number> {
    const aid = requireUuid(assessmentId, "assessmentId");
    return withTransaction(this.pool, async (c) => {
      const { rows } = await c.query<Row>(`SELECT id FROM assessments WHERE id=$1`, [aid]);
      if (!rows[0]) throw new NotFoundError("Assessment not found.");
      for (const f of findings) await this.upsertFinding(c, aid, f);
      return findings.length;
    });
  }

  /** Persist a full scan result atomically: mark completed + upsert findings + audit. */
  async saveScanResult(assessmentId: string, result: ScanResult): Promise<Assessment> {
    const aid = requireUuid(assessmentId, "assessmentId");
    return withTransaction(this.pool, async (c) => {
      const { rows } = await c.query<Row>(
        `UPDATE assessments SET status='completed', scanner_version=$2, requests=$3,
           duration_ms=$4, finished_at=now(), updated_at=now() WHERE id=$1 RETURNING *`,
        [aid, result.scannerVersion, result.requests, result.durationMs],
      );
      if (!rows[0]) throw new NotFoundError("Assessment not found.");
      for (const f of result.findings) await this.upsertFinding(c, aid, f);
      await this.audit(c, {
        assessmentId: aid, projectId: rows[0].project_id as string, action: "assessment.completed",
        detail: { findings: result.findings.length, requests: result.requests },
      });
      return mapAssessment(rows[0]);
    });
  }

  async listFindings(
    assessmentId: string,
    opts: { severity?: string; status?: string; limit?: number; offset?: number } = {},
  ): Promise<Finding[]> {
    const aid = requireUuid(assessmentId, "assessmentId");
    const conds = ["assessment_id = $1"];
    const params: unknown[] = [aid];
    if (opts.severity) { params.push(opts.severity); conds.push(`severity = $${params.length}`); }
    if (opts.status) { params.push(opts.status); conds.push(`status = $${params.length}`); }
    params.push(clampLimit(opts.limit));
    params.push(clampOffset(opts.offset));
    const { rows } = await this.pool.query<Row>(
      `SELECT * FROM findings WHERE ${conds.join(" AND ")}
       ORDER BY created_at LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return rows.map(mapFinding);
  }

  async getAssessmentWithFindings(id: string): Promise<{ assessment: Assessment; findings: Finding[] }> {
    const assessment = await this.getAssessment(id);
    const findings = await this.listFindings(id, { limit: 500 });
    return { assessment, findings };
  }

  async updateFindingStatus(findingId: string, status: FindingLifecycle): Promise<Finding> {
    const fid = requireUuid(findingId, "findingId");
    if (!FINDING_STATUSES.includes(status)) throw new ValidationError("Invalid finding status.");
    return withTransaction(this.pool, async (c) => {
      const { rows } = await c.query<Row>(
        `UPDATE findings SET status=$2, updated_at=now() WHERE id=$1 RETURNING *`, [fid, status],
      );
      if (!rows[0]) throw new NotFoundError("Finding not found.");
      await this.audit(c, { assessmentId: rows[0].assessment_id as string, action: "finding.status", detail: { findingId: fid, to: status } });
      return mapFinding(rows[0]);
    });
  }

  // --- audit ---
  async listAudit(assessmentId: string, opts: { limit?: number } = {}): Promise<AuditEvent[]> {
    const { rows } = await this.pool.query<Row>(
      `SELECT * FROM audit_events WHERE assessment_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [requireUuid(assessmentId, "assessmentId"), clampLimit(opts.limit, 100)],
    );
    return rows.map(mapAudit);
  }

  // --- deletion (explicit, transactional, preserves audit trail) ---
  async deleteProject(id: string): Promise<void> {
    const pid = requireUuid(id);
    await withTransaction(this.pool, async (c) => {
      const { rows } = await c.query<Row>(`SELECT name FROM projects WHERE id=$1`, [pid]);
      if (!rows[0]) throw new NotFoundError("Project not found.");
      // keep an append-only record of the deletion (project_id NULL so it survives)
      await c.query(
        `UPDATE audit_events SET project_id=NULL WHERE project_id=$1`, [pid],
      );
      await this.audit(c, { action: "project.deleted", detail: { projectId: pid, name: rows[0].name } });
      await c.query(
        `DELETE FROM findings WHERE assessment_id IN (SELECT id FROM assessments WHERE project_id=$1)`, [pid],
      );
      await c.query(`DELETE FROM assessments WHERE project_id=$1`, [pid]);
      await c.query(`DELETE FROM scopes WHERE project_id=$1`, [pid]);
      await c.query(`DELETE FROM targets WHERE project_id=$1`, [pid]);
      await c.query(`DELETE FROM projects WHERE id=$1`, [pid]);
    });
  }
}
