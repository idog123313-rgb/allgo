"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { LoadingScreen } from "@/components/shared/loading-screen";

interface AuthContextValue {
  userId: string;
  /** Drops the current anonymous identity and starts a fresh one on this
   * device — lets one browser stand in for a different participant
   * (real use: a shared family device; also handy for testing). */
  switchIdentity: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ensureSession = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError("Missing Supabase configuration — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
      return;
    }
    try {
      const { data, error: getErr } = await supabase.auth.getSession();
      if (getErr) {
        setError(getErr.message);
        return;
      }
      if (data.session) {
        setUserId(data.session.user.id);
        return;
      }
      const { data: signInData, error: signInErr } = await supabase.auth.signInAnonymously();
      if (signInErr || !signInData.session) {
        setError(signInErr?.message ?? "Couldn't start a session");
        return;
      }
      setUserId(signInData.session.user.id);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    ensureSession();
  }, [ensureSession]);

  const switchIdentity = useCallback(async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setError(null);
    await ensureSession();
  }, [ensureSession]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-16 text-center gap-3">
        <p className="text-lg font-bold">Couldn&apos;t connect</p>
        <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
      </div>
    );
  }

  if (!userId) return <LoadingScreen />;

  return <AuthContext.Provider value={{ userId, switchIdentity }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
