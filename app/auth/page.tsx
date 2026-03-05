"use client";

import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");

  // helper: crea company + owner membership SOLO si no hay invite y no hay memberships
  const ensureOwnerOnboarding = async (userId: string) => {
    // 1) ¿ya tiene membership?
    const { data: mem, error: memErr } = await supabase
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (memErr) throw memErr;
    if (mem?.company_id) return mem.company_id as string;

    // 2) crear empresa
    const { data: co, error: coErr } = await supabase
      .from("companies")
      .insert({
        company_name: "My Company",
        status: "active",
        created_by: userId,
      })
      .select("company_id")
      .single();

    if (coErr) throw coErr;

    const companyId = co.company_id as string;

    // 3) crear membership owner
    const { error: cmErr } = await supabase.from("company_members").insert({
      company_id: companyId,
      user_id: userId,
      role: "owner",
    });

    if (cmErr) throw cmErr;

    return companyId;
  };

  const submit = async () => {
    setMsg("");

    try {
      // 0) sign in / sign up
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        const userId = data.user?.id;
        if (!userId) throw new Error("No se pudo obtener userId.");

        // 1) Primero: intentar aceptar invite pending (si existe)
        const { data: invitedCompanyId, error: invErr } = await supabase.rpc(
          "accept_my_pending_invites"
        );
        if (invErr) throw invErr;

        const cidFromInvite = (invitedCompanyId as string | null) ?? null;

        if (cidFromInvite) {
          localStorage.setItem("activeCompanyId", cidFromInvite);
          router.replace("/work-orders");
          return;
        }

        // 2) Si no hubo invite: onboarding owner (si aplica)
        const companyId = await ensureOwnerOnboarding(userId);
        localStorage.setItem("activeCompanyId", companyId);
        router.replace("/work-orders");
        return;
      }

      // SIGN UP
      const { data: su, error: suErr } = await supabase.auth.signUp({
        email,
        password,
      });
      if (suErr) throw suErr;

      // Si devolvió sesión, seguimos con user actual
      if (su.session) {
        const userId = su.user?.id;
        if (!userId) throw new Error("No se pudo obtener userId.");

        // 1) Intentar aceptar invite
        const { data: invitedCompanyId, error: invErr } = await supabase.rpc(
          "accept_my_pending_invites"
        );
        if (invErr) throw invErr;

        const cidFromInvite = (invitedCompanyId as string | null) ?? null;

        if (cidFromInvite) {
          localStorage.setItem("activeCompanyId", cidFromInvite);
          router.replace("/work-orders");
          return;
        }

        // 2) Si no hubo invite: onboarding owner
        const companyId = await ensureOwnerOnboarding(userId);
        localStorage.setItem("activeCompanyId", companyId);
        router.replace("/work-orders");
        return;
      }

      // Si no devolvió sesión (email confirmation), hacemos login inmediato (tu fallback)
      const { data: si, error: siErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (siErr) throw siErr;

      const userId = si.user?.id;
      if (!userId) throw new Error("No se pudo obtener userId.");

      // 1) Intentar aceptar invite
      const { data: invitedCompanyId, error: invErr } = await supabase.rpc(
        "accept_my_pending_invites"
      );
      if (invErr) throw invErr;

      const cidFromInvite = (invitedCompanyId as string | null) ?? null;

      if (cidFromInvite) {
        localStorage.setItem("activeCompanyId", cidFromInvite);
        router.replace("/work-orders");
        return;
      }

      // 2) Si no hubo invite: onboarding owner
      const companyId = await ensureOwnerOnboarding(userId);
      localStorage.setItem("activeCompanyId", companyId);
      router.replace("/work-orders");
    } catch (e: any) {
      setMsg(e?.message ?? String(e));
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 750, marginBottom: 8 }}>
        ManosRemotas — Auth
      </h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => setMode("signin")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: mode === "signin" ? "#111" : "white",
            color: mode === "signin" ? "white" : "#111",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Sign in
        </button>

        <button
          onClick={() => setMode("signup")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: mode === "signup" ? "#111" : "white",
            color: mode === "signup" ? "white" : "#111",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Sign up
        </button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />

        <button
          onClick={submit}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          {mode === "signin" ? "Entrar" : "Crear usuario"}
        </button>
      </div>

      {msg ? (
        <div
          style={{
            marginTop: 12,
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

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>
        Después de autenticar, te mando a <b>/work-orders</b>.
      </div>
    </div>
  );
}