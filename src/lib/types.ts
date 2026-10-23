export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type FindingStatus = "open" | "reviewing" | "remediated" | "accepted";

export type ScanStatus = "queued" | "running" | "completed" | "failed";

export interface Evidence {
  /** where the observation was made */
  location: string;
  /** short, masked request line if relevant */
  request?: string;
  /** short, masked response excerpt if relevant */
  response?: string;
  /** any other technical snippet, already masked for secrets */
  snippet?: string;
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  /** host or URL the finding applies to */
  target: string;
  category: string;
  status: FindingStatus;
  firstSeen: string; // ISO date
  lastSeen: string; // ISO date
  /** the raw observation, stated factually */
  observation: string;
  /** interpretation of why it matters */
  risk: string;
  /** recommended remediation */
  recommendation: string;
  evidence: Evidence;
  /** always true in this build: data is demonstrative, not a live scan */
  demo: true;
}

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface Scan {
  id: string;
  target: string;
  startedAt: string; // ISO
  finishedAt?: string; // ISO
  status: ScanStatus;
  counts: SeverityCounts;
  requests: number;
  durationMs: number;
  demo: true;
}

export const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

export const STATUS_LABEL: Record<FindingStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  remediated: "Remediated",
  accepted: "Accepted risk",
};
