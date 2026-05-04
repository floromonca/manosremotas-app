"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MR_THEME } from "@/lib/theme";
import { useActiveCompany } from "../../../hooks/useActiveCompany";

const settingsNavItems = [
    { href: "/settings/company", label: "Company" },
    { href: "/settings/services", label: "Services" },
    { href: "/settings/billing", label: "Billing" },
    { href: "/settings/taxes", label: "Taxes" },
    { href: "/settings/preferences", label: "Preferences" },
    { href: "/settings/team", label: "Team" },
];

function isActivePath(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}

function SettingsNavItem({
    href,
    label,
    isActive,
    variant = "desktop",
}: {
    href: string;
    label: string;
    isActive: boolean;
    variant?: "desktop" | "mobile";
}) {
    return (
        <Link
            href={href}
            style={{
                display: variant === "mobile" ? "inline-flex" : "flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",

                padding: variant === "mobile" ? "8px 10px" : "10px 12px",

                borderRadius: MR_THEME.radius.control,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: isActive ? 700 : 600,
                lineHeight: 1.3,
                paddingBottom: variant === "mobile" ? 6 : 8,

                background: "transparent",

                color: isActive
                    ? MR_THEME.colors.primaryHover
                    : MR_THEME.colors.textSecondary,

                border: "none",
                boxShadow: "none",

                borderBottom: isActive
                    ? `2px solid ${MR_THEME.colors.primary}`
                    : "2px solid transparent",
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
        <>
            <style jsx global>{`
                .mr-settings-shell {
                    width: 100%;
                    max-width: 1280px;
                    margin: 0 auto;
                    padding: 8px 0 32px;
                }

                .mr-settings-grid {
                    display: grid;
                    grid-template-columns: 260px minmax(0, 1fr);
                    gap: 28px;
                    align-items: start;
                }

                .mr-settings-sidebar {
                    position: sticky;
                    top: 24px;
                }

                .mr-settings-mobile-nav {
                    display: none;
                }

            @media (max-width: 768px) {
    .mr-settings-shell {
        padding: 0 0 24px;
    }

    .mr-settings-grid {
        display: block;
    }

    .mr-settings-sidebar {
        display: none;
    }

    .mr-settings-mobile-nav {
    display: block;
    margin: 4px 0 16px;
}

    .mr-settings-mobile-scroll {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 2px 0 8px;
        -webkit-overflow-scrolling: touch;
    }

    .mr-settings-mobile-scroll::-webkit-scrollbar {
        display: none;
    }
}
            `}</style>

            <div className="mr-settings-shell">
                <div className="mr-settings-mobile-nav">
                    <div
                        style={{
                            padding: "6px 2px 0",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 16,
                                fontWeight: 800,
                                color: MR_THEME.colors.textPrimary,
                                marginBottom: 8,
                            }}
                        >
                            Settings
                        </div>

                        <div
                            className="mr-settings-mobile-scroll"
                            style={{
                                borderBottom: `1px solid ${MR_THEME.colors.border}`,
                            }}
                        >
                            {settingsNavItems.map((item) => (
                                <SettingsNavItem
                                    key={item.href}
                                    href={item.href}
                                    label={item.label}
                                    isActive={isActivePath(pathname, item.href)}
                                    variant="mobile"
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mr-settings-grid">
                    <aside className="mr-settings-sidebar">
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
                                {settingsNavItems.map((item) => (
                                    <SettingsNavItem
                                        key={item.href}
                                        href={item.href}
                                        label={item.label}
                                        isActive={isActivePath(pathname, item.href)}
                                    />
                                ))}
                            </div>
                        </div>
                    </aside>

                    <main style={{ minWidth: 0 }}>{children}</main>
                </div>
            </div>
        </>
    );
}