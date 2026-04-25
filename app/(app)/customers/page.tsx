"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { useRouter } from "next/navigation";
import { useAuthState } from "../../../hooks/useAuthState";

const MR_THEME = {
    appBg: "#f8fafc",
    cardBg: "#ffffff",
    cardBgSoft: "#f9fafb",
    border: "#e2e8f0",
    borderStrong: "#cbd5e1",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#94a3b8",
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    shadowCard: "0 1px 2px rgba(16, 24, 40, 0.04)",
};

type Customer = {
    customer_id: string;
    name: string;
    email: string | null;
    phone: string | null;
};

export default function CustomersPage() {
    const router = useRouter();
    const { user, authLoading } = useAuthState();
    const { companyId, companyName, myRole, isLoadingCompany } = useActiveCompany();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    const loadCustomers = useCallback(async () => {
        setLoading(true);

        const query = supabase
            .from("customers")
            .select("customer_id, name, email, phone")
            .order("name", { ascending: true });

        const { data, error } = companyId
            ? await query.eq("company_id", companyId)
            : await query;

        if (error) {
            console.error("Error loading customers:", error);
            alert(error.message);
            setCustomers([]);
        } else {
            setCustomers(data || []);
        }

        setLoading(false);
    }, [companyId]);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.replace("/auth");
            return;
        }

        if (isLoadingCompany) return;

        if (myRole !== "owner" && myRole !== "admin") {
            router.replace("/work-orders");
            return;
        }
    }, [authLoading, user, isLoadingCompany, myRole, router]);

    async function handleNewCustomer() {
        if (!companyId) {
            alert("No active company selected");
            return;
        }

        const name = prompt("Customer name");
        if (!name || !name.trim()) return;

        const email = prompt("Email (optional)") || null;
        const phone = prompt("Phone (optional)") || null;

        const { error } = await supabase.from("customers").insert({
            company_id: companyId,
            customer_type: "person",
            name: name.trim(),
            email: email?.trim() || null,
            phone: phone?.trim() || null,
        });

        if (error) {
            console.error("Error creating customer:", error);
            alert(error.message || "Error creating customer");
            return;
        }

        await loadCustomers();
    }

    useEffect(() => {
        if (!companyId) return;
        if (myRole !== "owner" && myRole !== "admin") return;

        queueMicrotask(() => {
            void loadCustomers();
        });
    }, [companyId, myRole, loadCustomers]);

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 18,
                }}
            >
                <div
                    style={{
                        flex: 1,
                        minWidth: 280,
                        padding: "18px 20px",
                        borderRadius: 16,
                        border: `1px solid ${MR_THEME.border}`,
                        background: MR_THEME.cardBg,
                        boxShadow: MR_THEME.shadowCard,
                    }}
                >
                    <div
                        style={{
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            color: MR_THEME.textSecondary,
                            fontWeight: 800,
                            marginBottom: 6,
                        }}
                    >
                        Customers
                    </div>

                    <h1
                        style={{
                            margin: 0,
                            fontSize: 30,
                            lineHeight: 1.1,
                            fontWeight: 900,
                            letterSpacing: "-0.03em",
                            color: MR_THEME.textPrimary,
                        }}
                    >
                        {companyName || "Your Business"} — Customers
                    </h1>

                    <div
                        style={{
                            marginTop: 10,
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            alignItems: "center",
                        }}
                    >
                        <span
                            style={{
                                padding: "6px 10px",
                                borderRadius: 999,
                                background: MR_THEME.cardBgSoft,
                                border: `1px solid ${MR_THEME.border}`,
                                fontSize: 13,
                                color: MR_THEME.textSecondary,
                            }}
                        >
                            Total customers: <b>{customers.length}</b>
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleNewCustomer}
                    style={{
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: `1px solid ${MR_THEME.primary}`,
                        background: MR_THEME.primary,
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 800,
                        boxShadow: MR_THEME.shadowCard,
                    }}
                >
                    + New Customer
                </button>
            </div>

            {loading ? (
                <div
                    style={{
                        padding: 18,
                        borderRadius: 14,
                        border: `1px solid ${MR_THEME.border}`,
                        background: MR_THEME.cardBg,
                        color: MR_THEME.textSecondary,
                    }}
                >
                    Loading customers...
                </div>
            ) : null}

            {!loading && customers.length === 0 ? (
                <div
                    style={{
                        border: `1px dashed ${MR_THEME.borderStrong}`,
                        padding: 20,
                        borderRadius: 16,
                        background: MR_THEME.cardBgSoft,
                        color: MR_THEME.textSecondary,
                    }}
                >
                    No customers yet.
                </div>
            ) : null}

            {!loading && customers.length > 0 ? (
                <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
                    {customers.map((c) => (
                        <div
                            key={c.customer_id}
                            style={{
                                border: `1px solid ${MR_THEME.border}`,
                                padding: 18,
                                borderRadius: 16,
                                background: MR_THEME.cardBg,
                                boxShadow: MR_THEME.shadowCard,
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 16,
                                alignItems: "center",
                                flexWrap: "wrap",
                            }}
                        >
                            <div style={{ flex: 1, minWidth: 240 }}>
                                <div
                                    style={{
                                        fontWeight: 900,
                                        fontSize: 24,
                                        lineHeight: 1.15,
                                        letterSpacing: "-0.02em",
                                        color: MR_THEME.textPrimary,
                                        marginBottom: 10,
                                    }}
                                >
                                    {c.name}
                                </div>

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                        gap: 10,
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: 12,
                                            borderRadius: 12,
                                            border: `1px solid ${MR_THEME.border}`,
                                            background: MR_THEME.cardBgSoft,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: MR_THEME.textSecondary,
                                                fontWeight: 700,
                                                marginBottom: 5,
                                            }}
                                        >
                                            Email
                                        </div>
                                        <div style={{ fontWeight: 700, color: MR_THEME.textPrimary }}>
                                            {c.email || "—"}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            padding: 12,
                                            borderRadius: 12,
                                            border: `1px solid ${MR_THEME.border}`,
                                            background: MR_THEME.cardBgSoft,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: MR_THEME.textSecondary,
                                                fontWeight: 700,
                                                marginBottom: 5,
                                            }}
                                        >
                                            Phone
                                        </div>
                                        <div style={{ fontWeight: 700, color: MR_THEME.textPrimary }}>
                                            {c.phone || "—"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <Link
                                    href={`/customers/${c.customer_id}`}
                                    style={{
                                        display: "inline-block",
                                        padding: "10px 14px",
                                        borderRadius: 12,
                                        border: `1px solid ${MR_THEME.borderStrong}`,
                                        background: MR_THEME.cardBg,
                                        color: MR_THEME.textPrimary,
                                        textDecoration: "none",
                                        fontWeight: 800,
                                    }}
                                >
                                    Open customer
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}