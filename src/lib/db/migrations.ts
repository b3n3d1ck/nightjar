/**
 * Version-controlled migrations. Each entry has an idempotent-safe `up` and a
 * `down` for rollback/recovery. They are applied in order by `applyMigrations`
 * and recorded in `schema_migrations`.
 *
 * Design notes:
 * - UUIDs are generated in the application (crypto.randomUUID), so no DB uuid
 *   extension is required and the schema stays portable (and pg-mem-testable).
 * - Array-shaped values (allowed hosts, categories, references) are stored as
 *   `jsonb` rather than `text[]` for broad client/test compatibility.
 * - Audit events survive deletion of the project/assessment they reference
 *   (ON DELETE SET NULL) so history is never silently erased.
 */
export interface Migration {
  version: string;
  up: string;
  down: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: "0001_init",
    up: `
      CREATE TABLE IF NOT EXISTS projects (
        id          uuid PRIMARY KEY,
        name        text NOT NULL,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS targets (
        id          uuid PRIMARY KEY,
        project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        value       text NOT NULL,
        kind        text NOT NULL DEFAULT 'url',
        created_at  timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, value)
      );
      CREATE INDEX IF NOT EXISTS idx_targets_project ON targets(project_id);

      CREATE TABLE IF NOT EXISTS scopes (
        id                uuid PRIMARY KEY,
        project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        authorization_ref text,
        allowed_hosts     jsonb NOT NULL DEFAULT '[]',
        categories        jsonb NOT NULL DEFAULT '[]',
        window_start      timestamptz,
        window_end        timestamptz,
        created_at        timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_scopes_project ON scopes(project_id);

      CREATE TABLE IF NOT EXISTS assessments (
        id              uuid PRIMARY KEY,
        project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        target_id       uuid NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
        scope_id        uuid REFERENCES scopes(id) ON DELETE SET NULL,
        status          text NOT NULL DEFAULT 'queued',
        target_url      text NOT NULL,
        scanner_version text,
        requests        integer,
        duration_ms     integer,
        error           text,
        started_at      timestamptz,
        finished_at     timestamptz,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_assessments_project ON assessments(project_id);

      CREATE TABLE IF NOT EXISTS findings (
        id              uuid PRIMARY KEY,
        assessment_id   uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        finding_key     text NOT NULL,
        title           text NOT NULL,
        severity        text NOT NULL,
        confidence      text NOT NULL,
        category        text NOT NULL,
        location        text,
        observation     text,
        risk            text,
        recommendation  text,
        evidence        jsonb NOT NULL DEFAULT '{}',
        refs            jsonb NOT NULL DEFAULT '[]',
        scanner_version text,
        status          text NOT NULL DEFAULT 'open',
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now(),
        UNIQUE (assessment_id, finding_key)
      );
      CREATE INDEX IF NOT EXISTS idx_findings_assessment ON findings(assessment_id);
      CREATE INDEX IF NOT EXISTS idx_findings_assessment_sev ON findings(assessment_id, severity);

      CREATE TABLE IF NOT EXISTS audit_events (
        id            uuid PRIMARY KEY,
        project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,
        assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
        action        text NOT NULL,
        detail        jsonb NOT NULL DEFAULT '{}',
        created_at    timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_assessment ON audit_events(assessment_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at);
    `,
    down: `
      DROP TABLE IF EXISTS audit_events;
      DROP TABLE IF EXISTS findings;
      DROP TABLE IF EXISTS assessments;
      DROP TABLE IF EXISTS scopes;
      DROP TABLE IF EXISTS targets;
      DROP TABLE IF EXISTS projects;
    `,
  },
];
