"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ControlCenterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const Item = ({ href, label }: { href: string; label: string }) => {
        const active = pathname.startsWith(href);

        return (
            <Link
                href={href}
                style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontWeight: active ? 700 : 500,
                    background: active ? "#f0f0f0" : "transparent",
                    color: "#111",
                }}
            >
                {label}
            </Link>
        );
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr" }}>

            {/* Sidebar */}
            <div
                style={{
                    borderRight: "1px solid #eee",
                    padding: 20,
                    minHeight: "100vh",
                }}
            >
                <div style={{ fontWeight: 700, marginBottom: 14 }}>
                    Control Center
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                    <Item href="/control-center/company" label="Company" />
                    <Item href="/control-center/billing" label="Billing" />
                    <Item href="/control-center/taxes" label="Taxes" />
                    <Item href="/control-center/preferences" label="Preferences" />
                    <Item href="/settings/team" label="Team" />
                </div>
            </div>

            {/* Content */}
            <div>{children}</div>
        </div>
    );
}