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
    bg: "#0f172a",
    border: "#1e293b",
    text: "#cbd5e1",
    textMuted: "#94a3b8",
    activeText: "#ffffff",
};

function SidebarItem({ href, label, isActive, onNavigate }: SidebarItemProps) {
    const itemStyle: CSSProperties = {
        display: "block",
        padding: "10px 12px",
        borderRadius: MR_THEME.radius.control,
        textDecoration: "none",
        fontWeight: isActive ? 800 : 700,
        background: isActive ? MR_THEME.colors.primary : "transparent",
        color: isActive ? SIDEBAR.activeText : SIDEBAR.text,
        border: isActive ? `1px solid ${MR_THEME.colors.primaryHover}` : "1px solid transparent",
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
                color: SIDEBAR.activeText,
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
                        letterSpacing: -0.3,
                        color: SIDEBAR.activeText,
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
                            background: SIDEBAR.border,
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