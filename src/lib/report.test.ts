import { describe, it, expect } from "vitest";
import { buildMarkdown } from "./report";
import { DEMO_FINDINGS } from "./demo";
import type { Finding, FindingStatus } from "./types";

const identityStatus = (f: Finding): FindingStatus => f.status;

describe("buildMarkdown", () => {
  it("starts with a report heading and a count", () => {
    const md = buildMarkdown(DEMO_FINDINGS, identityStatus);
    expect(md).toContain("# NIGHTJAR findings report");
    expect(md).toContain(`${DEMO_FINDINGS.length} findings`);
  });

  it("includes each finding id as a section", () => {
    const md = buildMarkdown(DEMO_FINDINGS, identityStatus);
    for (const f of DEMO_FINDINGS) {
      expect(md).toContain(`[${f.id}] ${f.title}`);
    }
  });

  it("reflects a status override, not the stored status", () => {
    const f = DEMO_FINDINGS[0];
    const md = buildMarkdown([f], () => "remediated");
    expect(md).toContain("**Status:** Remediated");
  });

  it("wraps evidence snippets in a code fence and keeps them masked", () => {
    const withSnippet = DEMO_FINDINGS.find((f) => f.evidence.snippet)!;
    const md = buildMarkdown([withSnippet], identityStatus);
    expect(md).toContain("```");
    expect(md).not.toMatch(/password\s*=\s*\w{6,}/i);
  });
});
