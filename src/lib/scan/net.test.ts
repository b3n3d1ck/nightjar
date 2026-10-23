import { describe, it, expect } from "vitest";
import { isDisallowedIp, parseIpv4, parseIpv6 } from "./net";

describe("parseIpv4", () => {
  it("parses canonical dotted decimal", () => {
    expect(parseIpv4("127.0.0.1")).toBe(0x7f000001);
    expect(parseIpv4("255.255.255.255")).toBe(0xffffffff);
    expect(parseIpv4("0.0.0.0")).toBe(0);
  });
  it("rejects out-of-range and malformed", () => {
    expect(parseIpv4("256.0.0.1")).toBeNull();
    expect(parseIpv4("1.2.3")).toBeNull();
    expect(parseIpv4("1.2.3.4.5")).toBeNull();
    expect(parseIpv4("x.y.z.w")).toBeNull();
  });
});

describe("isDisallowedIp — IPv4", () => {
  it("blocks every reserved / private range", () => {
    for (const ip of [
      "0.0.0.0", "10.1.2.3", "100.64.5.6", "127.0.0.1", "169.254.169.254",
      "172.16.0.1", "172.31.255.255", "192.0.0.1", "192.0.2.5", "192.88.99.1",
      "192.168.1.1", "198.18.0.9", "198.51.100.3", "203.0.113.7",
      "224.0.0.1", "239.255.255.255", "240.0.0.1", "255.255.255.255",
    ]) {
      expect(isDisallowedIp(ip), ip).toBe(true);
    }
  });
  it("allows ordinary public addresses", () => {
    for (const ip of ["93.184.216.34", "8.8.8.8", "1.1.1.1", "172.15.0.1", "172.32.0.1", "100.63.0.1", "100.128.0.1"]) {
      expect(isDisallowedIp(ip), ip).toBe(false);
    }
  });
});

describe("isDisallowedIp — IPv6", () => {
  it("blocks loopback/unspecified/ULA/link-local/multicast/special", () => {
    for (const ip of [
      "::", "::1", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1",
      "2001:db8::1", "2001:0:abcd::1", "100::1", "2002:c0a8:0101::1",
    ]) {
      expect(isDisallowedIp(ip), ip).toBe(true);
    }
  });
  it("classifies embedded IPv4 (mapped / compatible / NAT64)", () => {
    expect(isDisallowedIp("::ffff:10.0.0.1")).toBe(true);
    expect(isDisallowedIp("::ffff:169.254.169.254")).toBe(true);
    expect(isDisallowedIp("::ffff:93.184.216.34")).toBe(false);
    expect(isDisallowedIp("64:ff9b::10.0.0.1")).toBe(true);
    expect(isDisallowedIp("64:ff9b::93.184.216.34")).toBe(false);
  });
  it("allows ordinary public IPv6", () => {
    expect(isDisallowedIp("2606:4700:4700::1111")).toBe(false);
    expect(isDisallowedIp("2a00:1450:4001:81b::200e")).toBe(false);
  });
});

describe("isDisallowedIp — fail closed", () => {
  it("disallows anything unparseable", () => {
    for (const bad of ["", "not-an-ip", "999.1.1.1", "12345", "::g", "1:2:3:4:5:6:7:8:9"]) {
      expect(isDisallowedIp(bad), bad).toBe(true);
    }
  });
});

describe("parseIpv6", () => {
  it("expands :: and strips zone ids", () => {
    expect(parseIpv6("::1")).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(parseIpv6("fe80::1%eth0")).toEqual([0xfe80, 0, 0, 0, 0, 0, 0, 1]);
  });
  it("rejects malformed", () => {
    expect(parseIpv6("1:2:3:4:5:6:7:8:9")).toBeNull();
    expect(parseIpv6("::ffff:999.1.1.1")).toBeNull();
  });
});
