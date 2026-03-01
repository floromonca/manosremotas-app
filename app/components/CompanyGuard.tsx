"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "../../hooks/useAuthState";
import { useActiveCompany } from "../../hooks/useActiveCompany";

export function CompanyGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, authLoading } = useAuthState();
    const { companyId, isLoadingCompany } = useActiveCompany();

    useEffect(() => {
  if (authLoading || isLoadingCompany) return;

  // 1️⃣ No hay usuario → SIEMPRE auth
  if (!user) {
    router.replace("/auth");
    return;
  }

  // 2️⃣ Hay usuario pero no hay empresa → control center
  if (!companyId) {
    router.replace("/control-center");
    return;
  }

  // 3️⃣ Todo bien → no hacer nada
}, [authLoading, isLoadingCompany, user?.id, companyId, router]);

    // Mientras decide, no renderices nada para evitar parpadeos
    if (authLoading || isLoadingCompany) return null;

    // Si ya decidió y no hay company, también null (porque ya redirigió)
    if (!user || !companyId) return null;

    return <>{children}</>;
}