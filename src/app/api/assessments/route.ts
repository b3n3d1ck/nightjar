import { NextResponse } from "next/server";
import { getRepo, errorResponse, readJson } from "@/lib/db/api";
import {
  scan, ScanRejected, SCANNER_VERSION, ALL_CATEGORIES,
  type ScanScope, type CheckCategory,
} from "@/lib/scan/engine";

export const maxDuration = 30;

function buildScope(input: unknown): ScanScope {
  if (!input || typeof input !== "object") return {};
  const o = input as Record<string, unknown>;
  const s: ScanScope = {};
  if (typeof o.authorizationRef === "string") s.authorizationRef = o.authorizationRef.slice(0, 200);
  if (Array.isArray(o.allowedHosts))
    s.allowedHosts = o.allowedHosts.filter((h): h is string => typeof h === "string").slice(0, 20);
  if (Array.isArray(o.categories))
    s.categories = o.categories.filter(
      (c): c is CheckCategory => typeof c === "string" && (ALL_CATEGORIES as string[]).includes(c),
    );
  return s;
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    if (body.authorized !== true) {
      return NextResponse.json(
        { error: "You must confirm you are authorized to test this target." },
        { status: 403 },
      );
    }
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url || url.length > 2048) {
      return NextResponse.json({ error: "A valid target URL is required." }, { status: 400 });
    }

    const repo = getRepo();

    // scope: a stored scope record wins; otherwise accept an inline scope
    let scope: ScanScope;
    let scopeId: string | null = null;
    if (typeof body.scopeId === "string") {
      const rec = await repo.getScope(body.scopeId); // 404 if missing
      scopeId = rec.id;
      scope = {
        authorizationRef: rec.authorizationRef ?? undefined,
        allowedHosts: rec.allowedHosts,
        categories: rec.categories as CheckCategory[],
        window:
          rec.windowStart || rec.windowEnd
            ? { start: rec.windowStart ?? undefined, end: rec.windowEnd ?? undefined }
            : undefined,
      };
    } else {
      scope = buildScope(body.scope);
    }

    const assessment = await repo.createAssessment({
      projectId: String(body.projectId ?? ""),
      targetId: String(body.targetId ?? ""),
      scopeId,
      targetUrl: url,
      scannerVersion: SCANNER_VERSION,
    });
    await repo.setAssessmentStatus(assessment.id, "running", { startedAt: new Date().toISOString() });

    try {
      const result = await scan(url, { scope });
      const saved = await repo.saveScanResult(assessment.id, result);
      const findings = await repo.listFindings(assessment.id, { limit: 500 });
      return NextResponse.json({ assessment: saved, findings }, { status: 201 });
    } catch (scanErr) {
      const msg = scanErr instanceof ScanRejected ? scanErr.message : "The scan could not complete.";
      await repo.setAssessmentStatus(assessment.id, "failed", {
        error: msg,
        finishedAt: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: msg, assessmentId: assessment.id },
        { status: scanErr instanceof ScanRejected ? 400 : 502 },
      );
    }
  } catch (e) {
    return errorResponse(e);
  }
}
