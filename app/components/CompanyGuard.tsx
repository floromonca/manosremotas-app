"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useAuthState } from "../../hooks/useAuthState";
import { useActiveCompany } from "../../hooks/useActiveCompany";

const SUPER_ADMIN_EMAILS = ["floromonca@gmail.com"];

export function CompanyGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const { user, authLoading } = useAuthState();
    const { companyId, myRole, isLoadingCompany } = useActiveCompany();

    const [checking, setChecking] = useState(true);

    const isSuperAdmin = !!user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

    useEffect(() => {
        if (authLoading || isLoadingCompany) return;

        console.log("🛡 CompanyGuard running", {
            pathname,
            userId: user?.id ?? null,
            companyId,
            authLoading,
            isLoadingCompany,
        });

        console.log("[CompanyGuard] boot", {
            pathname,
            userId: user?.id ?? null,
            companyId,
            myRole,
            authLoading,
            isLoadingCompany,
        });

        if (!user) {
            console.log("[CompanyGuard] redirect -> /auth (no user)");

            queueMicrotask(() => {
                setChecking(false);
            });

            router.replace("/auth");
            return;
        }

        if (!companyId) {
            console.log("[CompanyGuard] redirect -> /control-center (no companyId)");

            queueMicrotask(() => {
                setChecking(false);
            });

            router.replace("/control-center");
            return;
        }

        if (pathname?.startsWith("/onboarding")) {
            console.log("[CompanyGuard] allow (already on /onboarding)");

            queueMicrotask(() => {
                setChecking(false);
            });

            return;
        }

        if (isSuperAdmin) {
            console.log("[CompanyGuard] allow (super admin bypass)");

            queueMicrotask(() => {
                setChecking(false);
            });

            return;
        }

        let cancelled = false;

        queueMicrotask(() => {
            setChecking(true);
        });

        (async () => {
            console.log("[CompanyGuard] BEFORE profile query", {
                userId: user.id,
                companyId,
            });

            const { data: p, error: pErr } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("user_id", user.id)
                .eq("company_id", companyId)
                .maybeSingle();

            console.log("[CompanyGuard] AFTER profile query", { p, pErr });

            if (cancelled) return;

            if (pErr) {
                console.log("[CompanyGuard] profile check error:", pErr);

                queueMicrotask(() => {
                    setChecking(false);
                });

                return;
            }

            const fullName = (p?.full_name ?? "").trim();
            console.log("[CompanyGuard] fullName computed =", JSON.stringify(fullName));

            if (!fullName) {
                console.log("[CompanyGuard] redirect -> /onboarding/profile (missing full_name)");
                router.replace("/onboarding/profile");

                queueMicrotask(() => {
                    setChecking(false);
                });

                return;
            }

            console.log("[CompanyGuard] allow (profile ok)");

            queueMicrotask(() => {
                setChecking(false);
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [authLoading, isLoadingCompany, user, companyId, myRole, pathname, router, isSuperAdmin]);

    if (authLoading || isLoadingCompany || checking) return null;

    if (!user || !companyId) return null;

    return <>{children}</>;
}