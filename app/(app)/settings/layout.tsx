"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MR_THEME } from "@/lib/theme";
import { useActiveCompany } from "../../../hooks/useActiveCompany";

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
                borderRadius: MR_THEME.radius.control,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: isActive ? 700 : 600,
                lineHeight: 1.3,
                background: isActive ? MR_THEME.colors.primarySoft : "transparent",
                color: isActive ? MR_THEME.colors.primaryHover : MR_THEME.colors.textPrimary,
                border: isActive
                    ? `1px solid ${MR_THEME.colors.primarySoft}`
                    : "1px solid transparent",
                boxShadow: isActive ? MR_THEME.shadows.cardSoft : "none",
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
    const router = useRouter();
    const { myRole, isLoadingCompany } = useActiveCompany();

    const isAdmin = myRole === "owner" || myRole === "admin";

    useEffect(() => {
        if (isLoadingCompany) return;

        if (!isAdmin) {
            router.replace("/work-orders");
        }
    }, [isLoadingCompany, isAdmin, router]);

    if (isLoadingCompany) {
        return null;
    }

    if (!isAdmin) {
        return null;
    }

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
                            border: `1px solid ${MR_THEME.colors.border}`,
                            borderRadius: MR_THEME.radius.card,
                            padding: 18,
                            background: MR_THEME.colors.cardBg,
                            boxShadow: MR_THEME.shadows.cardSoft,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 20,
                                fontWeight: 800,
                                color: MR_THEME.colors.textPrimary,
                                marginBottom: 4,
                            }}
                        >
                            Settings
                        </div>

                        <div
                            style={{
                                fontSize: 13,
                                color: MR_THEME.colors.textSecondary,
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
                                isActive={
                                    pathname === "/settings/company" ||
                                    pathname.startsWith("/settings/company/")
                                }
                            />

                            <SettingsNavItem
                                href="/settings/billing"
                                label="Billing"
                                isActive={
                                    pathname === "/settings/billing" ||
                                    pathname.startsWith("/settings/billing/")
                                }
                            />

                            <SettingsNavItem
                                href="/settings/taxes"
                                label="Taxes"
                                isActive={
                                    pathname === "/settings/taxes" ||
                                    pathname.startsWith("/settings/taxes/")
                                }
                            />

                            <SettingsNavItem
                                href="/settings/preferences"
                                label="Preferences"
                                isActive={
                                    pathname === "/settings/preferences" ||
                                    pathname.startsWith("/settings/preferences/")
                                }
                            />

                            <SettingsNavItem
                                href="/settings/team"
                                label="Team"
                                isActive={
                                    pathname === "/settings/team" ||
                                    pathname.startsWith("/settings/team/")
                                }
                            />
                        </div>
                    </div>
                </aside>

                <main style={{ minWidth: 0 }}>{children}</main>
            </div>
        </div>
    );
}