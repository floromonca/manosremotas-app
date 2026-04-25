"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveCompany } from "../../hooks/useActiveCompany";

const MR_THEME = {
    primary: "#2563eb",
    primarySoft: "#dbeafe",
    primaryHover: "#1d4ed8",
    sidebarBg: "#0f172a",
    sidebarBorder: "#1e293b",
    sidebarText: "#cbd5e1",
    sidebarTextMuted: "#94a3b8",
    sidebarActiveText: "#ffffff",
    sidebarActiveBg: "#2563eb",
};

function SidebarItem({
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
                padding: "10px 12px",
                borderRadius: 10,
                textDecoration: "none",
                fontWeight: isActive ? 700 : 600,
                background: isActive ? MR_THEME.sidebarActiveBg : "transparent",
                color: isActive ? MR_THEME.sidebarActiveText : MR_THEME.sidebarText,
                border: isActive ? `1px solid ${MR_THEME.primaryHover}` : "1px solid transparent",
            }}
        >
            {label}
        </Link>
    );
}

export default function AppSidebar() {
    const pathname = usePathname();
    const { myRole } = useActiveCompany();

    const isAdmin = myRole === "owner" || myRole === "admin";

    return (
        <aside
            style={{
                width: 220,
                background: MR_THEME.sidebarBg,
                color: MR_THEME.sidebarActiveText,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                borderRight: `1px solid ${MR_THEME.sidebarBorder}`,
                minHeight: "100vh",
            }}
        >
            <div style={{ marginBottom: 10 }}>
                <h2
                    style={{
                        margin: 0,
                        fontSize: 19,
                        fontWeight: 800,
                        letterSpacing: -0.3,
                    }}
                >
                    ManosRemotas
                </h2>
                <div
                    style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: MR_THEME.sidebarTextMuted,
                        fontWeight: 700,
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
                />
            ) : null}

            <SidebarItem
                href="/my-day"
                label="My Day"
                isActive={pathname.startsWith("/my-day")}
            />

            <SidebarItem
                href="/work-orders"
                label="Work Orders"
                isActive={pathname.startsWith("/work-orders")}
            />

            <SidebarItem
                href="/profile"
                label="Profile"
                isActive={pathname.startsWith("/profile")}
            />

            {isAdmin ? (
                <>
                    <SidebarItem
                        href="/customers"
                        label="Customers"
                        isActive={pathname.startsWith("/customers")}
                    />

                    <SidebarItem
                        href="/invoices"
                        label="Invoices"
                        isActive={pathname.startsWith("/invoices")}
                    />

                    <div
                        style={{
                            height: 1,
                            margin: "6px 0",
                            background: MR_THEME.sidebarBorder,
                        }}
                    />

                    <SidebarItem
                        href="/settings"
                        label="Settings"
                        isActive={pathname.startsWith("/settings")}
                    />
                </>
            ) : null}
        </aside>
    );
}