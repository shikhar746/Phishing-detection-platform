import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("quotes every cell and escapes quotes", () => {
    expect(toCsv(["a", "b"], [["x", 'say "hi"']])).toBe('"a","b"\n"x","say ""hi"""');
  });

  it.each(["=HYPERLINK(\"http://evil.example\",\"Click\")", "+cmd", "-1+2", "@SUM(A1)", "\tlead"])(
    "neutralizes formula-looking text %j",
    (value) => {
      expect(toCsv(["v"], [[value]]).split("\n")[1]).toMatch(/^"'/);
    },
  );

  it("leaves numbers and ordinary text alone", () => {
    expect(toCsv(["n", "t"], [[-5, "https://example.com"]]).split("\n")[1]).toBe('"-5","https://example.com"');
  });
});
