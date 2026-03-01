"use client";

import { useEffect, useState } from "react";
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

    useEffect(() => {
        if (authLoading) return;

        // ✅ Si no hay usuario: limpiar estado + storage
        if (!user) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("activeCompanyId");
            }
            setCompanyId(null);
            setCompanyName("");
            setMyRole(null);
            setIsLoadingCompany(false);
            return;
        }
        console.log("[useActiveCompany] user.id =", user.id);
        let cancelled = false;

        (async () => {
            setIsLoadingCompany(true);

            try {
                // 1) Traer memberships (TIPADO explícito)
                const { data, error } = await supabase
                    .from("company_members")
                    .select("company_id, role")
                    .eq("user_id", user.id);

                console.log("[useActiveCompany] memErr =", error);
                console.log("[useActiveCompany] memberships =", data);

                if (error) throw error;

                const list: MembershipRow[] = (data ?? []) as MembershipRow[];

                // 2) Si no hay memberships → no hay empresa activa
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

                // 3) Leer stored
                const stored =
                    typeof window !== "undefined"
                        ? localStorage.getItem("activeCompanyId")
                        : null;

                // 4) Elegir company válida
                const validStored = stored
                    ? list.find((m) => m.company_id === stored) ?? null
                    : null;

                const chosen: MembershipRow = validStored ?? list[0];

                // 5) Sanear storage
                if (typeof window !== "undefined") {
                    if (stored !== chosen.company_id) {
                        localStorage.setItem("activeCompanyId", chosen.company_id);
                    }
                }

                // 6) Cargar company_name
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
    }, [authLoading, user?.id]);

    return {
        companyId,
        companyName,
        myRole,
        isLoadingCompany,
    };
}