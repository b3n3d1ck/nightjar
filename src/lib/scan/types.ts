import type { Severity } from "@/lib/types";

export interface ScanEvidence {
  location: string;
  request?: string;
  response?: string;
  snippet?: string;
}

export type Confidence = "confirmed" | "potential" | "informational";

export interface ScanFinding {
  /** stable, deterministic id derived from category + title + location */
  id: string;
  title: string;
  severity: Severity;
  confidence: Confidence;
  category: string;
  observation: string;
  risk: string;
  recommendation: string;
  evidence: ScanEvidence;
  references: string[];
  scannerVersion: string;
  detectedAt: string;
}

export interface ScanPath {
  path: string;
  status: number;
  title?: string;
}

export interface ScanResult {
  target: string;
  ips: string[];
  reverseDns: string[];
  server: string | null;
  tech: string[];
  paths: ScanPath[];
  findings: ScanFinding[];
  requests: number;
  durationMs: number;
  scannedAt: string;
  scannerVersion: string;
  /** notes about the run itself: skipped checks, off-scope redirects, etc. */
  notes: string[];
  /** the scope the scan was run under */
  scope: {
    authorizationRef?: string;
    allowedHosts: string[];
    categories: string[];
  };
  live: true;
}

export interface ScanError {
  error: string;
}
