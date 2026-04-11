"use client";

import React from "react";

type InvoiceRow = {
    invoice_id: string;
    invoice_number: string | null;
    status: string | null;
    customer_name: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;
    billing_address?: string | null;
    invoice_date?: string | null;
    due_date?: string | null;
    currency_code: string | null;
    subtotal: number | null;
    tax_total: number | null;
    total: number | null;
    balance_due: number | null;
    deposit_required?: number | null;
    created_at: string | null;
    company_id?: string | null;
};

type Totals = {
    subtotal: number;
    tax: number;
    total: number;
    balance: number;
};

type Props = {
    inv: InvoiceRow;
    billingEmail: string;
    savingBillingEmail: boolean;
    isDraft: boolean;
    totals: Totals;
    depositRequired: number;
    paymentsTotal: number;
    onChangeBillingEmail: (value: string) => void;
    onSaveBillingEmail: () => void;
    money: (amount: any, currencyCode?: string | null) => string;
    prettyStatus: (status: string | null | undefined) => string;
    statusBadgeStyle: (status: string | null | undefined) => React.CSSProperties;
};

export default function InvoiceDetailsCard({
    inv,
    billingEmail,
    savingBillingEmail,
    isDraft,
    totals,
    depositRequired,
    paymentsTotal,
    onChangeBillingEmail,
    onSaveBillingEmail,
    money,
    prettyStatus,
    statusBadgeStyle,
}: Props) {
    const totalAmount = Number(inv.total ?? totals.total ?? 0);
    const balanceAmount = Number(inv.balance_due ?? totals.balance ?? 0);
    const subtotalAmount = Number(inv.subtotal ?? totals.subtotal ?? 0);
    const taxAmount = Number(inv.tax_total ?? totals.tax ?? 0);

    const progressPercent =
        totalAmount > 0
            ? Math.min(100, Math.round((paymentsTotal / Math.max(totalAmount, 1)) * 100))
            : 0;

    return (
        <section
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 20,
                background: "#ffffff",
                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                padding: 20,
            }}
        >
            <div style={{ display: "grid", gap: 18 }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ display: "grid", gap: 8 }}>
                        <div
                            style={{
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: 1.1,
                                color: "#6b7280",
                                fontWeight: 800,
                            }}
                        >
                            Billing & Totals
                        </div>

                        <div
                            style={{
                                fontSize: 24,
                                lineHeight: 1.15,
                                fontWeight: 900,
                                color: "#111827",
                            }}
                        >
                            Invoice Summary
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                alignItems: "center",
                                color: "#4b5563",
                                fontSize: 14,
                                lineHeight: 1.6,
                            }}
                        >
                            <span>
                                <b style={{ color: "#111827" }}>Customer:</b> {inv.customer_name ?? "—"}
                            </span>
                            <span>
                                • <b style={{ color: "#111827" }}>Currency:</b> {inv.currency_code ?? "—"}
                            </span>
                            {inv.customer_phone ? (
                                <span>
                                    • <b style={{ color: "#111827" }}>Tel:</b> {inv.customer_phone}
                                </span>
                            ) : null}
                        </div>

                        {inv.billing_address ? (
                            <div
                                style={{
                                    color: "#6b7280",
                                    fontSize: 13,
                                    lineHeight: 1.6,
                                    maxWidth: 760,
                                }}
                            >
                                <b style={{ color: "#111827" }}>Billing address:</b> {inv.billing_address}
                            </div>
                        ) : null}
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                        <span
                            style={{
                                padding: "7px 12px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 900,
                                letterSpacing: 0.3,
                                whiteSpace: "nowrap",
                                ...statusBadgeStyle(inv.status),
                            }}
                        >
                            {prettyStatus(inv.status)}
                        </span>
                    </div>
                </div>

                {!isDraft ? (
                    <div
                        style={{
                            padding: "12px 14px",
                            borderRadius: 14,
                            background: "#fff7e6",
                            border: "1px solid #fde3a7",
                            fontWeight: 700,
                            fontSize: 14,
                            color: "#7c4a03",
                        }}
                    >
                        This invoice is in <b>{prettyStatus(inv.status)}</b> status and is currently read-only.
                    </div>
                ) : null}

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 14,
                    }}
                >
                    <div
                        style={{
                            background: "#f8fafc",
                            border: "1px solid #e5e7eb",
                            borderRadius: 14,
                            padding: 16,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                textTransform: "uppercase",
                                letterSpacing: 0.8,
                                color: "#6b7280",
                                fontWeight: 800,
                                marginBottom: 8,
                            }}
                        >
                            Total
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: "#111827", lineHeight: 1.1 }}>
                            {money(totalAmount, inv.currency_code)}
                        </div>
                    </div>

                    <div
                        style={{
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: 14,
                            padding: 16,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                textTransform: "uppercase",
                                letterSpacing: 0.8,
                                color: "#166534",
                                fontWeight: 800,
                                marginBottom: 8,
                            }}
                        >
                            Paid
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: "#111827", lineHeight: 1.1 }}>
                            {money(paymentsTotal, inv.currency_code)}
                        </div>
                    </div>

                    <div
                        style={{
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            borderRadius: 14,
                            padding: 16,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                textTransform: "uppercase",
                                letterSpacing: 0.8,
                                color: "#9a3412",
                                fontWeight: 800,
                                marginBottom: 8,
                            }}
                        >
                            Balance
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: "#111827", lineHeight: 1.1 }}>
                            {money(balanceAmount, inv.currency_code)}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(280px, 1.25fr) minmax(260px, 0.95fr)",
                        gap: 16,
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gap: 10,
                            padding: 16,
                            borderRadius: 16,
                            border: "1px solid #e5e7eb",
                            background: "#fcfcfd",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: 1,
                                color: "#6b7280",
                                fontWeight: 800,
                            }}
                        >
                            Billing Email
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                                alignItems: "center",
                            }}
                        >
                            <input
                                type="email"
                                value={billingEmail}
                                onChange={(e) => onChangeBillingEmail(e.target.value)}
                                placeholder="customer@example.com"
                                style={{
                                    padding: "12px 14px",
                                    borderRadius: 12,
                                    border: "1px solid #d1d5db",
                                    minWidth: 280,
                                    flex: "1 1 320px",
                                    background: "#ffffff",
                                    fontSize: 14,
                                    color: "#111827",
                                    boxSizing: "border-box",
                                }}
                            />

                            <button
                                type="button"
                                onClick={onSaveBillingEmail}
                                disabled={savingBillingEmail || !inv?.invoice_id}
                                style={{
                                    height: 44,
                                    padding: "0 16px",
                                    borderRadius: 12,
                                    border: "1px solid #111827",
                                    background: "#111827",
                                    color: "#ffffff",
                                    cursor: savingBillingEmail ? "not-allowed" : "pointer",
                                    fontWeight: 800,
                                    opacity: savingBillingEmail ? 0.7 : 1,
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                                }}
                            >
                                {savingBillingEmail ? "Saving..." : "Save Billing Email"}
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gap: 10,
                            padding: 16,
                            borderRadius: 16,
                            border: "1px solid #e5e7eb",
                            background: "#ffffff",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: 1,
                                color: "#6b7280",
                                fontWeight: 800,
                            }}
                        >
                            Financial Breakdown
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gap: 10,
                                fontSize: 14,
                                color: "#374151",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <span>Subtotal</span>
                                <strong style={{ color: "#111827" }}>
                                    {money(subtotalAmount, inv.currency_code)}
                                </strong>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <span>Tax</span>
                                <strong style={{ color: "#111827" }}>
                                    {money(taxAmount, inv.currency_code)}
                                </strong>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <span>Total</span>
                                <strong style={{ color: "#111827" }}>
                                    {money(totalAmount, inv.currency_code)}
                                </strong>
                            </div>

                            {depositRequired > 0 ? (
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                    <span>Deposit Required</span>
                                    <strong style={{ color: "#111827" }}>
                                        {money(depositRequired, inv.currency_code)}
                                    </strong>
                                </div>
                            ) : null}

                            {paymentsTotal > 0 ? (
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                    <span>Payments Received</span>
                                    <strong style={{ color: "#111827" }}>
                                        {money(paymentsTotal, inv.currency_code)}
                                    </strong>
                                </div>
                            ) : null}

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    paddingTop: 10,
                                    borderTop: "1px solid #e5e7eb",
                                    fontSize: 15,
                                }}
                            >
                                <span style={{ fontWeight: 800, color: "#111827" }}>Balance Due</span>
                                <strong style={{ color: "#111827", fontSize: 16 }}>
                                    {money(balanceAmount, inv.currency_code)}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>

                {totalAmount > 0 ? (
                    <div
                        style={{
                            display: "grid",
                            gap: 8,
                            padding: 16,
                            borderRadius: 16,
                            border: "1px solid #e5e7eb",
                            background: "#ffffff",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 12,
                                flexWrap: "wrap",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 12,
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                    color: "#6b7280",
                                    fontWeight: 800,
                                }}
                            >
                                Payment Progress
                            </div>

                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: "#374151",
                                }}
                            >
                                {progressPercent}%
                            </div>
                        </div>

                        <div
                            style={{
                                width: "100%",
                                height: 10,
                                background: "#e5e7eb",
                                borderRadius: 999,
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    height: "100%",
                                    width: `${progressPercent}%`,
                                    background: balanceAmount <= 0 ? "#10b981" : "#2563eb",
                                    transition: "width 0.25s ease",
                                }}
                            />
                        </div>
                    </div>
                ) : null}
            </div>
        </section>
    );
}