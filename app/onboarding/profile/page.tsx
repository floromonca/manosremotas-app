"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useAuthState } from "../../../hooks/useAuthState";
import { useActiveCompany } from "../../../hooks/useActiveCompany";

export default function OnboardingProfilePage() {
    const router = useRouter();
    const { user, authLoading } = useAuthState();

    // ✅ OJO: aquí necesitamos refreshCompany para que el app “se entere” rápido
    const { companyId, isLoadingCompany, refreshCompany } = useActiveCompany();

    const [fullName, setFullName] = useState("");
    const [language, setLanguage] = useState("en");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading || isLoadingCompany) return;

        if (!user) {
            router.replace("/auth");
            return;
        }
        if (!companyId) {
            router.replace("/control-center");
            return;
        }

        let cancelled = false;

        (async () => {
            setLoading(true);
            setMsg(null);

            const { data, error } = await supabase
                .from("profiles")
                .select("full_name, language")
                .eq("user_id", user.id)
                .eq("company_id", companyId)
                .maybeSingle();

            if (cancelled) return;

            if (error) {
                setMsg(error.message);
            } else {
                setFullName((data?.full_name ?? "") as string);
                setLanguage(((data?.language ?? "en") as string) || "en");
            }

            setLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [authLoading, isLoadingCompany, user?.id, companyId, router]);

    const save = async () => {
        if (!user || !companyId) return;

        const name = fullName.trim();
        if (!name) {
            setMsg("Por favor escribe tu nombre completo.");
            return;
        }

        setSaving(true);
        setMsg(null);

        try {
            // ✅ Evitamos UPSERT con onConflict porque tu tabla NO tiene unique(user_id, company_id)
            // 1) Intentar UPDATE primero
            const payload = {
                full_name: name,
                language: language || "en",
            };

            const { data: updatedRow, error: updErr } = await supabase
                .from("profiles")
                .update(payload)
                .eq("user_id", user.id)
                .eq("company_id", companyId)
                .select("user_id")
                .maybeSingle();

            if (updErr) throw updErr;

            // 2) Si no existía fila, hacemos INSERT
            if (!updatedRow) {
                const { error: insErr } = await supabase.from("profiles").insert({
                    user_id: user.id,
                    company_id: companyId,
                    ...payload,
                });

                if (insErr) throw insErr;
            }

            // 3) refrescar estado + salir
            refreshCompany();
            router.replace("/work-orders");
        } catch (e: any) {
            setMsg(e?.message ?? String(e));
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || isLoadingCompany || loading) return null;

    return (
        <div style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
                Completa tu perfil
            </h1>

            <div style={{ opacity: 0.7, marginBottom: 14 }}>
                Solo es una vez. Esto ayuda a que los reportes y el equipo te identifiquen bien.
            </div>

            <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>Nombre completo</span>
                    <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ej: Juan Pérez"
                        style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>Idioma</span>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
                    >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                    </select>
                </label>

                <button
                    onClick={save}
                    disabled={saving}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #111",
                        background: "#111",
                        color: "white",
                        fontWeight: 900,
                        cursor: "pointer",
                        opacity: saving ? 0.7 : 1,
                    }}
                >
                    {saving ? "Guardando..." : "Guardar y continuar"}
                </button>

                {msg ? (
                    <div
                        style={{
                            padding: 10,
                            border: "1px solid #eee",
                            borderRadius: 10,
                            background: "#fafafa",
                            fontSize: 13,
                        }}
                    >
                        {msg}
                    </div>
                ) : null}
            </div>
        </div>
    );
}