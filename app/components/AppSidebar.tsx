"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MR_THEME } from "@/lib/theme";
import { useActiveCompany } from "../../hooks/useActiveCompany";

type SidebarItemProps = {
    href: string;
    label: string;
    isActive: boolean;
    onNavigate?: () => void;
};

const SIDEBAR = {
    bg: MR_THEME.colors.cardBg,
    border: MR_THEME.colors.border,
    text: MR_THEME.colors.textSecondary,
    textMuted: MR_THEME.colors.textMuted,
    activeText: MR_THEME.colors.primary,
};

function SidebarItem({ href, label, isActive, onNavigate }: SidebarItemProps) {
    const itemStyle: CSSProperties = {
        display: "block",
        padding: "10px 12px",
        borderRadius: MR_THEME.radius.control,
        textDecoration: "none",
        fontWeight: isActive ? 800 : 700,
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
};

export default function AppSidebar({ onNavigate }: Props) {
    const pathname = usePathname();
    const { myRole } = useActiveCompany();

    const isAdmin = myRole === "owner" || myRole === "admin";

    return (
        <aside
            style={{
                width: 220,
                background: SIDEBAR.bg,
                color: MR_THEME.colors.textPrimary,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                borderRight: `1px solid ${SIDEBAR.border}`,
                minHeight: "100vh",
            }}
        >
            <div style={{ marginBottom: 10 }}>
                <h2
                    style={{
                        margin: 0,
                        fontSize: 19,
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
                />
            ) : null}

            <SidebarItem
                href="/my-day"
                label="My Day"
                isActive={pathname.startsWith("/my-day")}
                onNavigate={onNavigate}
            />

            <SidebarItem
                href="/work-orders"
                label="Work Orders"
                isActive={pathname.startsWith("/work-orders")}
                onNavigate={onNavigate}
            />

            <SidebarItem
                href="/payroll"
                label={isAdmin ? "Payroll" : "My Time"}
                isActive={pathname.startsWith("/payroll")}
                onNavigate={onNavigate}
            />

            <SidebarItem
                href="/profile"
                label="Profile"
                isActive={pathname.startsWith("/profile")}
                onNavigate={onNavigate}
            />

            {isAdmin ? (
                <>
                    <SidebarItem
                        href="/customers"
                        label="Customers"
                        isActive={pathname.startsWith("/customers")}
                        onNavigate={onNavigate}
                    />

                    <SidebarItem
                        href="/invoices"
                        label="Invoices"
                        isActive={pathname.startsWith("/invoices")}
                        onNavigate={onNavigate}
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
                    />
                </>
            ) : null}
        </aside>
    );
}
