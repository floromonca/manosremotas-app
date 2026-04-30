"use client";

import { useRouter } from "next/navigation";
import AppSidebar from "../components/AppSidebar";
import { useAuthState } from "../../hooks/useAuthState";
import { useActiveCompany } from "../../hooks/useActiveCompany";
import { supabase } from "../../lib/supabaseClient";
import { useState, useEffect, useMemo, useRef } from "react";
import { MR_THEME } from "@/lib/theme";

export default function AppShellLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user } = useAuthState();
    const { companyName } = useActiveCompany();
    const [isMobile, setIsMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [platformMode, setPlatformMode] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement | null>(null);

    const SUPER_ADMIN_EMAILS = ["floromonca@gmail.com"];
    const isSuperAdmin = !!user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

    const showPlatformBanner = useMemo(() => {
        return isSuperAdmin && platformMode;
    }, [isSuperAdmin, platformMode]);

    const mainBg = MR_THEME.colors.appBg;

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 900);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => {
            window.removeEventListener("resize", checkMobile);
        };
    }, []);
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    useEffect(() => {
        if (typeof window === "undefined") return;

        const syncPlatformMode = () => {
            setPlatformMode(localStorage.getItem("platformMode") === "true");
        };

        syncPlatformMode();
        window.addEventListener("storage", syncPlatformMode);
        window.addEventListener("active-company-refresh", syncPlatformMode as EventListener);

        return () => {
            window.removeEventListener("storage", syncPlatformMode);
            window.removeEventListener("active-company-refresh", syncPlatformMode as EventListener);
        };
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.replace("/auth");
    };
    const menuItemStyle: React.CSSProperties = {
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: 14,
        color: MR_THEME.colors.textPrimary,
        transition: "background 0.15s ease",
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: mainBg }}>

            {/* Sidebar desktop */}
            {!isMobile && <AppSidebar />}

            {/* Sidebar mobile */}
            {isMobile && sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 1000,
                        background: "rgba(15, 23, 42, 0.35)",
                        display: "flex",
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            height: "100vh",
                            width: 280,
                            background: "#1e293b",
                            boxShadow: "0 8px 30px rgba(15, 23, 42, 0.22)",
                        }}
                    >
                        <AppSidebar onNavigate={() => setSidebarOpen(false)} />
                    </div>
                </div>
            )}

            <main
                style={{
                    flex: 1,
                    padding: isMobile ? "12px 12px 32px" : "16px 24px 40px",
                    background: mainBg,
                }}
            >
                <div
                    style={{
                        width: "100%",
                        margin: "0 0 18px",
                    }}
                >

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: MR_THEME.spacing.md,
                            padding: isMobile ? "10px 12px" : "12px 16px",
                            borderRadius: 0,
                            background: MR_THEME.colors.cardBg,
                            borderBottom: `1px solid ${MR_THEME.colors.border}`,
                            boxShadow: "none",
                        }}
                    >
                        {/* LEFT */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: MR_THEME.spacing.sm,
                                minWidth: 0,
                            }}
                        >
                            {isMobile && (
                                <button
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: MR_THEME.radius.control,
                                        border: `1px solid ${MR_THEME.colors.border}`,
                                        background: MR_THEME.colors.cardBgSoft,
                                        color: MR_THEME.colors.textPrimary,
                                        cursor: "pointer",
                                        fontSize: 22,
                                        fontWeight: 900,
                                    }}
                                >
                                    ☰
                                </button>
                            )}

                            <div style={{ minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 900,
                                        letterSpacing: 1,
                                        textTransform: "uppercase",
                                        color: MR_THEME.colors.textMuted,
                                        marginBottom: 2,
                                    }}
                                >
                                    Company
                                </div>

                                <div
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 800,
                                        color: MR_THEME.colors.textPrimary,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        maxWidth: isMobile ? 170 : 360,
                                    }}
                                >
                                    {companyName || "—"}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT */}
                        <div ref={userMenuRef} style={{ position: "relative" }}>
                            <button
                                type="button"
                                onClick={() => setUserMenuOpen((s) => !s)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    border: `1px solid ${MR_THEME.colors.border}`,
                                    background: MR_THEME.colors.cardBg,
                                    borderRadius: 999,
                                    padding: "6px 10px 6px 6px",
                                    cursor: "pointer",
                                    boxShadow: MR_THEME.shadows.cardSoft,
                                }}
                            >
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 999,
                                        background: MR_THEME.colors.primarySoft,
                                        color: MR_THEME.colors.primary,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 12,
                                        fontWeight: 900,
                                    }}
                                >
                                    {(user?.email?.[0] ?? "U").toUpperCase()}
                                </div>

                                {!isMobile && (
                                    <div style={{ textAlign: "left" }}>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 800,
                                                color: MR_THEME.colors.textPrimary,
                                            }}
                                        >
                                            {user?.email?.split("@")[0] ?? "User"}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: MR_THEME.colors.textMuted,
                                                maxWidth: 190,
                                                overflow: "hidden",
                                                whiteSpace: "nowrap",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {user?.email ?? "—"}
                                        </div>
                                    </div>
                                )}

                                <span
                                    style={{
                                        color: MR_THEME.colors.textMuted,
                                        fontSize: 14,
                                        fontWeight: 900,
                                    }}
                                >
                                    ▾
                                </span>
                            </button>
                            {userMenuOpen && (
                                <div
                                    style={{
                                        position: "absolute",
                                        right: -4,
                                        top: "135%",
                                        background: "#ffffff",
                                        border: `1px solid ${MR_THEME.colors.border}`,
                                        borderTop: `1px solid ${MR_THEME.colors.borderStrong}`,
                                        borderRadius: MR_THEME.radius.card,
                                        boxShadow: MR_THEME.shadows.cardSoft,
                                        minWidth: 180,
                                        padding: "4px 0",
                                        overflow: "hidden",
                                        zIndex: 50,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            router.push("/profile");
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = MR_THEME.colors.cardBgSoft)}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                        style={menuItemStyle}
                                    >
                                        Profile
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            router.push("/settings");
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = MR_THEME.colors.cardBgSoft)}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                        style={menuItemStyle}
                                    >
                                        Settings
                                    </button>
                                    <div
                                        style={{
                                            height: 1,
                                            background: MR_THEME.colors.border,
                                            margin: "4px 0",
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSignOut}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = MR_THEME.colors.cardBgSoft)}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                        style={{ ...menuItemStyle, color: MR_THEME.colors.danger }}
                                    >
                                        Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {
                    showPlatformBanner && (
                        <div
                            style={{
                                maxWidth: 1180,
                                margin: "0 auto 16px",
                                padding: "14px 16px",
                                borderRadius: 14,
                                border: "1px solid #dbe4f0",
                                background: "linear-gradient(180deg, #f8fbff 0%, #f1f6fd 100%)",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 12,
                                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                            }}
                        >
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <div
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 900,
                                        letterSpacing: "0.08em",
                                        textTransform: "uppercase",
                                        color: "#2563eb",
                                    }}
                                >
                                    Platform Mode
                                </div>

                                <div
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: "#0f172a",
                                    }}
                                >
                                    You are operating as{" "}
                                    <span style={{ color: "#1d4ed8" }}>
                                        {companyName || "—"}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    localStorage.removeItem("platformMode");
                                    localStorage.removeItem("activeCompanyId");
                                    window.dispatchEvent(new CustomEvent("active-company-refresh"));
                                    setPlatformMode(false);
                                    router.push("/platform/companies");
                                }}
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: 10,
                                    border: "1px solid #c7d7ee",
                                    background: "#ffffff",
                                    cursor: "pointer",
                                    fontSize: 12,
                                    fontWeight: 800,
                                    color: "#1d4ed8",
                                    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                                }}
                            >
                                ← Back to Companies
                            </button>
                        </div>
                    )
                }
                {children}
            </main >
        </div >
    );
}