"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuthState } from "./useAuthState";

type MembershipRow = {
  company_id: string;
  role: "owner" | "admin" | "tech" | "viewer";
};

type CompanyRow = {
  company_id: string;
  company_name: string;
};

export function useActiveCompany() {
  const { user, authLoading } = useAuthState();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [myRole, setMyRole] = useState<MembershipRow["role"] | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    // Si no hay usuario: limpiar estado
    if (!user) {
      setCompanyId(null);
      setCompanyName("");
      setMyRole(null);
      setIsLoadingCompany(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoadingCompany(true);

      try {
        // 1) Traer memberships del usuario actual
        const { data: memberships, error: memErr } = await supabase
          .from("company_members")
          .select("company_id, role")
          .eq("user_id", user.id);

        if (memErr) throw memErr;

        const list = (memberships ?? []) as MembershipRow[];

        // Si no tiene membresías, no hay empresa activa
        if (list.length === 0) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("activeCompanyId");
          }
          if (!cancelled) {
            setCompanyId(null);
            setCompanyName("");
            setMyRole(null);
          }
          return;
        }

        // 2) Leer activeCompanyId guardado (si existe)
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem("activeCompanyId")
            : null;

        // 3) Validar stored contra memberships
        const chosen = (stored && list.find((m) => m.company_id === stored)) || list[0];

        // 4) Persistir el correcto (sanea localStorage cuando cambias de usuario)
        if (typeof window !== "undefined") {
          if (stored !== chosen.company_id) {
            localStorage.setItem("activeCompanyId", chosen.company_id);
          }
        }

        // 5) Cargar company_name desde companies
        const { data: c, error: cErr } = await supabase
          .from("companies")
          .select("company_id, company_name")
          .eq("company_id", chosen.company_id)
          .maybeSingle();

        if (cErr) throw cErr;

        const company = c as CompanyRow | null;

        if (!cancelled) {
          setCompanyId(chosen.company_id);
          setMyRole(chosen.role);
          setCompanyName(company?.company_name ?? "");
        }
      } catch (e: any) {
        console.log("useActiveCompany error:", e?.message ?? e);
        if (!cancelled) {
          setCompanyId(null);
          setCompanyName("");
          setMyRole(null);
        }
      } finally {
        if (!cancelled) setIsLoadingCompany(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  return {
    companyId,
    companyName,
    myRole,
    isLoadingCompany,
  };
}