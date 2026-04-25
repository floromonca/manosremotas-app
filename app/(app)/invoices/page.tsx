"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { useAuthState } from "../../../hooks/useAuthState";

type Invoice = {
    invoice_id: string;
    invoice_number: string | null;
    customer_name: string | null;
    issue_date: string | null;
    due_date: string | null;
    status: string | null;
    total: number | null;
    balance_due: number | null;
    currency_code: string | null;
};

type QuickFilter = "all" | "drafts" | "unpaid" | "paid";

export default function InvoicesPage() {
    const router = useRouter();
    const { user, authLoading } = useAuthState();
    const { companyId, myRole, isLoadingCompany } = useActiveCompany();

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [page, setPage] = useState(1);
    const [hoveredInvoiceId, setHoveredInvoiceId] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [customerFilter, setCustomerFilter] = useState("all");
    const [quickFilter, setQuickFilter] = useState<QuickFilter>("unpaid");

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
    }, [authLoading, user?.id, isLoadingCompany, myRole, router]);

    const loadInvoices = useCallback(async () => {
        if (!companyId) {
            setInvoices([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMsg("");

        const { data, error } = await supabase
            .from("invoices")
            .select(
                `
                    invoice_id,
                    invoice_number,
                    customer_name,
                    issue_date,
                    due_date,
                    status,
                    total,
                    balance_due,
                    currency_code
                `
            )
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

        if (error) {
            setErrorMsg(error.message);
            setInvoices([]);
        } else {
            setInvoices((data as Invoice[]) ?? []);
        }

        setLoading(false);
    }, [companyId]);

    useEffect(() => {
        if (myRole !== "owner" && myRole !== "admin") return;
        loadInvoices();
    }, [loadInvoices, myRole]);

    useEffect(() => {
        setPage(1);
    }, [search, customerFilter, quickFilter]);

    const customerOptions = useMemo(() => {
        return Array.from(
            new Set(
                invoices
                    .map((inv) => (inv.customer_name || "").trim())
                    .filter(Boolean)
            )
        ).sort((a, b) => a.localeCompare(b));
    }, [invoices]);

    const PAGE_SIZE = 25;


    const filteredInvoices = useMemo(() => {
        return invoices
            .filter((inv) => {
                const q = search.trim().toLowerCase();

                if (q) {
                    const invoiceNumber = (inv.invoice_number || "").toLowerCase();
                    const customerName = (inv.customer_name || "").toLowerCase();
                    const status = normalizeStatus(inv.status);

                    const matches =
                        invoiceNumber.includes(q) ||
                        customerName.includes(q) ||
                        status.includes(q);

                    if (!matches) return false;
                }

                if (
                    customerFilter !== "all" &&
                    (inv.customer_name || "").trim() !== customerFilter
                ) {
                    return false;
                }

                if (quickFilter === "drafts") {
                    return isDraftStatus(inv.status);
                }

                if (quickFilter === "paid") {
                    return isPaidStatus(inv.status);
                }

                if (quickFilter === "unpaid") {
                    return isUnpaidStatus(inv.status);
                }

                return true;
            })
            .sort((a, b) => {
                const aDate = a.due_date || a.issue_date || "";
                const bDate = b.due_date || b.issue_date || "";
                return bDate.localeCompare(aDate);
            });
    }, [invoices, search, customerFilter, quickFilter]);

    const paginatedInvoices = filteredInvoices.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    );

    const draftCount = invoices.filter((inv) => isDraftStatus(inv.status)).length;
    const unpaidCount = invoices.filter((inv) => isUnpaidStatus(inv.status)).length;
    const paidCount = invoices.filter((inv) => isPaidStatus(inv.status)).length;
    const overdueCount = invoices.filter((inv) => isOverdueStatus(inv.status)).length;

    const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));

    const outstandingBalance = invoices.reduce((acc, inv) => {
        return acc + Number(inv.balance_due ?? 0);
    }, 0);

    const activeCurrency =
        filteredInvoices[0]?.currency_code || invoices[0]?.currency_code || "CAD";


    return (
        <div
            style={{
                minHeight: "100%",
                background: "#f8fafc",
                padding: "28px 24px 44px",
            }}
        >
            <div style={{ maxWidth: 1180, margin: "0 auto" }}>
                <div style={{ display: "grid", gap: 18 }}>
                    <section style={heroCardStyle}>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 18,
                                flexWrap: "wrap",
                            }}
                        >
                            <div style={{ minWidth: 280 }}>
                                <div style={eyebrowStyle}>Invoices</div>

                                <div
                                    style={{
                                        fontSize: 30,
                                        lineHeight: 1.1,
                                        fontWeight: 900,
                                        color: "#111827",
                                        marginBottom: 8,
                                    }}
                                >
                                    Invoice Control Center
                                </div>

                                <div
                                    style={{
                                        color: "#4b5563",
                                        fontSize: 14,
                                        lineHeight: 1.7,
                                        maxWidth: 760,
                                    }}
                                >
                                    Review invoice status, outstanding balances, payment progress,
                                    and quick actions for your active company.
                                </div>
                            </div>

                            <button type="button" onClick={loadInvoices} style={secondaryButtonStyle}>
                                Refresh
                            </button>
                        </div>
                    </section>

                    {errorMsg ? (
                        <div
                            style={{
                                padding: 14,
                                borderRadius: 14,
                                border: "1px solid #fecaca",
                                background: "#fff7f7",
                                color: "#b91c1c",
                                fontWeight: 800,
                                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                            }}
                        >
                            Error: {errorMsg}
                        </div>
                    ) : null}

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: 14,
                        }}
                    >
                        <KpiCard label="Overdue" value={String(overdueCount)} tone="danger" />
                        <KpiCard label="Unpaid" value={String(unpaidCount)} tone="info" />
                        <KpiCard label="Draft" value={String(draftCount)} tone="neutral" />
                        <KpiCard label="Paid" value={String(paidCount)} tone="success" />
                        <KpiCard
                            label="Outstanding Balance"
                            value={formatMoney(outstandingBalance, activeCurrency)}
                            tone="accent"
                        />
                    </div>

                    <section style={shellCardStyle}>
                        <div style={{ display: "grid", gap: 16 }}>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 10,
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                }}
                            >
                                <QuickTab
                                    active={quickFilter === "unpaid"}
                                    label="Pending Payment"
                                    onClick={() => setQuickFilter("unpaid")}
                                />
                                <QuickTab
                                    active={quickFilter === "drafts"}
                                    label="Drafts"
                                    onClick={() => setQuickFilter("drafts")}
                                />
                                <QuickTab
                                    active={quickFilter === "paid"}
                                    label="Paid"
                                    onClick={() => setQuickFilter("paid")}
                                />
                                <QuickTab
                                    active={quickFilter === "all"}
                                    label="All"
                                    onClick={() => setQuickFilter("all")}
                                />
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "minmax(260px, 1.3fr) minmax(220px, 0.9fr)",
                                    gap: 12,
                                }}
                            >
                                <div style={{ display: "grid", gap: 6 }}>
                                    <label style={filterLabelStyle}>Search</label>
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Invoice number, customer, status"
                                        style={inputStyle}
                                    />
                                </div>

                                <div style={{ display: "grid", gap: 6 }}>
                                    <label style={filterLabelStyle}>Customer</label>
                                    <select
                                        value={customerFilter}
                                        onChange={(e) => setCustomerFilter(e.target.value)}
                                        style={inputStyle}
                                    >
                                        <option value="all">All customers</option>
                                        {customerOptions.map((name) => (
                                            <option key={name} value={name}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section style={shellCardStyle}>
                        {loading ? (
                            <StateCard message="Loading invoices..." />
                        ) : !companyId ? (
                            <StateCard message="No active company selected." />
                        ) : filteredInvoices.length === 0 ? (
                            <StateCard message="No invoices found for the current filters." />
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table
                                    style={{
                                        width: "100%",
                                        minWidth: 980,
                                        borderCollapse: "separate",
                                        borderSpacing: 0,
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            <TableHeaderCell style={{ borderTopLeftRadius: 14 }}>
                                                Invoice
                                            </TableHeaderCell>
                                            <TableHeaderCell>Customer</TableHeaderCell>
                                            <TableHeaderCell>Date</TableHeaderCell>
                                            <TableHeaderCell>Due</TableHeaderCell>
                                            <TableHeaderCell align="right">Total</TableHeaderCell>
                                            <TableHeaderCell align="right">Balance</TableHeaderCell>
                                            <TableHeaderCell>Status</TableHeaderCell>
                                            <TableHeaderCell
                                                align="right"
                                                style={{ borderTopRightRadius: 14 }}
                                            >
                                                Actions
                                            </TableHeaderCell>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {paginatedInvoices.map((inv, index) => {
                                            const isLast = index === paginatedInvoices.length - 1;

                                            return (
                                                <tr
                                                    key={inv.invoice_id}
                                                    onClick={() => router.push(`/invoices/${inv.invoice_id}`)}
                                                    onMouseEnter={() => setHoveredInvoiceId(inv.invoice_id)}
                                                    onMouseLeave={() => setHoveredInvoiceId(null)}
                                                    style={{
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <TableBodyCell
                                                        isLast={isLast}
                                                        isHovered={hoveredInvoiceId === inv.invoice_id}
                                                    >
                                                        <div
                                                            style={{
                                                                fontSize: 15,
                                                                fontWeight: 900,
                                                                color: "#111827",
                                                                letterSpacing: 0.1,
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            {inv.invoice_number || "—"}
                                                        </div>
                                                    </TableBodyCell>

                                                    <TableBodyCell
                                                        isLast={isLast}
                                                        isHovered={hoveredInvoiceId === inv.invoice_id}
                                                    >
                                                        <div
                                                            style={{
                                                                fontSize: 14,
                                                                fontWeight: 700,
                                                                color: "#111827",
                                                            }}
                                                        >
                                                            {inv.customer_name || "—"}
                                                        </div>
                                                    </TableBodyCell>

                                                    <TableBodyCell isLast={isLast}>
                                                        <div style={tableDateStyle}>
                                                            {formatDate(inv.issue_date)}
                                                        </div>
                                                    </TableBodyCell>

                                                    <TableBodyCell isLast={isLast}>
                                                        <div style={tableDateStyle}>
                                                            {formatDate(inv.due_date)}
                                                        </div>
                                                    </TableBodyCell>

                                                    <TableBodyCell
                                                        isLast={isLast}
                                                        align="right"
                                                        isHovered={hoveredInvoiceId === inv.invoice_id}
                                                    >
                                                        <div style={tableMoneyStyle}>
                                                            {formatMoney(inv.total, inv.currency_code)}
                                                        </div>
                                                    </TableBodyCell>

                                                    <TableBodyCell
                                                        isLast={isLast}
                                                        align="right"
                                                        isHovered={hoveredInvoiceId === inv.invoice_id}
                                                    >
                                                        <div style={tableMoneyStyle}>
                                                            {formatMoney(inv.balance_due, inv.currency_code)}
                                                        </div>
                                                    </TableBodyCell>

                                                    <TableBodyCell isLast={isLast}>
                                                        <StatusBadge status={inv.status} />
                                                    </TableBodyCell>

                                                    <TableBodyCell
                                                        isLast={isLast}
                                                        align="right"
                                                        isHovered={hoveredInvoiceId === inv.invoice_id}
                                                    >
                                                        <div
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                display: "flex",
                                                                justifyContent: "flex-end",
                                                                gap: 8,
                                                                flexWrap: "nowrap",
                                                            }}
                                                        >
                                                            <ActionIconButton
                                                                title="View invoice"
                                                                onClick={() => router.push(`/invoices/${inv.invoice_id}`)}
                                                            >
                                                                View
                                                            </ActionIconButton>

                                                            <ActionIconButton
                                                                title="Open PDF"
                                                                onClick={() =>
                                                                    window.open(
                                                                        `/api/invoices/${inv.invoice_id}/pdf`,
                                                                        "_blank",
                                                                        "noopener,noreferrer"
                                                                    )
                                                                }
                                                            >
                                                                PDF
                                                            </ActionIconButton>
                                                        </div>
                                                    </TableBodyCell>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: 12,
                                        paddingTop: 18,
                                        borderTop: "1px solid #f1f5f9",
                                        marginTop: 14,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: "#6b7280",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Showing{" "}
                                        {filteredInvoices.length === 0
                                            ? 0
                                            : (page - 1) * PAGE_SIZE + 1}
                                        {"–"}
                                        {Math.min(page * PAGE_SIZE, filteredInvoices.length)} of{" "}
                                        {filteredInvoices.length} invoices
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            style={{
                                                height: 38,
                                                padding: "0 14px",
                                                borderRadius: 10,
                                                border: "1px solid #d1d5db",
                                                background: page === 1 ? "#f9fafb" : "#ffffff",
                                                color: page === 1 ? "#9ca3af" : "#111827",
                                                cursor: page === 1 ? "not-allowed" : "pointer",
                                                fontWeight: 700,
                                            }}
                                        >
                                            Previous
                                        </button>

                                        <div
                                            style={{
                                                minWidth: 88,
                                                textAlign: "center",
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: "#374151",
                                            }}
                                        >
                                            Page {page} of {totalPages}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            style={{
                                                height: 38,
                                                padding: "0 14px",
                                                borderRadius: 10,
                                                border: "1px solid #d1d5db",
                                                background: page === totalPages ? "#f9fafb" : "#ffffff",
                                                color: page === totalPages ? "#9ca3af" : "#111827",
                                                cursor: page === totalPages ? "not-allowed" : "pointer",
                                                fontWeight: 700,
                                            }}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

function TableHeaderCell({
    children,
    align = "left",
    style,
}: {
    children: React.ReactNode;
    align?: "left" | "right";
    style?: React.CSSProperties;
}) {
    return (
        <th
            style={{
                background: "#f8fafc",
                borderBottom: "1px solid #e5e7eb",
                padding: "14px 16px",
                textAlign: align,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                color: "#6b7280",
                fontWeight: 800,
                whiteSpace: "nowrap",
                ...style,
            }}
        >
            {children}
        </th>
    );
}

function TableBodyCell({
    children,
    isLast,
    align = "left",
    isHovered = false,
}: {
    children: React.ReactNode;
    isLast?: boolean;
    align?: "left" | "right";
    isHovered?: boolean;
}) {
    return (
        <td
            style={{
                padding: "12px 12px",
                borderBottom: isLast ? "none" : "1px solid #eef2f7",
                textAlign: align,
                verticalAlign: "middle",
                background: isHovered ? "#f9fafb" : "#ffffff",
                transition: "background 0.15s ease",
            }}
        >
            {children}
        </td>
    );
}

function QuickTab({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                height: 38,
                padding: "0 14px",
                borderRadius: 999,
                border: active ? "1px solid #111827" : "1px solid #d1d5db",
                background: active ? "#111827" : "#ffffff",
                color: active ? "#ffffff" : "#111827",
                cursor: "pointer",
                fontWeight: 800,
                boxShadow: active
                    ? "0 1px 2px rgba(0,0,0,0.08)"
                    : "0 1px 2px rgba(0,0,0,0.04)",
            }}
        >
            {label}
        </button>
    );
}

function ActionIconButton({
    children,
    title,
    onClick,
}: {
    children: React.ReactNode;
    title: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            style={{
                height: 34,
                padding: "0 10px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                color: "#111827",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 12,
                whiteSpace: "nowrap",
            }}
        >
            {children}
        </button>
    );
}



function KpiCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: "danger" | "info" | "neutral" | "success" | "accent";
}) {
    const toneStyles = getKpiTone(tone);

    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                background: "#ffffff",
                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                padding: 16,
                display: "grid",
                gap: 8,
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.9,
                    fontWeight: 800,
                    color: toneStyles.labelColor,
                }}
            >
                {label}
            </div>

            <div
                style={{
                    fontSize: 28,
                    lineHeight: 1.1,
                    fontWeight: 900,
                    color: "#111827",
                }}
            >
                {value}
            </div>
        </div>
    );
}

function StateCard({ message }: { message: string }) {
    return (
        <div
            style={{
                padding: 18,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                color: "#6b7280",
                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
            }}
        >
            {message}
        </div>
    );
}

function StatusBadge({ status }: { status: string | null }) {
    const normalized = normalizeStatus(status);

    let bg = "#f3f4f6";
    let color = "#374151";
    let border = "#e5e7eb";
    let label = prettyStatus(status);

    if (normalized === "draft") {
        bg = "#f3f4f6";
        color = "#4b5563";
        border = "#d1d5db";
        label = "Draft";
    } else if (
        normalized === "sent" ||
        normalized === "open" ||
        normalized === "final"
    ) {
        bg = "#dbeafe";
        color = "#1d4ed8";
        border = "#bfdbfe";
        label = normalized === "final" ? "Final" : prettyStatus(status);
    } else if (normalized === "paid") {
        bg = "#dcfce7";
        color = "#166534";
        border = "#bbf7d0";
        label = "Paid";
    } else if (normalized === "partial" || normalized === "partially_paid") {
        bg = "#fef3c7";
        color = "#92400e";
        border = "#fde68a";
        label = "Partial";
    } else if (normalized === "overdue") {
        bg = "#fee2e2";
        color = "#991b1b";
        border = "#fecaca";
        label = "Overdue";
    }

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                height: 28,
                padding: "0 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                background: bg,
                color,
                border: `1px solid ${border}`,
                whiteSpace: "nowrap",
            }}
        >
            {label}
        </span>
    );
}

function normalizeStatus(status: string | null | undefined) {
    return String(status ?? "").trim().toLowerCase();
}

function prettyStatus(status: string | null | undefined) {
    const s = normalizeStatus(status);
    if (s === "partially_paid") return "Partially Paid";
    if (!s) return "Unknown";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function isDraftStatus(status: string | null | undefined) {
    return normalizeStatus(status) === "draft";
}

function isPaidStatus(status: string | null | undefined) {
    return normalizeStatus(status) === "paid";
}

function isOverdueStatus(status: string | null | undefined) {
    return normalizeStatus(status) === "overdue";
}

function isUnpaidStatus(status: string | null | undefined) {
    const s = normalizeStatus(status);
    return s !== "paid" && s !== "draft";
}

function formatDate(value: string | null) {
    if (!value) return "—";

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-CA", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
}

function formatMoney(amount: number | null, currencyCode: string | null) {
    const value = Number(amount || 0);
    const currency = currencyCode || "CAD";

    try {
        return new Intl.NumberFormat("en-CA", {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    } catch {
        return `${currency} ${value.toFixed(2)}`;
    }
}

function getKpiTone(tone: "danger" | "info" | "neutral" | "success" | "accent") {
    if (tone === "danger") return { labelColor: "#b91c1c" };
    if (tone === "info") return { labelColor: "#1d4ed8" };
    if (tone === "success") return { labelColor: "#166534" };
    if (tone === "accent") return { labelColor: "#7c3aed" };
    return { labelColor: "#374151" };
}

const heroCardStyle: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    background: "linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)",
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
    padding: 20,
};

const shellCardStyle: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    background: "#ffffff",
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
    padding: 18,
};

const eyebrowStyle: React.CSSProperties = {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#6b7280",
    fontWeight: 800,
    marginBottom: 8,
};

const filterLabelStyle: React.CSSProperties = {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#6b7280",
    fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    padding: "0 14px",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    background: "#ffffff",
    color: "#111827",
    fontSize: 14,
    boxSizing: "border-box",
};

const tableDateStyle: React.CSSProperties = {
    fontSize: 14,
    color: "#374151",
    fontWeight: 600,
    whiteSpace: "nowrap",
};

const tableMoneyStyle: React.CSSProperties = {
    fontSize: 14,
    color: "#111827",
    fontWeight: 900,
    whiteSpace: "nowrap",
};

const secondaryButtonStyle: React.CSSProperties = {
    height: 42,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 800,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};