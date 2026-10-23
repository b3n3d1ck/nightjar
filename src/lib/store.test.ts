import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useStatusOverrides,
  setFindingStatus,
  resetFindingStatuses,
} from "./store";

describe("finding-status store", () => {
  beforeEach(() => {
    act(() => resetFindingStatuses());
  });

  it("starts empty", () => {
    const { result } = renderHook(() => useStatusOverrides());
    expect(result.current).toEqual({});
  });

  it("records an override and exposes it through the hook", () => {
    const { result } = renderHook(() => useStatusOverrides());
    act(() => setFindingStatus("NJ-1", "remediated"));
    expect(result.current["NJ-1"]).toBe("remediated");
  });

  it("persists to localStorage", () => {
    act(() => setFindingStatus("NJ-2", "reviewing"));
    const raw = window.localStorage.getItem("nightjar.status.v1");
    expect(raw).toContain("reviewing");
  });

  it("reset clears overrides", () => {
    const { result } = renderHook(() => useStatusOverrides());
    act(() => setFindingStatus("NJ-3", "accepted"));
    act(() => resetFindingStatuses());
    expect(result.current).toEqual({});
  });
});
