// Auth against the Express API (POST /api/auth/login | register | google |
// logout, GET /api/auth/me), which sets httpOnly JWT cookies.

import { USE_MOCKS } from "@/lib/config";
import { api, ApiError } from "@/lib/api/client";
import { mockAuthService } from "@/lib/mock/services/auth";
import type { User } from "@/lib/types";

export interface LoginInput {
  email: string;
  password: string;
}
export interface RegisterInput extends LoginInput {
  name: string;
}

export interface AuthService {
  /** The signed-in user, or null when there is no session. */
  me(): Promise<User | null>;
  login(input: LoginInput): Promise<User>;
  register(input: RegisterInput): Promise<User>;
  /** Exchanges the ID token from Google Identity Services for a session. */
  google(credential: string): Promise<User>;
  logout(): Promise<void>;
}

const httpAuthService: AuthService = {
  async me() {
    try {
      return (await api.get<{ user: User }>("/api/auth/me")).user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },
  login: async (input) => (await api.post<{ user: User }>("/api/auth/login", input)).user,
  register: async (input) => (await api.post<{ user: User }>("/api/auth/register", input)).user,
  google: async (credential) => (await api.post<{ user: User }>("/api/auth/google", { credential })).user,
  logout: async () => {
    await api.post("/api/auth/logout");
  },
};

export const authService: AuthService = USE_MOCKS ? mockAuthService : httpAuthService;
