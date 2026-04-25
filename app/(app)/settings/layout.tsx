"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MR_THEME = {
    appBg: "#f8fafc",
    cardBg: "#ffffff",
    border: "#e2e8f0",
    borderStrong: "#cbd5e1",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    primarySoft: "#dbeafe",
    shadowCard: "0 1px 2px rgba(16, 24, 40, 0.04)",
};

function SettingsNavItem({
    href,
    label,
    isActive,
}: {
    href: string;
    label: string;
    isActive: boolean;
}) {
    return (
        <Link
            href={href}
            style={{
                display: "block",
                padding: "12px 14px",
                borderRadius: 12,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: isActive ? 700 : 600,
                lineHeight: 1.3,
                background: isActive ? MR_THEME.primarySoft : "transparent",
                color: isActive ? MR_THEME.primaryHover : MR_THEME.textPrimary,
                border: isActive ? `1px solid ${MR_THEME.primarySoft}` : "1px solid transparent",
                boxShadow: isActive ? MR_THEME.shadowCard : "none",
            }}
        >
            {label}
        </Link>
    );
}

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

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
                            border: `1px solid ${MR_THEME.border}`,
                            borderRadius: 16,
                            padding: 18,
                            background: MR_THEME.cardBg,
                            boxShadow: MR_THEME.shadowCard,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 20,
                                fontWeight: 800,
                                color: MR_THEME.textPrimary,
                                marginBottom: 4,
                            }}
                        >
                            Settings
                        </div>

                        <div
                            style={{
                                fontSize: 13,
                                color: MR_THEME.textSecondary,
                                lineHeight: 1.5,
                                marginBottom: 16,
                            }}
                        >
                            Manage company, billing, taxes, preferences, and team access.
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                            <SettingsNavItem
                                href="/settings/company"
                                label="Company"
                                isActive={pathname === "/settings/company" || pathname.startsWith("/settings/company/")}
                            />
                            <SettingsNavItem
                                href="/settings/billing"
                                label="Billing"
                                isActive={pathname === "/settings/billing" || pathname.startsWith("/settings/billing/")}
                            />
                            <SettingsNavItem
                                href="/settings/taxes"
                                label="Taxes"
                                isActive={pathname === "/settings/taxes" || pathname.startsWith("/settings/taxes/")}
                            />
                            <SettingsNavItem
                                href="/settings/preferences"
                                label="Preferences"
                                isActive={pathname === "/settings/preferences" || pathname.startsWith("/settings/preferences/")}
                            />
                            <SettingsNavItem
                                href="/settings/team"
                                label="Team"
                                isActive={pathname === "/settings/team" || pathname.startsWith("/settings/team/")}
                            />
                        </div>
                    </div>
                </aside>

                <main style={{ minWidth: 0 }}>{children}</main>
            </div>
        </div>
    );
}