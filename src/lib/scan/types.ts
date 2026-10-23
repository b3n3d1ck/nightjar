import type { Severity } from "@/lib/types";

export interface ScanEvidence {
  location: string;
  request?: string;
  response?: string;
  snippet?: string;
}

export interface ScanFinding {
  id: string;
  title: string;
  severity: Severity;
  category: string;
  observation: string;
  risk: string;
  recommendation: string;
  evidence: ScanEvidence;
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
  live: true;
}

export interface ScanError {
  error: string;
}
