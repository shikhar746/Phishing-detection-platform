"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService, type LoginInput, type RegisterInput } from "@/lib/services/auth";
import type { User } from "@phishlens/core";

interface Session {
  user: User | null;
  /** True until the first session check finishes. */
  loading: boolean;
}

interface AuthContextValue extends Session {
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  /** Signs in with the ID token returned by Google Identity Services. */
  loginWithGoogle: (credential: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    authService
      .me()
      .catch(() => null)
      .then((user) => {
        if (!cancelled) setSession({ user, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Every way of signing in ends the same way: remember who is signed in.
  const actions = useMemo(() => {
    const signIn =
      <A,>(call: (arg: A) => Promise<User>) =>
      async (arg: A) => {
        const user = await call(arg);
        setSession({ user, loading: false });
        return user;
      };
    return {
      login: signIn((input: LoginInput) => authService.login(input)),
      register: signIn((input: RegisterInput) => authService.register(input)),
      loginWithGoogle: signIn((credential: string) => authService.google(credential)),
      // A full navigation home, rather than clearing the session in place:
      // clearing it while a protected page is mounted would make that page's
      // auth gate race this navigation with a redirect to /login, and a
      // reload also drops any signed-in data still held in memory.
      logout: async () => {
        await authService.logout().catch(() => undefined);
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full reload, see above
        window.location.assign("/");
      },
    };
  }, []);

  const value = useMemo(() => ({ ...session, ...actions }), [session, actions]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
