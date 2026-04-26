"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useAuthState } from "../../../hooks/useAuthState";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { MR_THEME } from "../../../lib/theme";

export default function OnboardingProfilePage() {
    const router = useRouter();
    const { user, authLoading } = useAuthState();
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
            setMsg("Please enter your full name.");
            return;
        }

        setSaving(true);
        setMsg(null);

        try {
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

            if (!updatedRow) {
                const { error: insErr } = await supabase.from("profiles").insert({
                    user_id: user.id,
                    company_id: companyId,
                    ...payload,
                });

                if (insErr) throw insErr;
            }

            const { error: memberErr } = await supabase
                .from("company_members")
                .update({
                    full_name: name,
                })
                .eq("user_id", user.id)
                .eq("company_id", companyId);

            if (memberErr) throw memberErr;

            const { data: companyRow, error: companyErr } = await supabase
                .from("companies")
                .select("company_name")
                .eq("company_id", companyId)
                .maybeSingle();

            if (companyErr) throw companyErr;

            const isNewCompany = companyRow?.company_name === "My Company";

            await refreshCompany();
            router.refresh();

            if (isNewCompany) {
                router.replace("/settings/company");
            } else {
                router.replace("/work-orders");
            }
        } catch (e: any) {
            setMsg(e?.message ?? String(e));
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || isLoadingCompany || loading) return null;

    return (
        <main
            style={{
                minHeight: "100vh",
                background: MR_THEME.colors.appBg,
                padding: "32px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <section
                style={{
                    width: "100%",
                    maxWidth: 560,
                    border: `1px solid ${MR_THEME.colors.border}`,
                    borderRadius: MR_THEME.radius.card,
                    background: MR_THEME.colors.cardBg,
                    boxShadow: MR_THEME.shadows.card,
                    padding: 24,
                }}
            >
                <div
                    style={{
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: MR_THEME.colors.primary,
                        fontWeight: 900,
                        marginBottom: 10,
                    }}
                >
                    ManosRemotas
                </div>

                <h1
                    style={{
                        fontSize: 34,
                        lineHeight: 1.05,
                        fontWeight: 900,
                        letterSpacing: "-0.03em",
                        color: MR_THEME.colors.textPrimary,
                        margin: "0 0 10px",
                    }}
                >
                    Complete your profile
                </h1>

                <p
                    style={{
                        margin: "0 0 22px",
                        color: MR_THEME.colors.textSecondary,
                        fontSize: 16,
                        lineHeight: 1.55,
                    }}
                >
                    This helps your team identify you correctly in work orders, reports, and activity history.
                </p>

                <div style={{ display: "grid", gap: 16 }}>
                    <label style={{ display: "grid", gap: 8 }}>
                        <span
                            style={{
                                fontSize: 13,
                                color: MR_THEME.colors.textSecondary,
                                fontWeight: 800,
                            }}
                        >
                            Full name
                        </span>

                        <input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Example: Juan Pérez"
                            style={{
                                width: "100%",
                                padding: "14px 16px",
                                borderRadius: MR_THEME.radius.control,
                                border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                background: MR_THEME.colors.cardBg,
                                color: MR_THEME.colors.textPrimary,
                                fontSize: 16,
                                fontWeight: 700,
                                outlineColor: MR_THEME.colors.primary,
                                opacity: 1,
                            }}
                        />
                    </label>

                    <label style={{ display: "grid", gap: 8 }}>
                        <span
                            style={{
                                fontSize: 13,
                                color: MR_THEME.colors.textSecondary,
                                fontWeight: 800,
                            }}
                        >
                            Language
                        </span>

                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "14px 16px",
                                borderRadius: MR_THEME.radius.control,
                                border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                background: MR_THEME.colors.cardBg,
                                color: MR_THEME.colors.textPrimary,
                                fontSize: 16,
                                fontWeight: 700,
                                outlineColor: MR_THEME.colors.primary,
                                opacity: 1,
                            }}
                        >
                            <option value="en">English</option>
                            <option value="es">Español</option>
                        </select>
                    </label>

                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        style={{
                            marginTop: 4,
                            padding: "14px 16px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${saving ? MR_THEME.colors.borderStrong : MR_THEME.colors.primary}`,
                            background: saving ? MR_THEME.colors.cardBgSoft : MR_THEME.colors.primary,
                            color: saving ? MR_THEME.colors.textMuted : "#ffffff",
                            fontWeight: 900,
                            fontSize: 16,
                            cursor: saving ? "not-allowed" : "pointer",
                            opacity: 1,
                        }}
                    >
                        {saving ? "Saving..." : "Save and continue"}
                    </button>

                    {msg ? (
                        <div
                            style={{
                                padding: 12,
                                border: `1px solid ${MR_THEME.colors.border}`,
                                borderRadius: MR_THEME.radius.control,
                                background: MR_THEME.colors.cardBgSoft,
                                color: MR_THEME.colors.textPrimary,
                                fontSize: 14,
                                lineHeight: 1.45,
                                fontWeight: 700,
                            }}
                        >
                            {msg}
                        </div>
                    ) : null}
                </div>
            </section>
        </main>
    );
}