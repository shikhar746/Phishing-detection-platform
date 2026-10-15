import { describe, expect, it } from "vitest";
import {
  normalizeUrl,
  validateEmailAddress,
  validateEmailContent,
  validateKeyword,
  validateName,
  validatePassword,
  validateUrl,
} from "@/lib/validation";

describe("normalizeUrl", () => {
  it("adds http:// only when there is no scheme", () => {
    expect(normalizeUrl("example.com")).toBe("http://example.com");
    expect(normalizeUrl("  https://example.com ")).toBe("https://example.com");
  });
});

describe("validateUrl", () => {
  it.each(["https://example.com", "example.com/login", "http://192.168.0.1/x", "https://xn--pypal-4ve.com"])("accepts %s", (url) => {
    expect(validateUrl(url)).toBeNull();
  });

  it.each([
    ["", /Enter a URL/],
    ["exa mple.com", /spaces/],
    ["ftp://example.com", /http/],
    ["javascript://alert(1)", /http/],
    ["localhost", /full domain/],
    ["https://", /valid URL/],
  ])("rejects %j", (url, message) => {
    expect(validateUrl(url)).toMatch(message);
  });

  it("rejects overly long URLs", () => {
    expect(validateUrl(`https://example.com/${"a".repeat(2100)}`)).toMatch(/too long/);
  });
});

describe("validateEmailContent", () => {
  it("requires enough text", () => {
    expect(validateEmailContent("")).toMatch(/Paste/);
    expect(validateEmailContent("too short")).toMatch(/at least/);
    expect(validateEmailContent("Your bank account will be suspended.")).toBeNull();
    expect(validateEmailContent("x".repeat(20001))).toMatch(/too long/);
  });
});

describe("auth field validation", () => {
  it("checks email addresses", () => {
    expect(validateEmailAddress("me@example.com")).toBeNull();
    expect(validateEmailAddress("me@example")).not.toBeNull();
    expect(validateEmailAddress("")).not.toBeNull();
  });

  it("checks passwords, strictly on register", () => {
    expect(validatePassword("abcdefgh")).toBeNull();
    expect(validatePassword("abcdefgh", { strict: true })).toMatch(/number/);
    expect(validatePassword("abcd1234", { strict: true })).toBeNull();
    expect(validatePassword("short1")).toMatch(/8 characters/);
  });

  it("checks names", () => {
    expect(validateName("A")).not.toBeNull();
    expect(validateName("Ana")).toBeNull();
  });
});

describe("validateKeyword", () => {
  it("rejects duplicates case-insensitively and short terms", () => {
    expect(validateKeyword("Verify", ["verify"])).toMatch(/already/);
    expect(validateKeyword("ab", [])).toMatch(/3 characters/);
    expect(validateKeyword("gift card", [])).toBeNull();
  });
});
