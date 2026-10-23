import { describe, it, expect } from "vitest";
import { DEMO_FINDINGS, DEMO_SCANS, totalCounts } from "./demo";

describe("demo data integrity", () => {
  it("marks every finding and scan as demo", () => {
    expect(DEMO_FINDINGS.every((f) => f.demo === true)).toBe(true);
    expect(DEMO_SCANS.every((s) => s.demo === true)).toBe(true);
  });

  it("has unique finding ids", () => {
    const ids = DEMO_FINDINGS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("totalCounts", () => {
  it("sums severity counts across scans", () => {
    const t = totalCounts(DEMO_SCANS);
    const manual = DEMO_SCANS.reduce((n, s) => n + s.counts.critical, 0);
    expect(t.critical).toBe(manual);
  });

  it("returns zeros for an empty list", () => {
    expect(totalCounts([])).toEqual({
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    });
  });
});
