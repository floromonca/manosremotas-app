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
        const active = pathname.startsWith(href);

        return (
            <Link
                href={href}
                style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontWeight: active ? 700 : 500,
                    background: active ? "#eef2ff" : "transparent",
                    color: active ? "#1d4ed8" : "#111827",
                    border: active ? "1px solid #c7d2fe" : "1px solid transparent",
                }}
            >
                {label}
            </Link>
        );
    };

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "240px 1fr",
                gap: 24,
                alignItems: "start",
            }}
        >
            <aside
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 16,
                    background: "#fff",
                }}
            >
                <div
                    style={{
                        fontSize: 18,
                        fontWeight: 700,
                        marginBottom: 12,
                    }}
                >
                    Settings
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                    <Item href="/settings/company" label="Company" />
                    <Item href="/settings/billing" label="Billing" />
                    <Item href="/settings/taxes" label="Taxes" />
                    <Item href="/settings/preferences" label="Preferences" />
                    <Item href="/settings/team" label="Team" />
                </div>
            </aside>

            <main>{children}</main>
        </div>
    );
}