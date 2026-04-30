"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { useAuthState } from "../../../hooks/useAuthState";
import { MR_THEME } from "../../../lib/theme";

type Customer = {
    customer_id: string;
    name: string;
    email: string | null;
    phone: string | null;
};

const ADMIN_CUSTOMER_ROLES = ["owner", "admin", "office_staff"];

export default function CustomersPage() {
    const router = useRouter();
    const { user, authLoading } = useAuthState();
    const { companyId, companyName, myRole, isLoadingCompany } = useActiveCompany();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    const canAccessCustomers = useMemo(() => {
        return !!myRole && ADMIN_CUSTOMER_ROLES.includes(myRole);
    }, [myRole]);

    const loadCustomers = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);

        const { data, error } = await supabase
            .from("customers")
            .select("customer_id, name, email, phone")
            .eq("company_id", companyId)
            .order("name", { ascending: true });

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

        if (!canAccessCustomers) {
            router.replace("/work-orders");
            return;
        }
    }, [authLoading, user, isLoadingCompany, canAccessCustomers, router]);

    useEffect(() => {
        if (!companyId) return;
        if (!canAccessCustomers) return;

        queueMicrotask(() => {
            void loadCustomers();
        });
    }, [companyId, canAccessCustomers, loadCustomers]);

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

    if (authLoading || isLoadingCompany) {
        return (
            <main
                style={{
                    minHeight: "100vh",
                    background: MR_THEME.colors.appBg,
                    padding: "24px",
                }}
            >
                <div
                    style={{
                        maxWidth: 980,
                        margin: "0 auto",
                        color: MR_THEME.colors.textSecondary,
                    }}
                >
                    Loading customers...
                </div>
            </main>
        );
    }

    return (
        <main
            style={{
                minHeight: "100vh",
                background: MR_THEME.colors.appBg,
                padding: "24px",
            }}
        >
            <div
                style={{
                    maxWidth: 980,
                    margin: "0 auto",
                    display: "grid",
                    gap: 18,
                }}
            >
                <section
                    style={{
                        border: `1px solid ${MR_THEME.colors.border}`,
                        borderRadius: MR_THEME.radius.card,
                        background: MR_THEME.colors.cardBg,
                        boxShadow: MR_THEME.shadows.card,
                        padding: MR_THEME.layout.cardPadding,
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 16,
                        alignItems: "center",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: 1,
                                color: MR_THEME.colors.primary,
                                fontWeight: 800,
                                marginBottom: 8,
                            }}
                        >
                            Customers
                        </div>

                        <h1
                            style={{
                                ...MR_THEME.typography.pageTitle,
                                margin: 0,
                                color: MR_THEME.colors.textPrimary,
                            }}
                        >
                            Customer Directory
                        </h1>

                        <p
                            style={{
                                margin: "8px 0 0",
                                color: MR_THEME.colors.textSecondary,
                                fontSize: 14,
                                lineHeight: 1.5,
                            }}
                        >
                            Manage customer contact information and open each profile to review work
                            orders, billing history, and service activity.
                        </p>

                        <div
                            style={{
                                marginTop: 14,
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                            }}
                        >
                            <span
                                style={{
                                    padding: "6px 10px",
                                    borderRadius: 999,
                                    background: MR_THEME.colors.primarySoft,
                                    border: `1px solid ${MR_THEME.colors.border}`,
                                    fontSize: 13,
                                    color: MR_THEME.colors.textSecondary,
                                    fontWeight: 700,
                                }}
                            >
                                {companyName || "Active company"}
                            </span>

                            <span
                                style={{
                                    padding: "6px 10px",
                                    borderRadius: 999,
                                    background: MR_THEME.colors.cardBgSoft,
                                    border: `1px solid ${MR_THEME.colors.border}`,
                                    fontSize: 13,
                                    color: MR_THEME.colors.textSecondary,
                                    fontWeight: 700,
                                }}
                            >
                                {customers.length} customer{customers.length === 1 ? "" : "s"}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleNewCustomer}
                        style={{
                            padding: "12px 16px",
                            borderRadius: MR_THEME.radius.control,
                            border: `1px solid ${MR_THEME.colors.primary}`,
                            background: MR_THEME.colors.primary,
                            color: "#ffffff",
                            cursor: "pointer",
                            fontWeight: 800,
                            boxShadow: MR_THEME.shadows.cardSoft,
                            whiteSpace: "nowrap",
                        }}
                    >
                        + New Customer
                    </button>
                </section>

                {loading ? (
                    <section
                        style={{
                            padding: 18,
                            borderRadius: MR_THEME.radius.card,
                            border: `1px solid ${MR_THEME.colors.border}`,
                            background: MR_THEME.colors.cardBg,
                            color: MR_THEME.colors.textSecondary,
                            boxShadow: MR_THEME.shadows.card,
                        }}
                    >
                        Loading customers...
                    </section>
                ) : null}

                {!loading && customers.length === 0 ? (
                    <section
                        style={{
                            border: `1px dashed ${MR_THEME.colors.borderStrong}`,
                            padding: 24,
                            borderRadius: MR_THEME.radius.card,
                            background: MR_THEME.colors.cardBg,
                            color: MR_THEME.colors.textSecondary,
                            boxShadow: MR_THEME.shadows.card,
                        }}
                    >
                        <div
                            style={{
                                fontWeight: 900,
                                color: MR_THEME.colors.textPrimary,
                                marginBottom: 6,
                                fontSize: 18,
                            }}
                        >
                            No customers yet
                        </div>
                        <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                            Create your first customer to start organizing work orders and invoices.
                        </div>
                    </section>
                ) : null}

                {!loading && customers.length > 0 ? (
                    <section
                        style={{
                            display: "grid",
                            gap: 12,
                        }}
                    >
                        {customers.map((customer) => (
                            <article
                                key={customer.customer_id}
                                style={{
                                    border: `1px solid ${MR_THEME.colors.border}`,
                                    borderRadius: MR_THEME.radius.card,
                                    background: MR_THEME.colors.cardBg,
                                    boxShadow: MR_THEME.shadows.card,
                                    padding: 14,
                                    display: "grid",
                                    gridTemplateColumns: "minmax(0, 1fr) auto",
                                    gap: 16,
                                    alignItems: "center",
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontWeight: 900,
                                            fontSize: 18,
                                            lineHeight: 1.2,
                                            color: MR_THEME.colors.textPrimary,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {customer.name}
                                    </div>

                                    <div
                                        style={{
                                            marginTop: 10,
                                            display: "grid",
                                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                            gap: 10,
                                        }}
                                    >
                                        <InfoBlock label="Email" value={customer.email || "—"} />
                                        <InfoBlock label="Phone" value={customer.phone || "—"} />
                                    </div>
                                </div>

                                <Link
                                    href={`/customers/${customer.customer_id}`}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "10px 14px",
                                        borderRadius: MR_THEME.radius.control,
                                        border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                        background: MR_THEME.colors.cardBg,
                                        color: MR_THEME.colors.textPrimary,
                                        textDecoration: "none",
                                        fontWeight: 800,
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Open
                                </Link>
                            </article>
                        ))}
                    </section>
                ) : null}
            </div>

            <style jsx>{`
                @media (max-width: 720px) {
                    main {
                        padding: 16px !important;
                    }

                    section,
                    article {
                        grid-template-columns: 1fr !important;
                    }

                    button,
                    a {
                        width: 100%;
                    }
                }
            `}</style>
        </main>
    );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                padding: "8px 10px",
                borderRadius: MR_THEME.radius.control,
                border: `1px solid ${MR_THEME.colors.border}`,
                background: MR_THEME.colors.cardBgSoft,
                minWidth: 0,
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.7,
                    color: MR_THEME.colors.textMuted,
                    fontWeight: 800,
                    marginBottom: 4,
                }}
            >
                {label}
            </div>

            <div
                style={{
                    fontSize: 13,
                    color: MR_THEME.colors.textPrimary,
                    fontWeight: 700,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {value}
            </div>
        </div>
    );
}