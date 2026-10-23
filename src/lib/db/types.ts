import type { Severity } from "@/lib/types";

export type AssessmentStatus = "queued" | "running" | "completed" | "failed";
export const ASSESSMENT_STATUSES: AssessmentStatus[] = ["queued", "running", "completed", "failed"];

export type FindingLifecycle =
  | "open"
  | "confirmed"
  | "remediated"
  | "accepted"
  | "false_positive";
export const FINDING_STATUSES: FindingLifecycle[] = [
  "open", "confirmed", "remediated", "accepted", "false_positive",
];

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Target {
  id: string;
  projectId: string;
  value: string;
  kind: string;
  createdAt: string;
}

export interface Scope {
  id: string;
  projectId: string;
  authorizationRef: string | null;
  allowedHosts: string[];
  categories: string[];
  windowStart: string | null;
  windowEnd: string | null;
  createdAt: string;
}

export interface Assessment {
  id: string;
  projectId: string;
  targetId: string;
  scopeId: string | null;
  status: AssessmentStatus;
  targetUrl: string;
  scannerVersion: string | null;
  requests: number | null;
  durationMs: number | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Finding {
  id: string;
  assessmentId: string;
  key: string;
  title: string;
  severity: Severity;
  confidence: string;
  category: string;
  location: string | null;
  observation: string | null;
  risk: string | null;
  recommendation: string | null;
  evidence: Record<string, unknown>;
  references: string[];
  scannerVersion: string | null;
  status: FindingLifecycle;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  projectId: string | null;
  assessmentId: string | null;
  action: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

/** Validation error surfaced to the API boundary as a 400. */
export class ValidationError extends Error {}
/** Not-found error surfaced as a 404. */
export class NotFoundError extends Error {}
