import type { Finding, FindingStatus } from "./types";
import { SEVERITY_LABEL, STATUS_LABEL, SEVERITY_ORDER } from "./types";

/** Build a Markdown report from a set of findings. Pure — safe anywhere. */
export function buildMarkdown(
  findings: Finding[],
  statusOf: (f: Finding) => FindingStatus,
): string {
  const now = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`# NIGHTJAR findings report`);
  lines.push(``);
  lines.push(`Generated ${now} · ${findings.length} findings · demonstration data`);
  lines.push(``);

  const bySev = SEVERITY_ORDER.map(
    (s) => `${SEVERITY_LABEL[s]}: ${findings.filter((f) => f.severity === s).length}`,
  ).join(" · ");
  lines.push(`**Severity breakdown** — ${bySev}`);
  lines.push(``);
  lines.push(`---`);

  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );

  for (const f of sorted) {
    lines.push(``);
    lines.push(`## [${f.id}] ${f.title}`);
    lines.push(``);
    lines.push(`- **Severity:** ${SEVERITY_LABEL[f.severity]}`);
    lines.push(`- **Status:** ${STATUS_LABEL[statusOf(f)]}`);
    lines.push(`- **Target:** ${f.target}`);
    lines.push(`- **Category:** ${f.category}`);
    lines.push(`- **Location:** ${f.evidence.location}`);
    lines.push(``);
    lines.push(`**Observation.** ${f.observation}`);
    lines.push(``);
    lines.push(`**Risk.** ${f.risk}`);
    lines.push(``);
    lines.push(`**Recommendation.** ${f.recommendation}`);
    if (f.evidence.snippet) {
      lines.push(``);
      lines.push("```");
      lines.push(f.evidence.snippet);
      lines.push("```");
    }
    lines.push(``);
    lines.push(`---`);
  }

  return lines.join("\n");
}

/** Trigger a client-side download of text content. */
export function downloadText(filename: string, text: string, type = "text/markdown") {
  if (typeof document === "undefined") return;
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
