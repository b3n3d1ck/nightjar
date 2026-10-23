"use client";

import * as React from "react";
import type { FindingStatus } from "./types";

/**
 * Tiny shared store for finding-status overrides, persisted to localStorage and
 * synced across components (and browser tabs) without a dependency. Read through
 * useSyncExternalStore so server and client stay consistent with no effect-time
 * setState.
 */

const KEY = "nightjar.status.v1";
type Overrides = Record<string, FindingStatus>;

const EMPTY: Overrides = {};
let cache: Overrides | null = null;
const listeners = new Set<() => void>();

function read(): Overrides {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Overrides) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function emit() {
  listeners.forEach((l) => l());
}

export function setFindingStatus(id: string, status: FindingStatus) {
  const next = { ...read(), [id]: status };
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  emit();
}

export function resetFindingStatuses() {
  cache = {};
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStatusOverrides(): Overrides {
  return React.useSyncExternalStore(subscribe, read, () => EMPTY);
}
