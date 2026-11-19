"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { LogOutIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";

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
  requestLogout: () => void;
  isLoggingOut: boolean;
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
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const logoutPending = useRef(false);
  const router = useRouter();
  const toast = useToast();

  const channel = useRef<BroadcastChannel | null>(null);
  const sequence = useRef(0);
  const synchronize = useCallback(async (signal?: AbortSignal) => {
    const request = ++sequence.current;
    try {
      const nextUser = await requestCurrentUser(signal);
      if (request === sequence.current && !signal?.aborted) {
        setUser(nextUser);
        setStatus(nextUser ? "authenticated" : "anonymous");
      }
      return nextUser;
    } catch {
      if (request === sequence.current && !signal?.aborted) { setUser(null); setStatus("anonymous"); }
      return null;
    }
  }, []);
  const announce = useCallback(() => {
    try { channel.current?.postMessage("session-changed"); } catch { /* Local authentication still works. */ }
  }, []);
  const refresh = useCallback(async () => {
    const nextUser = await synchronize();
    announce();
    return nextUser;
  }, [announce, synchronize]);

  const requestLogout = useCallback(() => {
    if (logoutPending.current) return;
    setLogoutError("");
    setLogoutOpen(true);
  }, []);
  const closeLogout = useCallback(() => {
    if (!logoutPending.current) setLogoutOpen(false);
  }, []);

  async function confirmLogout() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setIsLoggingOut(true);
    setLogoutError("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", signal: controller.signal });
      if (!response.ok) throw new Error("Logout request failed.");
      ++sequence.current;
      setUser(null);
      setStatus("anonymous");
      setLogoutOpen(false);
      announce();
      toast.success("Signed out", "Your session has been cleared.");
      router.replace("/");
      router.refresh();
    } catch {
      setLogoutError("We couldn’t sign you out. Check your connection and try again.");
    } finally {
      clearTimeout(timeout);
      logoutPending.current = false;
      setIsLoggingOut(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel.current = new BroadcastChannel("beatmarketplace-auth");
        channel.current.onmessage = event => { if (event.data === "session-changed") void synchronize(controller.signal); };
      }
    } catch { /* Optional cross-tab synchronization. */ }
    void Promise.resolve().then(() => { if (!controller.signal.aborted) return synchronize(controller.signal); });
    const connection = channel.current;
    return () => { controller.abort(); connection?.close(); if (channel.current === connection) channel.current = null; };
  }, [synchronize]);

  const value = useMemo(() => ({ user, status, refresh, requestLogout, isLoggingOut }), [isLoggingOut, refresh, requestLogout, status, user]);

  return <AuthContext.Provider value={value}>
    {children}
    <DynamicModal open={logoutOpen} onClose={closeLogout} size="sm" title="Sign out of your account?" description="You can sign back in whenever you’re ready to find your next sound." closeOnBackdrop={!isLoggingOut} footer={<>
      <NeumorphicButton onClick={closeLogout} disabled={isLoggingOut}>Stay signed in</NeumorphicButton>
      <NeumorphicButton variant="accent" onClick={confirmLogout} disabled={isLoggingOut}><LogOutIcon className="size-4" />{isLoggingOut ? "Signing out…" : "Yes, sign out"}</NeumorphicButton>
    </>}>
      <div className="flex items-center gap-4" aria-busy={isLoggingOut}>
        <span className="neo-inset flex size-14 shrink-0 items-center justify-center rounded-2xl text-accent-text" aria-hidden="true"><LogOutIcon className="size-6" /></span>
        <p className="text-sm leading-6 text-muted">You’ll need to sign in again to access your library and dashboard.</p>
      </div>
      {logoutError && <p role="alert" className="mt-4 text-sm leading-6 text-error-text">{logoutError}</p>}
      {isLoggingOut && <p role="status" className="mt-4 text-sm text-muted">Signing you out securely…</p>}
    </DynamicModal>
  </AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
