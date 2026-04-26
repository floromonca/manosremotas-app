"use client";

import { useRouter } from "next/navigation";
import AppSidebar from "../components/AppSidebar";
import { useAuthState } from "../../hooks/useAuthState";
import { useActiveCompany } from "../../hooks/useActiveCompany";
import { supabase } from "../../lib/supabaseClient";
import { useState, useEffect, useMemo } from "react";
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

    const SUPER_ADMIN_EMAILS = ["floromonca@gmail.com"];
    const isSuperAdmin = !!user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

    const showPlatformBanner = useMemo(() => {
        return isSuperAdmin && platformMode;
    }, [isSuperAdmin, platformMode]);

    const mainBg = "#F3F4F6";

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
                        <AppSidebar />
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
                        maxWidth: 1080,
                        margin: "0 auto 18px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: MR_THEME.spacing.md,
                            padding: isMobile
                                ? `${MR_THEME.spacing.sm}px ${MR_THEME.spacing.md}px`
                                : `${MR_THEME.spacing.md}px ${MR_THEME.spacing.lg}px`,
                            borderRadius: MR_THEME.radius.card,
                            background: "linear-gradient(135deg, #eef4ff 0%, #dbeafe 45%, #c7dafe 100%)",
                            borderTop: `1px solid ${MR_THEME.colors.border}`,
                            borderRight: `1px solid ${MR_THEME.colors.border}`,
                            borderBottom: `1px solid ${MR_THEME.colors.border}`,
                            borderLeft: `4px solid ${MR_THEME.colors.primary}`,
                            boxShadow: MR_THEME.shadows.cardSoft,
                            flexWrap: "wrap",
                        }}
                    >
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
                                        width: isMobile ? 38 : 42,
                                        height: isMobile ? 38 : 42,
                                        borderRadius: MR_THEME.radius.control,
                                        border: `1px solid ${MR_THEME.colors.border}`,
                                        background: MR_THEME.colors.cardBg,
                                        color: MR_THEME.colors.primary,
                                        cursor: "pointer",
                                        fontSize: 22,
                                        fontWeight: 900,
                                        boxShadow: MR_THEME.shadows.card,
                                    }}
                                >
                                    ☰
                                </button>
                            )}

                            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                                <div
                                    style={{
                                        ...MR_THEME.typography.small,
                                        textTransform: "uppercase",
                                        letterSpacing: 1.2,
                                        color: MR_THEME.colors.primary,
                                        fontWeight: 900,
                                    }}
                                >
                                    Company
                                </div>

                                <div
                                    style={{
                                        ...MR_THEME.typography.cardTitle,
                                        color: MR_THEME.colors.textPrimary,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {companyName || "—"}
                                </div>
                            </div>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: isMobile ? MR_THEME.spacing.sm : MR_THEME.spacing.md,
                                flexWrap: "wrap",
                                marginLeft: "auto",
                            }}
                        >
                            <div style={{ textAlign: "right", minWidth: 0 }}>
                                <div
                                    style={{
                                        ...MR_THEME.typography.small,
                                        textTransform: "uppercase",
                                        letterSpacing: 1.2,
                                        color: MR_THEME.colors.primary,
                                        fontWeight: 900,
                                        marginBottom: 2,
                                    }}
                                >
                                    User
                                </div>

                                <div
                                    style={{
                                        ...MR_THEME.typography.small,
                                        color: MR_THEME.colors.textSecondary,
                                        maxWidth: isMobile ? 150 : 260,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {user?.email ?? "—"}
                                </div>
                            </div>

                            <button
                                onClick={handleSignOut}
                                style={{
                                    height: isMobile ? 34 : MR_THEME.components.button.height,
                                    padding: isMobile ? "0 10px" : `0 ${MR_THEME.components.button.paddingX}px`,
                                    borderRadius: MR_THEME.radius.control,
                                    border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                    background: MR_THEME.colors.cardBg,
                                    cursor: "pointer",
                                    fontWeight: MR_THEME.components.button.fontWeight,
                                    fontSize: isMobile ? 12 : 14,
                                    color: MR_THEME.colors.textPrimary,
                                    boxShadow: MR_THEME.shadows.card,
                                }}
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
                {showPlatformBanner && (
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
                )}
                {children}
            </main>
        </div>
    );
}