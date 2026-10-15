import { describe, expect, it } from "vitest";
import { validateEmailAddress, validateName, validatePassword } from "@/lib/validation";

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
