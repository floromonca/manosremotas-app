"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { useAuthState } from "../../../hooks/useAuthState";
import { MR_THEME } from "../../../lib/theme";

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

const INVOICE_ACCESS_ROLES = ["owner", "admin", "office_staff"];
const PAGE_SIZE = 25;

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

    const canAccessInvoices = useMemo(() => {
        return !!myRole && INVOICE_ACCESS_ROLES.includes(myRole);
    }, [myRole]);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.replace("/auth");
            return;
        }

        if (isLoadingCompany) return;

        if (!canAccessInvoices) {
            router.replace("/work-orders");
            return;
        }
    }, [authLoading, user, isLoadingCompany, canAccessInvoices, router]);

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
        if (!canAccessInvoices) return;

        queueMicrotask(() => {
            void loadInvoices();
        });
    }, [loadInvoices, canAccessInvoices]);

    useEffect(() => {
        queueMicrotask(() => {
            setPage(1);
        });
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

                if (quickFilter === "drafts") return isDraftStatus(inv.status);
                if (quickFilter === "paid") return isPaidStatus(inv.status);
                if (quickFilter === "unpaid") return isUnpaidStatus(inv.status);

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
        <main
            style={{
                minHeight: "100%",
                background: MR_THEME.colors.appBg,
                padding: "24px",
            }}
        >
            <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 16 }}>
                <section style={heroCardStyle}>
                    <div className="invoiceHero">
                        <div style={{ minWidth: 0 }}>
                            <div style={eyebrowStyle}>Invoices</div>

                            <h1
                                style={{
                                    ...MR_THEME.typography.pageTitle,
                                    margin: 0,
                                    color: MR_THEME.colors.textPrimary,
                                }}
                            >
                                Invoice Control Center
                            </h1>

                            <p
                                style={{
                                    color: MR_THEME.colors.textSecondary,
                                    fontSize: 14,
                                    lineHeight: 1.6,
                                    maxWidth: 760,
                                    margin: "8px 0 0",
                                }}
                            >
                                Review invoice status, outstanding balances, payment progress,
                                and quick actions for your active company.
                            </p>
                        </div>

                        <button type="button" onClick={loadInvoices} style={secondaryButtonStyle}>
                            Refresh
                        </button>
                    </div>
                </section>

                {errorMsg ? <ErrorCard message={errorMsg} /> : null}

                <section className="kpiGrid">
                    <KpiCard label="Overdue" value={String(overdueCount)} tone="danger" />
                    <KpiCard label="Unpaid" value={String(unpaidCount)} tone="info" />
                    <KpiCard label="Draft" value={String(draftCount)} tone="neutral" />
                    <KpiCard label="Paid" value={String(paidCount)} tone="success" />
                    <KpiCard
                        label="Outstanding"
                        value={formatMoney(outstandingBalance, activeCurrency)}
                        tone="accent"
                    />
                </section>

                <section style={shellCardStyle}>
                    <div style={{ display: "grid", gap: 16 }}>
                        <div className="quickTabs">
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

                        <div className="filterGrid">
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
                        <>
                            <div className="desktopTable">
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
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        <TableBodyCell
                                                            isLast={isLast}
                                                            isHovered={hoveredInvoiceId === inv.invoice_id}
                                                        >
                                                            <div style={tableStrongStyle}>
                                                                {inv.invoice_number || "—"}
                                                            </div>
                                                        </TableBodyCell>

                                                        <TableBodyCell
                                                            isLast={isLast}
                                                            isHovered={hoveredInvoiceId === inv.invoice_id}
                                                        >
                                                            <div style={tableTextStyle}>
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
                                                                }}
                                                            >
                                                                <ActionIconButton
                                                                    title="View invoice"
                                                                    onClick={() =>
                                                                        router.push(`/invoices/${inv.invoice_id}`)
                                                                    }
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
                                </div>
                            </div>

                            <div className="mobileList">
                                {paginatedInvoices.map((inv) => (
                                    <InvoiceMobileCard
                                        key={inv.invoice_id}
                                        invoice={inv}
                                        onOpen={() => router.push(`/invoices/${inv.invoice_id}`)}
                                        onPdf={() =>
                                            window.open(
                                                `/api/invoices/${inv.invoice_id}/pdf`,
                                                "_blank",
                                                "noopener,noreferrer"
                                            )
                                        }
                                    />
                                ))}
                            </div>

                            <PaginationFooter
                                page={page}
                                totalPages={totalPages}
                                filteredCount={filteredInvoices.length}
                                onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                            />
                        </>
                    )}
                </section>
            </div>

            <style jsx>{`
                .invoiceHero {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 18px;
                    flex-wrap: wrap;
                }

                .kpiGrid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
                    gap: 12px;
                }

                .quickTabs {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    align-items: center;
                }

                .filterGrid {
                    display: grid;
                    grid-template-columns: minmax(260px, 1.3fr) minmax(220px, 0.9fr);
                    gap: 12px;
                }

                .mobileList {
                    display: none;
                }

                @media (max-width: 860px) {
                    main {
                        padding: 16px !important;
                    }

                    .invoiceHero {
                        display: grid;
                        grid-template-columns: 1fr;
                    }

                    .filterGrid {
                        grid-template-columns: 1fr;
                    }

                    .quickTabs button {
                        flex: 1 1 calc(50% - 8px);
                    }

                    .desktopTable {
                        display: none;
                    }

                    .mobileList {
                        display: grid;
                        gap: 12px;
                    }

                    button {
                        width: 100%;
                    }
                }
            `}</style>
        </main>
    );
}

function InvoiceMobileCard({
    invoice,
    onOpen,
    onPdf,
}: {
    invoice: Invoice;
    onOpen: () => void;
    onPdf: () => void;
}) {
    return (
        <article
            style={{
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBg,
                padding: 14,
                display: "grid",
                gap: 12,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "flex-start",
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <div style={tableStrongStyle}>{invoice.invoice_number || "—"}</div>
                    <div
                        style={{
                            marginTop: 4,
                            color: MR_THEME.colors.textSecondary,
                            fontSize: 13,
                            fontWeight: 700,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {invoice.customer_name || "—"}
                    </div>
                </div>

                <StatusBadge status={invoice.status} />
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                }}
            >
                <MiniInfo label="Issue" value={formatDate(invoice.issue_date)} />
                <MiniInfo label="Due" value={formatDate(invoice.due_date)} />
                <MiniInfo label="Total" value={formatMoney(invoice.total, invoice.currency_code)} />
                <MiniInfo
                    label="Balance"
                    value={formatMoney(invoice.balance_due, invoice.currency_code)}
                />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <ActionIconButton title="View invoice" onClick={onOpen}>
                    View
                </ActionIconButton>
                <ActionIconButton title="Open PDF" onClick={onPdf}>
                    PDF
                </ActionIconButton>
            </div>
        </article>
    );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                padding: "8px 10px",
                borderRadius: MR_THEME.radius.control,
                background: MR_THEME.colors.cardBgSoft,
                border: `1px solid ${MR_THEME.colors.border}`,
                minWidth: 0,
            }}
        >
            <div style={filterLabelStyle}>{label}</div>
            <div
                style={{
                    marginTop: 4,
                    color: MR_THEME.colors.textPrimary,
                    fontSize: 13,
                    fontWeight: 800,
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

function PaginationFooter({
    page,
    totalPages,
    filteredCount,
    onPrevious,
    onNext,
}: {
    page: number;
    totalPages: number;
    filteredCount: number;
    onPrevious: () => void;
    onNext: () => void;
}) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                paddingTop: 18,
                borderTop: `1px solid ${MR_THEME.colors.border}`,
                marginTop: 14,
                flexWrap: "wrap",
            }}
        >
            <div
                style={{
                    fontSize: 13,
                    color: MR_THEME.colors.textSecondary,
                    fontWeight: 700,
                }}
            >
                Showing {filteredCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filteredCount)} of {filteredCount} invoices
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                    type="button"
                    onClick={onPrevious}
                    disabled={page === 1}
                    style={paginationButtonStyle(page === 1)}
                >
                    Previous
                </button>

                <div
                    style={{
                        minWidth: 88,
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: 800,
                        color: MR_THEME.colors.textSecondary,
                    }}
                >
                    Page {page} of {totalPages}
                </div>

                <button
                    type="button"
                    onClick={onNext}
                    disabled={page === totalPages}
                    style={paginationButtonStyle(page === totalPages)}
                >
                    Next
                </button>
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
                background: MR_THEME.colors.cardBgSoft,
                borderBottom: `1px solid ${MR_THEME.colors.border}`,
                padding: "14px 16px",
                textAlign: align,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                color: MR_THEME.colors.textMuted,
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
                padding: "12px",
                borderBottom: isLast ? "none" : `1px solid ${MR_THEME.colors.border}`,
                textAlign: align,
                verticalAlign: "middle",
                background: isHovered ? MR_THEME.colors.cardBgSoft : MR_THEME.colors.cardBg,
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
                border: active
                    ? `1px solid ${MR_THEME.colors.primary}`
                    : `1px solid ${MR_THEME.colors.borderStrong}`,
                background: active ? MR_THEME.colors.primary : MR_THEME.colors.cardBg,
                color: active ? "#ffffff" : MR_THEME.colors.textPrimary,
                cursor: "pointer",
                fontWeight: 800,
                boxShadow: active ? MR_THEME.shadows.cardSoft : "none",
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
                borderRadius: MR_THEME.radius.control,
                border: `1px solid ${MR_THEME.colors.borderStrong}`,
                background: MR_THEME.colors.cardBg,
                color: MR_THEME.colors.textPrimary,
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
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBg,
                boxShadow: MR_THEME.shadows.card,
                padding: 14,
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
                    fontSize: 24,
                    lineHeight: 1.1,
                    fontWeight: 900,
                    color: MR_THEME.colors.textPrimary,
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
                borderRadius: MR_THEME.radius.card,
                border: `1px solid ${MR_THEME.colors.border}`,
                background: MR_THEME.colors.cardBg,
                color: MR_THEME.colors.textSecondary,
                boxShadow: MR_THEME.shadows.card,
            }}
        >
            {message}
        </div>
    );
}

function ErrorCard({ message }: { message: string }) {
    return (
        <div
            style={{
                padding: 14,
                borderRadius: MR_THEME.radius.card,
                border: `1px solid ${MR_THEME.colors.danger}`,
                background: "#fff7f7",
                color: MR_THEME.colors.danger,
                fontWeight: 800,
                boxShadow: MR_THEME.shadows.card,
            }}
        >
            Error: {message}
        </div>
    );
}

function StatusBadge({ status }: { status: string | null }) {
    const normalized = normalizeStatus(status);

    let bg: string = MR_THEME.colors.cardBgSoft;
    let color: string = MR_THEME.colors.textSecondary;
    let border: string = MR_THEME.colors.border;
    let label = prettyStatus(status);

    if (normalized === "draft") {
        label = "Draft";
    } else if (normalized === "sent" || normalized === "open" || normalized === "final") {
        bg = MR_THEME.colors.primarySoft;
        color = MR_THEME.colors.primary;
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

function getKpiTone(
    tone: "danger" | "info" | "neutral" | "success" | "accent"
): { labelColor: string } {
    if (tone === "danger") return { labelColor: MR_THEME.colors.danger };
    if (tone === "info") return { labelColor: MR_THEME.colors.info };
    if (tone === "success") return { labelColor: MR_THEME.colors.success };
    if (tone === "accent") return { labelColor: MR_THEME.colors.primary };

    return { labelColor: MR_THEME.colors.textSecondary };
}

function paginationButtonStyle(disabled: boolean): React.CSSProperties {
    return {
        height: 38,
        padding: "0 14px",
        borderRadius: MR_THEME.radius.control,
        border: `1px solid ${MR_THEME.colors.borderStrong}`,
        background: disabled ? MR_THEME.colors.cardBgSoft : MR_THEME.colors.cardBg,
        color: disabled ? MR_THEME.colors.textMuted : MR_THEME.colors.textPrimary,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 800,
    };
}

const heroCardStyle: React.CSSProperties = {
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: MR_THEME.radius.card,
    background: MR_THEME.colors.cardBg,
    boxShadow: MR_THEME.shadows.card,
    padding: MR_THEME.layout.cardPadding,
};

const shellCardStyle: React.CSSProperties = {
    border: `1px solid ${MR_THEME.colors.border}`,
    borderRadius: MR_THEME.radius.card,
    background: MR_THEME.colors.cardBg,
    boxShadow: MR_THEME.shadows.card,
    padding: 16,
};

const eyebrowStyle: React.CSSProperties = {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: MR_THEME.colors.primary,
    fontWeight: 800,
    marginBottom: 8,
};

const filterLabelStyle: React.CSSProperties = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: MR_THEME.colors.textMuted,
    fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    padding: "0 14px",
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    borderRadius: MR_THEME.radius.control,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    fontSize: 14,
    boxSizing: "border-box",
};

const tableStrongStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 900,
    color: MR_THEME.colors.textPrimary,
    letterSpacing: 0.1,
    whiteSpace: "nowrap",
};

const tableTextStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: MR_THEME.colors.textPrimary,
};

const tableDateStyle: React.CSSProperties = {
    fontSize: 14,
    color: MR_THEME.colors.textSecondary,
    fontWeight: 700,
    whiteSpace: "nowrap",
};

const tableMoneyStyle: React.CSSProperties = {
    fontSize: 14,
    color: MR_THEME.colors.textPrimary,
    fontWeight: 900,
    whiteSpace: "nowrap",
};

const secondaryButtonStyle: React.CSSProperties = {
    height: 42,
    padding: "0 14px",
    borderRadius: MR_THEME.radius.control,
    border: `1px solid ${MR_THEME.colors.borderStrong}`,
    background: MR_THEME.colors.cardBg,
    color: MR_THEME.colors.textPrimary,
    cursor: "pointer",
    fontWeight: 800,
    boxShadow: MR_THEME.shadows.cardSoft,
};