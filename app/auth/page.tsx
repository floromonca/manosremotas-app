"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { MR_THEME } from "../../lib/theme";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash || "";
    const search = window.location.search || "";

    const isRecovery =
      hash.includes("type=recovery") || search.includes("type=recovery");

    if (!isRecovery) return;

    window.location.replace(`/auth/reset-password${hash}`);
  }, []);

  const ensureClientSession = async (
    session:
      | {
        access_token: string;
        refresh_token: string;
      }
      | null
      | undefined
  ) => {
    if (!session) return;

    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (error) throw error;
  };

  const bootstrapOwnerCompany = async () => {
    const { data: companyId, error } = await supabase.rpc(
      "bootstrap_owner_company"
    );

    console.log("[AUTH] bootstrap_owner_company =", {
      companyId: companyId ?? null,
      error: error?.message ?? null,
    });

    if (error) throw error;
    if (!companyId) throw new Error("Could not bootstrap company.");

    return companyId as string;
  };

  const sendPasswordReset = async () => {
    if (resetBusy) return;

    const cleanEmail = email.trim();

    setMsg("");

    if (!cleanEmail) {
      setMsg("Enter your email first, then click Forgot password.");
      return;
    }

    setResetBusy(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setMsg("Password reset email sent. Please check your inbox.");
    } catch (e: any) {
      setMsg(e?.message ?? String(e));
    } finally {
      setResetBusy(false);
    }
  };

  const submit = async () => {
    if (busy) return;

    setMsg("");
    setBusy(true);

    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        console.log("[AUTH] signInWithPassword result =", {
          hasUser: !!data?.user,
          userId: data?.user?.id ?? null,
          hasSession: !!data?.session,
          accessTokenPresent: !!data?.session?.access_token,
          refreshTokenPresent: !!data?.session?.refresh_token,
          error: error?.message ?? null,
        });

        if (error) throw error;

        await ensureClientSession(data.session);

        const immediateSession = await supabase.auth.getSession();
        console.log("[AUTH] immediate getSession after signIn =", {
          hasSession: !!immediateSession.data.session,
          userId: immediateSession.data.session?.user?.id ?? null,
          error: immediateSession.error?.message ?? null,
        });

        const userId = data.user?.id;
        if (!userId) throw new Error("Could not get userId.");

        const { data: invitedCompanyId, error: invErr } = await supabase.rpc(
          "accept_my_pending_invites"
        );

        console.log("[AUTH] accept_my_pending_invites =", {
          invitedCompanyId: invitedCompanyId ?? null,
          error: invErr?.message ?? null,
        });

        if (invErr) throw invErr;

        const cidFromInvite = (invitedCompanyId as string | null) ?? null;

        if (cidFromInvite) {
          localStorage.setItem("activeCompanyId", cidFromInvite);
          await new Promise((resolve) => setTimeout(resolve, 400));
          window.location.assign("/work-orders");
          return;
        }

        const companyId = await bootstrapOwnerCompany();
        localStorage.setItem("activeCompanyId", companyId);

        await new Promise((resolve) => setTimeout(resolve, 400));
        window.location.assign("/work-orders");
        return;
      }

      const { data: su, error: suErr } = await supabase.auth.signUp({
        email,
        password,
      });

      if (suErr) throw suErr;

      if (su.session) {
        await ensureClientSession(su.session);

        const userId = su.user?.id;
        if (!userId) throw new Error("Could not get userId.");

        const { data: invitedCompanyId, error: invErr } = await supabase.rpc(
          "accept_my_pending_invites"
        );

        if (invErr) throw invErr;

        const cidFromInvite = (invitedCompanyId as string | null) ?? null;

        if (cidFromInvite) {
          localStorage.setItem("activeCompanyId", cidFromInvite);
          window.location.assign("/work-orders");
          return;
        }

        const companyId = await bootstrapOwnerCompany();
        localStorage.setItem("activeCompanyId", companyId);
        window.location.assign("/work-orders");
        return;
      }

      const { data: si, error: siErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (siErr) throw siErr;

      await ensureClientSession(si.session);

      const userId = si.user?.id;
      if (!userId) throw new Error("Could not get userId.");

      const { data: invitedCompanyId, error: invErr } = await supabase.rpc(
        "accept_my_pending_invites"
      );

      if (invErr) throw invErr;

      const cidFromInvite = (invitedCompanyId as string | null) ?? null;

      if (cidFromInvite) {
        localStorage.setItem("activeCompanyId", cidFromInvite);
        window.location.assign("/work-orders");
        return;
      }

      const companyId = await bootstrapOwnerCompany();
      localStorage.setItem("activeCompanyId", companyId);
      window.location.assign("/work-orders");
    } catch (e: any) {
      setMsg(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.trim().length > 0 && !busy;

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
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          border: `1px solid ${MR_THEME.colors.border}`,
          borderRadius: MR_THEME.radius.card,
          background: MR_THEME.colors.cardBg,
          boxShadow: MR_THEME.shadows.card,
          padding: 24,
        }}
      >
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: MR_THEME.colors.primary,
              fontWeight: 900,
              marginBottom: 8,
            }}
          >
            ManosRemotas
          </div>

          <h1
            style={{
              fontSize: 32,
              lineHeight: 1.1,
              fontWeight: 900,
              margin: 0,
              color: MR_THEME.colors.textPrimary,
              letterSpacing: "-0.04em",
            }}
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              fontSize: 15,
              lineHeight: 1.5,
              color: MR_THEME.colors.textSecondary,
            }}
          >
            Access your field service operations workspace.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setMsg("");
            }}
            style={{
              padding: "12px 14px",
              borderRadius: MR_THEME.radius.control,
              border: `1px solid ${mode === "signin"
                ? MR_THEME.colors.primary
                : MR_THEME.colors.borderStrong
                }`,
              background:
                mode === "signin" ? MR_THEME.colors.primary : MR_THEME.colors.cardBg,
              color: mode === "signin" ? "#ffffff" : MR_THEME.colors.textPrimary,
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 15,
            }}
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMsg("");
            }}
            style={{
              padding: "12px 14px",
              borderRadius: MR_THEME.radius.control,
              border: `1px solid ${mode === "signup"
                ? MR_THEME.colors.primary
                : MR_THEME.colors.borderStrong
                }`,
              background:
                mode === "signup" ? MR_THEME.colors.primary : MR_THEME.colors.cardBg,
              color: mode === "signup" ? "#ffffff" : MR_THEME.colors.textPrimary,
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 15,
            }}
          >
            Sign up
          </button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <input
            placeholder="Email"
            value={email}
            autoComplete="email"
            inputMode="email"
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          {mode === "signin" ? (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: -4,
              }}
            >
              <button
                type="button"
                onClick={sendPasswordReset}
                disabled={resetBusy}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: MR_THEME.colors.primary,
                  cursor: resetBusy ? "default" : "pointer",
                  fontWeight: 800,
                  fontSize: 13,
                  opacity: resetBusy ? 0.7 : 1,
                }}
              >
                {resetBusy ? "Sending reset email..." : "Forgot password?"}
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            style={{
              marginTop: 4,
              padding: "14px 16px",
              borderRadius: MR_THEME.radius.control,
              border: `1px solid ${canSubmit ? MR_THEME.colors.primary : MR_THEME.colors.borderStrong
                }`,
              background: canSubmit
                ? MR_THEME.colors.primary
                : MR_THEME.colors.cardBgSoft,
              color: canSubmit ? "#ffffff" : MR_THEME.colors.textMuted,
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontWeight: 900,
              fontSize: 16,
              opacity: 1,
            }}
          >
            {busy
              ? "Please wait..."
              : mode === "signin"
                ? "Sign in"
                : "Create user"}
          </button>
        </div>

        {msg ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              border: `1px solid ${MR_THEME.colors.border}`,
              borderRadius: MR_THEME.radius.control,
              background: MR_THEME.colors.cardBgSoft,
              color: MR_THEME.colors.textPrimary,
              fontSize: 13,
              lineHeight: 1.5,
              fontWeight: 700,
            }}
          >
            {msg}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 18,
            fontSize: 12,
            color: MR_THEME.colors.textSecondary,
            lineHeight: 1.5,
          }}
        >
          After authentication, you will be redirected to <b>/work-orders</b>.
        </div>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 14px",
  borderRadius: MR_THEME.radius.control,
  border: `1px solid ${MR_THEME.colors.borderStrong}`,
  background: "#ffffff",
  color: MR_THEME.colors.textPrimary,
  fontSize: 16,
  fontWeight: 700,
  outlineColor: MR_THEME.colors.primary,
  opacity: 1,
};