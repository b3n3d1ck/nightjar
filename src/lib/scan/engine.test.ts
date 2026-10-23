import { describe, it, expect } from "vitest";
import { ipIsPrivate, mask, sameHostPath } from "./engine";

describe("ipIsPrivate (SSRF guard classification)", () => {
  it("treats private, loopback, and link-local ranges as private", () => {
    for (const ip of [
      "10.0.0.5",
      "127.0.0.1",
      "169.254.169.254", // cloud metadata
      "192.168.1.1",
      "172.16.0.1",
      "172.31.255.255",
      "100.64.0.1", // CGNAT
      "::1",
      "fe80::1",
      "fc00::1",
      "::ffff:10.0.0.1", // IPv4-mapped IPv6
    ]) {
      expect(ipIsPrivate(ip), ip).toBe(true);
    }
  });

  it("treats public addresses as public", () => {
    for (const ip of ["93.184.216.34", "8.8.8.8", "1.1.1.1", "172.15.0.1", "173.0.0.1"]) {
      expect(ipIsPrivate(ip), ip).toBe(false);
    }
  });
});

describe("mask", () => {
  it("redacts password-like values and base64 blobs", () => {
    const out = mask('DB_PASSWORD=supersecret123 token="QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVow"');
    expect(out).not.toContain("supersecret123");
    expect(out).not.toContain("QUJDREVGR0hJSkt");
  });

  it("truncates very long content", () => {
    expect(mask("x".repeat(500)).length).toBeLessThanOrEqual(210);
  });
});

describe("sameHostPath", () => {
  const base = new URL("https://site.example/app");
  it("returns the path for same-host and relative refs", () => {
    expect(sameHostPath(base, "/login")).toBe("/login");
    expect(sameHostPath(base, "https://site.example/a/b?x=1")).toBe("/a/b?x=1");
  });
  it("rejects other hosts and non-navigational schemes", () => {
    expect(sameHostPath(base, "https://evil.example/x")).toBeNull();
    expect(sameHostPath(base, "mailto:a@b.com")).toBeNull();
    expect(sameHostPath(base, "javascript:alert(1)")).toBeNull();
  });
});
