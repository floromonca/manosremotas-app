"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppSidebar() {
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
                    fontWeight: active ? 600 : 500,
                    background: active ? "#2563eb" : "transparent",
                    color: active ? "#ffffff" : "#cbd5e1",
                }}
            >
                {label}
            </Link>
        );
    };

    return (
        <aside
            style={{
                width: 220,
                background: "#1e293b",
                color: "white",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 10,
            }}
        >
            <h2 style={{ marginTop: 0 }}>ManosRemotas</h2>

            <Item href="/control-center" label="Control Center" />

            <div style={{ height: 10 }} />

            <Item href="/work-orders" label="Work Orders" />
            <Item href="/customers" label="Customers" />
            <Item href="/invoices" label="Invoices" />

            <div style={{ height: 10, opacity: 0.3, borderTop: "1px solid #475569" }} />

            <Item href="/settings" label="Settings" />
        </aside>
    );
}