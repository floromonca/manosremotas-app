"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type AuthState = {
  user: { id: string; email?: string | null } | null;
  authLoading: boolean;
};

export function useAuthState(): AuthState {
  const [user, setUser] = useState<AuthState["user"]>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const boot = async () => {
      setAuthLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive) return;

      const u = session?.user
        ? { id: session.user.id, email: session.user.email ?? null }
        : null;

      setUser(u);
      setAuthLoading(false);
    };

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
        ? { id: session.user.id, email: session.user.email ?? null }
        : null;

      setUser(u);
      setAuthLoading(false);
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return { user, authLoading };
}