import { describe, it, expect } from "vitest";
import { formatDuration, formatDate, formatDateTime } from "./format";

describe("formatDuration", () => {
  it("shows seconds under a minute", () => {
    expect(formatDuration(9000)).toBe("9s");
    expect(formatDuration(59000)).toBe("59s");
  });
  it("shows minutes and seconds", () => {
    expect(formatDuration(72000)).toBe("1m 12s");
    expect(formatDuration(158000)).toBe("2m 38s");
  });
  it("drops the seconds when exact", () => {
    expect(formatDuration(120000)).toBe("2m");
  });
});

describe("formatDate / formatDateTime", () => {
  it("includes the year", () => {
    expect(formatDate("2026-02-20")).toContain("2026");
  });
  it("renders a time component", () => {
    expect(formatDateTime("2026-02-20T09:12:00Z")).toMatch(/\d{2}:\d{2}/);
  });
});
