"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roles: Array<"USER" | "PRODUCER" | "ADMIN">;
  profile?: {
    username?: string;
    displayName?: string;
  };
};

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: CurrentUser | null;
  status: AuthStatus;
  refresh: () => Promise<CurrentUser | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function requestCurrentUser(signal?: AbortSignal) {
  const response = await fetch("/api/auth/me", {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { user: CurrentUser };
  return data.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      const nextUser = await requestCurrentUser();
      if (!nextUser) {
        setUser(null);
        setStatus("anonymous");
        return null;
      }

      setUser(nextUser);
      setStatus("authenticated");
      return nextUser;
    } catch {
      setUser(null);
      setStatus("anonymous");
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    requestCurrentUser(controller.signal)
      .then((nextUser) => {
        setUser(nextUser);
        setStatus(nextUser ? "authenticated" : "anonymous");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setUser(null);
        setStatus("anonymous");
      });

    return () => controller.abort();
  }, []);

  const value = useMemo(() => ({ user, status, refresh, logout }), [logout, refresh, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
