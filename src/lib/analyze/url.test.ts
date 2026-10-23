import { describe, it, expect } from "vitest";
import { analyzeUrl } from "./url";

const ids = (s: string) => analyzeUrl(s).indicators.map((i) => i.id);

describe("analyzeUrl", () => {
  it("rejects empty and unparseable input", () => {
    expect(analyzeUrl("").valid).toBe(false);
    expect(analyzeUrl("http://  spaces in host").valid).toBe(false);
  });

  it("treats a plain https domain as clear", () => {
    const a = analyzeUrl("https://example.com/path");
    expect(a.valid).toBe(true);
    expect(a.concern).toBe("clear");
    expect(a.indicators).toHaveLength(0);
  });

  it("flags userinfo obfuscation (user@host) as high", () => {
    const a = analyzeUrl("https://paypal.com@evil.example/login");
    expect(a.hostname).toBe("evil.example");
    expect(ids("https://paypal.com@evil.example/login")).toContain("userinfo");
    expect(a.concern).toBe("high");
  });

  it("flags punycode / IDN hostnames", () => {
    expect(ids("https://xn--pypal-4ve.com")).toContain("punycode");
  });

  it("flags a raw IP host", () => {
    expect(ids("http://93.184.216.34/login")).toContain("ip");
  });

  it("flags a brand term used away from the registered domain", () => {
    const a = analyzeUrl("https://paypal.secure-login.example/");
    expect(a.indicators.map((i) => i.id)).toContain("brand");
  });

  it("does not flag the brand on its own domain", () => {
    expect(ids("https://www.paypal.com/account")).not.toContain("brand");
  });

  it("flags a higher-risk TLD and plain HTTP", () => {
    const got = ids("http://login-update.tk/");
    expect(got).toContain("tld");
    expect(got).toContain("http");
  });
});
