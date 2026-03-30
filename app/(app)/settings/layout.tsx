"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const Item = ({ href, label }: { href: string; label: string }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
            <Link
                href={href}
                style={{
                    display: "block",
                    padding: "12px 14px",
                    borderRadius: 12,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    lineHeight: 1.3,
                    background: active ? "#eff6ff" : "transparent",
                    color: active ? "#1d4ed8" : "#111827",
                    border: active ? "1px solid #bfdbfe" : "1px solid transparent",
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                    transition: "all 0.15s ease",
                }}
            >
                {label}
            </Link>
        );
    };

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 1280,
                margin: "0 auto",
                padding: "8px 0 32px 0",
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "260px minmax(0, 1fr)",
                    gap: 28,
                    alignItems: "start",
                }}
            >
                <aside
                    style={{
                        position: "sticky",
                        top: 24,
                    }}
                >
                    <div
                        style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 16,
                            padding: 18,
                            background: "#ffffff",
                            boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 20,
                                fontWeight: 700,
                                color: "#111827",
                                marginBottom: 4,
                            }}
                        >
                            Settings
                        </div>

                        <div
                            style={{
                                fontSize: 13,
                                color: "#6b7280",
                                lineHeight: 1.5,
                                marginBottom: 16,
                            }}
                        >
                            Manage company, billing, taxes, preferences, and team access.
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                            <Item href="/settings/company" label="Company" />
                            <Item href="/settings/billing" label="Billing" />
                            <Item href="/settings/taxes" label="Taxes" />
                            <Item href="/settings/preferences" label="Preferences" />
                            <Item href="/settings/team" label="Team" />
                        </div>
                    </div>
                </aside>

                <main
                    style={{
                        minWidth: 0,
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}