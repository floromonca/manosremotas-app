"use client";

import { useRouter } from "next/navigation";
import AppSidebar from "../components/AppSidebar";
import { useAuthState } from "../../hooks/useAuthState";
import { useActiveCompany } from "../../hooks/useActiveCompany";
import { supabase } from "../../lib/supabaseClient";

export default function AppShellLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user } = useAuthState();
    const { companyName } = useActiveCompany();

    const mainBg = "#F3F4F6";

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.replace("/auth");
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: mainBg }}>
            <AppSidebar />

            <main
                style={{
                    flex: 1,
                    padding: "28px 24px 40px",
                    background: mainBg,
                }}
            >
                <div style={{ maxWidth: 1180, margin: "0 auto 20px" }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 16,
                            padding: "16px 18px",
                            border: "1px solid #e5e7eb",
                            borderRadius: 16,
                            background: "linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)",
                            boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                            flexWrap: "wrap",
                        }}
                    >
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div
                                style={{
                                    fontSize: 12,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.8,
                                    color: "#64748b",
                                    fontWeight: 800,
                                }}
                            >
                                Company
                            </div>

                            <div
                                style={{
                                    fontSize: 17,
                                    fontWeight: 800,
                                    color: "#0f172a",
                                }}
                            >
                                {companyName || "—"}
                            </div>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                flexWrap: "wrap",
                                marginLeft: "auto",
                            }}
                        >
                            <div style={{ textAlign: "right" }}>
                                <div
                                    style={{
                                        fontSize: 12,
                                        textTransform: "uppercase",
                                        letterSpacing: 0.8,
                                        color: "#64748b",
                                        fontWeight: 800,
                                        marginBottom: 4,
                                    }}
                                >
                                    User
                                </div>

                                <div
                                    style={{
                                        fontSize: 13,
                                        color: "#334155",
                                        fontWeight: 500,
                                    }}
                                >
                                    {user?.email ?? "—"}
                                </div>
                            </div>

                            <button
                                onClick={handleSignOut}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 12,
                                    border: "1px solid #d1d5db",
                                    background: "white",
                                    cursor: "pointer",
                                    fontWeight: 800,
                                    color: "#0f172a",
                                }}
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
                {children}
            </main>
        </div>
    );
}