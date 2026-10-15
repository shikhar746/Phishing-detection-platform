import { describe, expect, it } from "vitest";
import { accessFor, gate, visibleRoutes } from "@/components/layout/routes";
import type { User } from "@phishlens/core";

const member: User = { id: "u1", email: "m@example.com", name: "Member", role: "user" };
const admin: User = { ...member, id: "u2", role: "admin" };

describe("accessFor", () => {
  it("reads access from the route table, including nested paths", () => {
    expect(accessFor("/scanner")).toBe("public");
    expect(accessFor("/dashboard")).toBe("user");
    expect(accessFor("/admin")).toBe("admin");
    expect(accessFor("/admin/users")).toBe("admin");
  });

  it("does not treat a prefix-sharing path as the same route", () => {
    expect(accessFor("/administrator")).toBe("user");
  });

  it("defaults unknown pages to signed-in only", () => {
    expect(accessFor("/settings")).toBe("user");
  });
});

describe("gate", () => {
  it("always allows public pages, even while the session loads", () => {
    expect(gate("public", { user: null, loading: true })).toBe("allow");
  });

  it("waits for the session before deciding on protected pages", () => {
    expect(gate("user", { user: null, loading: true })).toBe("checking");
    expect(gate("admin", { user: null, loading: true })).toBe("checking");
  });

  it("sends signed-out visitors to sign in", () => {
    expect(gate("user", { user: null, loading: false })).toBe("login");
    expect(gate("admin", { user: null, loading: false })).toBe("login");
  });

  it("keeps non-admins out of admin pages", () => {
    expect(gate("admin", { user: member, loading: false })).toBe("forbidden");
    expect(gate("admin", { user: admin, loading: false })).toBe("allow");
    expect(gate("user", { user: member, loading: false })).toBe("allow");
  });
});

describe("visibleRoutes", () => {
  it("shows the admin link only to admins", () => {
    const hrefs = (u: User | null) => visibleRoutes(u).map((r) => r.href);
    expect(hrefs(null)).toEqual(["/dashboard", "/scanner", "/reports"]);
    expect(hrefs(member)).not.toContain("/admin");
    expect(hrefs(admin)).toContain("/admin");
  });
});
