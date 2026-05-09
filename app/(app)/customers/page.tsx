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
    const [search, setSearch] = useState("");
    const [isCompactDesktop, setIsCompactDesktop] = useState(false);
    const [cameFromControlCenter] = useState(
        () =>
            typeof window !== "undefined" &&
            new URLSearchParams(window.location.search).get("from") === "control-center",
    );

    const canAccessCustomers = useMemo(() => {
        return !!myRole && ADMIN_CUSTOMER_ROLES.includes(myRole);
    }, [myRole]);
    const filteredCustomers = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) return customers;

        return customers.filter((customer) => {
            const name = customer.name.toLowerCase();
            const email = (customer.email || "").toLowerCase();
            const phone = (customer.phone || "").toLowerCase();

            return name.includes(q) || email.includes(q) || phone.includes(q);
        });
    }, [customers, search]);


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

    useEffect(() => {
        const checkViewport = () => {
            setIsCompactDesktop(window.innerWidth >= 900);
        };

        checkViewport();
        window.addEventListener("resize", checkViewport);

        return () => {
            window.removeEventListener("resize", checkViewport);
        };
    }, []);

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
                    padding: isCompactDesktop ? "16px 20px 32px" : "24px",
                }}
            >
                <div
                    style={{
                        maxWidth: 1180,
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
                padding: isCompactDesktop ? "16px 20px 32px" : "24px",
            }}
        >
            <div
                style={{
                    maxWidth: 1180,
                    margin: "0 auto",
                    display: "grid",
                    gap: isCompactDesktop ? 12 : 18,
                }}
            >
                <section
                    style={{
                        border: `1px solid ${MR_THEME.colors.border}`,
                        borderRadius: MR_THEME.radius.card,
                        background: MR_THEME.colors.cardBg,
                        boxShadow: MR_THEME.shadows.card,
                        padding: isCompactDesktop ? 14 : MR_THEME.layout.cardPadding,
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: isCompactDesktop ? 12 : 16,
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
                                marginBottom: isCompactDesktop ? 5 : 8,
                            }}
                        >
                            Customers
                        </div>

                        <h1
                            style={{
                                ...MR_THEME.typography.pageTitle,
                                fontSize: isCompactDesktop ? 22 : MR_THEME.typography.pageTitle.fontSize,
                                margin: 0,
                                color: MR_THEME.colors.textPrimary,
                            }}
                        >
                            Customer Directory
                        </h1>

                        <p
                            style={{
                                margin: isCompactDesktop ? "6px 0 0" : "8px 0 0",
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
                                marginTop: isCompactDesktop ? 10 : 14,
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                            }}
                        >
                            <span
                                style={{
                                    padding: isCompactDesktop ? "5px 9px" : "6px 10px",
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
                                    padding: isCompactDesktop ? "5px 9px" : "6px 10px",
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

                        {isCompactDesktop && customers.length > 0 ? (
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search customers"
                                style={{
                                    width: "min(520px, 100%)",
                                    height: 38,
                                    marginTop: 12,
                                    padding: "0 12px",
                                    border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                    borderRadius: MR_THEME.radius.control,
                                    background: MR_THEME.colors.cardBgSoft,
                                    color: MR_THEME.colors.textPrimary,
                                    fontSize: 13,
                                    fontWeight: 650,
                                    boxSizing: "border-box",
                                    outline: "none",
                                }}
                            />
                        ) : null}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            justifyContent: "flex-end",
                        }}
                    >
                        {cameFromControlCenter ? (
                            <button
                                type="button"
                                onClick={() => router.push("/control-center")}
                                style={{
                                    padding: isCompactDesktop ? "9px 12px" : "12px 16px",
                                    borderRadius: MR_THEME.radius.control,
                                    border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                    background: MR_THEME.colors.cardBg,
                                    color: MR_THEME.colors.primary,
                                    cursor: "pointer",
                                    fontWeight: 800,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                ← Back to Control Center
                            </button>
                        ) : null}

                        <button
                            type="button"
                            onClick={handleNewCustomer}
                            style={{
                                padding: isCompactDesktop ? "9px 12px" : "12px 16px",
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
                    </div>
                </section>
                {customers.length > 0 && !isCompactDesktop ? (
                    <section
                        style={{
                            border: `1px solid ${MR_THEME.colors.border}`,
                            borderRadius: MR_THEME.radius.card,
                            background: MR_THEME.colors.cardBg,
                            boxShadow: MR_THEME.shadows.card,
                            padding: isCompactDesktop ? 12 : 16,
                        }}
                    >
                        <div style={{ display: "grid", gap: isCompactDesktop ? 4 : 6 }}>
                            <label
                                style={{
                                    fontSize: 11,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.8,
                                    color: MR_THEME.colors.textMuted,
                                    fontWeight: 800,
                                }}
                            >
                                Search
                            </label>

                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Customer name, email, or phone"
                                style={{
                                    width: "100%",
                                    height: isCompactDesktop ? 38 : 44,
                                    padding: isCompactDesktop ? "0 12px" : "0 14px",
                                    border: `1px solid ${MR_THEME.colors.borderStrong}`,
                                    borderRadius: MR_THEME.radius.control,
                                    background: MR_THEME.colors.cardBg,
                                    color: MR_THEME.colors.textPrimary,
                                    fontSize: isCompactDesktop ? 13 : 14,
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>
                    </section>
                ) : null}

                {loading ? (
                    <section
                        style={{
                            padding: isCompactDesktop ? 14 : 18,
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
                            padding: isCompactDesktop ? 18 : 24,
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

                {!loading && customers.length > 0 && filteredCustomers.length === 0 ? (
                    <section
                        style={{
                            border: `1px dashed ${MR_THEME.colors.borderStrong}`,
                            padding: isCompactDesktop ? 18 : 24,
                            borderRadius: MR_THEME.radius.card,
                            background: MR_THEME.colors.cardBg,
                            color: MR_THEME.colors.textSecondary,
                            boxShadow: MR_THEME.shadows.card,
                        }}
                    >
                        No customers match the current search.
                    </section>
                ) : null}

                {!loading && filteredCustomers.length > 0 ? (
                    <section
                        style={{
                            display: "grid",
                            gap: isCompactDesktop ? 10 : 12,
                        }}
                    >
                        {filteredCustomers.map((customer) => (
                            <article
                                key={customer.customer_id}
                                style={{
                                    border: `1px solid ${isCompactDesktop ? MR_THEME.colors.primarySurface : MR_THEME.colors.border}`,
                                    borderRadius: MR_THEME.radius.card,
                                    background: isCompactDesktop
                                        ? "linear-gradient(90deg, #ffffff 0%, #f8fbff 100%)"
                                        : MR_THEME.colors.cardBg,
                                    boxShadow: isCompactDesktop ? MR_THEME.shadows.cardSoft : MR_THEME.shadows.card,
                                    padding: isCompactDesktop ? 12 : 14,
                                    display: "grid",
                                    gridTemplateColumns: "minmax(0, 1fr) auto",
                                    gap: isCompactDesktop ? 12 : 16,
                                    alignItems: "center",
                                    borderLeft: isCompactDesktop
                                        ? `3px solid ${MR_THEME.colors.primarySurface}`
                                        : `1px solid ${MR_THEME.colors.border}`,
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    {isCompactDesktop ? (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                minWidth: 0,
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontWeight: 900,
                                                    fontSize: 16,
                                                    lineHeight: 1.2,
                                                    color: MR_THEME.colors.textPrimary,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    maxWidth: 300,
                                                }}
                                            >
                                                {customer.name}
                                            </div>
                                            <CustomerMeta value={customer.email || "No email"} />
                                            <CustomerMeta value={customer.phone || "No phone"} />
                                        </div>
                                    ) : (
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
                                    )}

                                    {!isCompactDesktop ? (
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
                                    ) : null}
                                </div>

                                <Link
                                    href={`/customers/${customer.customer_id}`}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: isCompactDesktop ? "8px 12px" : "10px 14px",
                                        borderRadius: MR_THEME.radius.control,
                                        border: `1px solid ${isCompactDesktop ? MR_THEME.colors.primarySurface : MR_THEME.colors.borderStrong}`,
                                        background: isCompactDesktop ? MR_THEME.colors.primarySoft : MR_THEME.colors.cardBg,
                                        color: isCompactDesktop ? MR_THEME.colors.primary : MR_THEME.colors.textPrimary,
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

        article {
            padding: 16px !important;
            gap: 12px !important;
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
                padding: "7px 10px",
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

function CustomerMeta({ value }: { value: string }) {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 28,
                padding: "4px 9px",
                borderRadius: MR_THEME.radius.pill,
                border: `1px solid ${MR_THEME.colors.border}`,
                background: MR_THEME.colors.cardBg,
                color: MR_THEME.colors.textSecondary,
                fontSize: 13,
                fontWeight: 750,
                minWidth: 0,
                maxWidth: 280,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
            }}
        >
            {value}
        </span>
    );
}
