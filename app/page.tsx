"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive) return;

      // ✅ si hay sesión -> dashboard, si no -> work orders (login)
      router.replace(session ? "/control-center" : "/work-orders");
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  return null;
}