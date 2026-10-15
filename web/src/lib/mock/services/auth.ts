import { ApiError } from "@/lib/api/client";
import type { AuthService } from "@/lib/services/auth";
import type { User } from "@/lib/types";
import { hash } from "../seed";
import { db, latency } from "../store";

// Demo accounts: any email works; "admin…" addresses are admins;
// locked@example.com and taken@example.com exercise the error paths.

function demoUser(email: string, name?: string): User {
  const normalized = email.trim().toLowerCase();
  return {
    id: `usr_${hash(normalized).toString(36)}`,
    email: normalized,
    name: name?.trim() || normalized.split("@")[0]!.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    role: normalized.startsWith("admin") ? "admin" : "user",
  };
}

function signIn(user: User): User {
  db.session.set(user);
  return user;
}

export const mockAuthService: AuthService = {
  me: async () => db.session.get(),

  async login({ email }) {
    await latency(500, 900);
    if (email.trim().toLowerCase() === "locked@example.com") {
      throw new ApiError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    return signIn(demoUser(email));
  },

  async register({ email, name }) {
    await latency(600, 1000);
    if (email.trim().toLowerCase() === "taken@example.com") {
      throw new ApiError("Email already registered", 409, "EMAIL_ALREADY_IN_USE");
    }
    return signIn(demoUser(email, name));
  },

  // No Google popup without a real client ID, so sign in a demo Google account.
  async google() {
    await latency(500, 900);
    return signIn(demoUser("demo.google@example.com", "Demo Google User"));
  },

  logout: async () => db.session.clear(),
};
