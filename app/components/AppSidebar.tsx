"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MR_THEME } from "@/lib/theme";
import { canAdminCompany, canManagePayroll } from "@/lib/security/roles";
import { useActiveCompany } from "../../hooks/useActiveCompany";

type SidebarItemProps = {
    href: string;
    label: string;
    isActive: boolean;
    onNavigate?: () => void;
    variant?: "desktop" | "mobile";
};

const SIDEBAR = {
    bg: MR_THEME.colors.cardBg,
    border: MR_THEME.colors.border,
    text: MR_THEME.colors.textSecondary,
    textMuted: MR_THEME.colors.textMuted,
    activeText: MR_THEME.colors.primary,
};

function SidebarItem({ href, label, isActive, onNavigate, variant = "desktop" }: SidebarItemProps) {
    const isDesktop = variant === "desktop";

    const itemStyle: CSSProperties = {
        display: "block",
        padding: isDesktop ? "8px 10px" : "10px 12px",
        borderRadius: MR_THEME.radius.control,
        textDecoration: "none",
        fontWeight: isActive ? 800 : 700,
        fontSize: isDesktop ? 14 : undefined,
        background: isActive ? MR_THEME.colors.primarySoft : "transparent",
        color: isActive ? SIDEBAR.activeText : SIDEBAR.text,
        border: isActive ? `1px solid ${MR_THEME.colors.primarySurface}` : "1px solid transparent",
        boxShadow: isActive ? MR_THEME.shadows.card : "none",
    };

    return (
        <Link href={href} onClick={onNavigate} style={itemStyle}>
            {label}
        </Link>
    );
}

type Props = {
    onNavigate?: () => void;
    variant?: "desktop" | "mobile";
};

export default function AppSidebar({ onNavigate, variant = "desktop" }: Props) {
    const pathname = usePathname();
    const { myRole } = useActiveCompany();

    const isAdmin = canAdminCompany(myRole);
    const showPayroll = canManagePayroll(myRole);
    const isDesktop = variant === "desktop";

    return (
        <aside
            style={{
                width: isDesktop ? 204 : 220,
                background: SIDEBAR.bg,
                color: MR_THEME.colors.textPrimary,
                padding: isDesktop ? 16 : 20,
                display: "flex",
                flexDirection: "column",
                gap: isDesktop ? 8 : 10,
                borderRight: `1px solid ${SIDEBAR.border}`,
                minHeight: "100vh",
            }}
        >
            <div style={{ marginBottom: isDesktop ? 8 : 10 }}>
                <h2
                    style={{
                        margin: 0,
                        fontSize: isDesktop ? 18 : 19,
                        fontWeight: 900,
                        letterSpacing: 0,
                        color: MR_THEME.colors.textPrimary,
                    }}
                >
                    ManosRemotas
                </h2>

                <div
                    style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: SIDEBAR.textMuted,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                    }}
                >
                    Operations
                </div>
            </div>

            {isAdmin ? (
                <SidebarItem
                    href="/control-center"
                    label="Control Center"
                    isActive={pathname.startsWith("/control-center")}
                    onNavigate={onNavigate}
                    variant={variant}
                />
            ) : null}

            <SidebarItem
                href="/my-day"
                label="My Day"
                isActive={pathname.startsWith("/my-day")}
                onNavigate={onNavigate}
                variant={variant}
            />

            <SidebarItem
                href="/work-orders"
                label="Work Orders"
                isActive={pathname.startsWith("/work-orders")}
                onNavigate={onNavigate}
                variant={variant}
            />

            {showPayroll ? (
                <SidebarItem
                    href="/payroll"
                    label="Payroll"
                    isActive={pathname.startsWith("/payroll")}
                    onNavigate={onNavigate}
                    variant={variant}
                />
            ) : null}

            <SidebarItem
                href="/profile"
                label="Profile"
                isActive={pathname.startsWith("/profile")}
                onNavigate={onNavigate}
                variant={variant}
            />

            {isAdmin ? (
                <>
                    <SidebarItem
                        href="/customers"
                        label="Customers"
                        isActive={pathname.startsWith("/customers")}
                        onNavigate={onNavigate}
                        variant={variant}
                    />

                    <SidebarItem
                        href="/invoices"
                        label="Invoices"
                        isActive={pathname.startsWith("/invoices")}
                        onNavigate={onNavigate}
                        variant={variant}
                    />

                    <div
                        style={{
                            height: 1,
                            margin: "6px 0",
                            background: MR_THEME.colors.border,
                        }}
                    />

                    <SidebarItem
                        href="/settings"
                        label="Settings"
                        isActive={pathname.startsWith("/settings")}
                        onNavigate={onNavigate}
                        variant={variant}
                    />
                </>
            ) : null}
        </aside>
    );
}
