"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuthState } from "./useAuthState";

type Role = "owner" | "admin" | "tech" | "viewer";

type MembershipRow = {
  company_id: string;
  role: Role;
};

type CompanyRow = {
  company_id: string;
  company_name: string;
};

export function useActiveCompany() {
  const { user, authLoading } = useAuthState();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);
  const refreshCompany = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // evita intentar aceptar invite en loop
  const inviteAttemptedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    // ✅ Si no hay usuario: limpiar estado + storage
    if (!user) {
      inviteAttemptedRef.current = false;

      if (typeof window !== "undefined") {
        localStorage.removeItem("activeCompanyId");
      }
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
        // 1) Traer memberships
        const fetchMemberships = async (): Promise<MembershipRow[]> => {
          const { data, error } = await supabase
            .from("company_members")
            .select("company_id, role")
            .eq("user_id", user.id);

          console.log("[useActiveCompany] memErr =", error);
          console.log("[useActiveCompany] memberships =", data);

          if (error) throw error;
          return (data ?? []) as MembershipRow[];
        };

        let list = await fetchMemberships();

        // 2) Si no hay memberships → intentar aceptar invite (UNA sola vez)
        if (list.length === 0 && !inviteAttemptedRef.current) {
          inviteAttemptedRef.current = true;

          console.log(
            "[useActiveCompany] No memberships; trying accept_my_pending_invites()..."
          );

          const { data: rpcData, error: rpcErr } = await supabase.rpc(
            "accept_my_pending_invites"
          );

          console.log("[useActiveCompany] rpcErr =", rpcErr);
          console.log("[useActiveCompany] rpcData =", rpcData);

          if (rpcErr) throw rpcErr;

          // ✅ NUEVO: el RPC ahora retorna uuid directo (string) o null
          const invitedCompanyId = (rpcData as string | null) ?? null;

          if (invitedCompanyId && typeof window !== "undefined") {
            localStorage.setItem("activeCompanyId", invitedCompanyId);
          }

          // Re-fetch memberships después del RPC
          list = await fetchMemberships();
        }

        // 3) Si sigue sin memberships → no hay empresa activa
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

        // 4) Leer stored
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem("activeCompanyId")
            : null;

        // 5) Elegir company válida
        const validStored = stored
          ? list.find((m) => m.company_id === stored) ?? null
          : null;

        const chosen: MembershipRow = validStored ?? list[0];

        // 6) Sanear storage
        if (typeof window !== "undefined") {
          if (stored !== chosen.company_id) {
            localStorage.setItem("activeCompanyId", chosen.company_id);
          }
        }

        // 7) Cargar company_name
        const { data: c, error: cErr } = await supabase
          .from("companies")
          .select("company_id, company_name")
          .eq("company_id", chosen.company_id)
          .maybeSingle();

        if (cErr) throw cErr;

        const company = (c ?? null) as CompanyRow | null;

        if (!cancelled) {
          setCompanyId(chosen.company_id);
          setMyRole(chosen.role);
          setCompanyName(company?.company_name ?? "");
        }
      } catch (e: any) {
        console.log("[useActiveCompany] CATCH =", e);
        console.log("useActiveCompany error:", e?.message ?? e);

        if (typeof window !== "undefined") {
          localStorage.removeItem("activeCompanyId");
        }

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
  }, [authLoading, user?.id, refreshKey]);

  return {
    companyId,
    companyName,
    myRole,
    isLoadingCompany,
    refreshCompany,
  };
}