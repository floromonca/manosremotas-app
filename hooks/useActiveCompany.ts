"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Result = {
  companyId: string | null;
  companyName: string;
  isLoadingCompany: boolean;
};

export function useActiveCompany(): Result {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("Your Business");
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoadingCompany(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session?.user) {
        setCompanyId(null);
        setCompanyName("Your Business");
        setIsLoadingCompany(false);
        return;
      }

      // 1) Preferimos la company guardada
      const saved = localStorage.getItem("activeCompanyId");
      let cid: string | null = saved && saved.trim() ? saved : null;

      // 2) Si no hay, usamos la primera membresía
      if (!cid) {
        const { data: cm, error: cmErr } = await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (cancelled) return;

        if (cmErr) {
          setCompanyId(null);
          setCompanyName("Your Business");
          setIsLoadingCompany(false);
          return;
        }

        cid = (cm as any)?.company_id ?? null;
        if (cid) localStorage.setItem("activeCompanyId", cid);
      }

      if (!cid) {
        setCompanyId(null);
        setCompanyName("Your Business");
        setIsLoadingCompany(false);
        return;
      }

      setCompanyId(cid);

      // 3) Nombre de la company
      const { data: cRow, error: cErr } = await supabase
        .from("companies")
        .select("company_name")
        .eq("company_id", cid)
        .single();

      if (!cancelled) {
        setCompanyName(
          cErr ? "Your Business" : ((cRow as any)?.company_name ?? "Your Business"),
        );
        setIsLoadingCompany(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return { companyId, companyName, isLoadingCompany };
}