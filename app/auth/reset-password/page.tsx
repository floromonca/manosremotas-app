"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { MR_THEME } from "../../../lib/theme";

export default function ResetPasswordPage() {
    const router = useRouter();

    const [tokenReady, setTokenReady] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => {
        const handleRecoverySession = async () => {
            const params = new URLSearchParams(window.location.search);
            const tokenHash = params.get("token_hash");
            const type = params.get("type");

            if (type !== "recovery" || !tokenHash) {
                setErrorMsg("Invalid or missing password reset link.");
                setTokenReady(false);
                return;
            }

            const { error } = await supabase.auth.verifyOtp({
                type: "recovery",
                token_hash: tokenHash,
            });

            if (error) {
                setErrorMsg(error.message);
                setTokenReady(false);
                return;
            }

            setTokenReady(true);
            window.history.replaceState({}, "", "/auth/reset-password");
        };

        handleRecoverySession();
    }, []);

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setErrorMsg("");
        setSuccessMsg("");

        if (!tokenReady) {
            setErrorMsg("Password reset link is not ready or has expired.");
            return;
        }

        if (password.length < 8) {
            setErrorMsg("Password must be at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            return;
        }

        setSaving(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            setSuccessMsg("Password updated successfully. You can now sign in.");
            setPassword("");
            setConfirmPassword("");

            setTimeout(() => {
                router.replace("/auth");
            }, 1200);
        } catch (error: any) {
            setErrorMsg(error?.message ?? "Could not update password.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <main
            style={{
                minHeight: "100vh",
                background: MR_THEME.colors.appBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
            }}
        >
            <section
                style={{
                    width: "100%",
                    maxWidth: 440,
                    background: MR_THEME.colors.cardBg,
                    border: `1px solid ${MR_THEME.colors.border}`,
                    borderRadius: MR_THEME.radius.card,
                    boxShadow: MR_THEME.shadows.cardSoft,
                    padding: 24,
                }}
            >
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: MR_THEME.colors.textSecondary,
                        marginBottom: 8,
                    }}
                >
                    ManosRemotas
                </div>

                <h1
                    style={{
                        margin: 0,
                        fontSize: 30,
                        lineHeight: 1.1,
                        fontWeight: 900,
                        color: MR_THEME.colors.textPrimary,
                        letterSpacing: "-0.04em",
                    }}
                >
                    Reset password
                </h1>

                <p
                    style={{
                        margin: "10px 0 22px",
                        color: MR_THEME.colors.textSecondary,
                        fontSize: 15,
                        lineHeight: 1.5,
                    }}
                >
                    Enter your new password to regain access to your account.
                </p>

                {errorMsg ? (
                    <div
                        style={{
                            marginBottom: 14,
                            padding: 12,
                            borderRadius: MR_THEME.radius.control,
                            border: "1px solid #fecaca",
                            background: "#fff5f5",
                            color: "#991b1b",
                            fontSize: 13,
                            lineHeight: 1.5,
                        }}
                    >
                        {errorMsg}
                    </div>
                ) : null}

                {successMsg ? (
                    <div
                        style={{
                            marginBottom: 14,
                            padding: 12,
                            borderRadius: MR_THEME.radius.control,
                            border: "1px solid #bbf7d0",
                            background: "#f0fdf4",
                            color: "#166534",
                            fontSize: 13,
                            lineHeight: 1.5,
                        }}
                    >
                        {successMsg}
                    </div>
                ) : null}

                <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
                    <label style={labelStyle}>
                        New password
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Minimum 8 characters"
                            style={inputStyle}
                            autoComplete="new-password"
                        />
                    </label>

                    <label style={labelStyle}>
                        Confirm password
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="Confirm new password"
                            style={inputStyle}
                            autoComplete="new-password"
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={saving || !tokenReady}
                        style={{
                            marginTop: 4,
                            padding: "12px 14px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.primary}`,
                            background: MR_THEME.colors.primary,
                            color: "#ffffff",
                            cursor: saving || !tokenReady ? "default" : "pointer",
                            fontWeight: 900,
                            fontSize: 15,
                            opacity: saving || !tokenReady ? 0.7 : 1,
                        }}
                    >
                        {saving ? "Updating..." : "Update password"}
                    </button>
                </form>
            </section>
        </main>
    );
}

const labelStyle: React.CSSProperties = {
    display: "grid",
    gap: 6,
    fontSize: 13,
    color: MR_THEME.colors.textPrimary,
    fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
    padding: "11px 12px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    outline: "none",
    fontSize: 14,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
};