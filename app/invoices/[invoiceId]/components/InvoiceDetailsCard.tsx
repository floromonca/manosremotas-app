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
    return (
        <div
            style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 12,
                border: "1px solid #eee",
                background: "white",
            }}
        >
            <div style={{ display: "grid", gap: 8 }}>
                <div>
                    <b>Invoice #:</b> {inv.invoice_number ?? "—"}
                </div>

                {inv.invoice_date ? (
                    <div>
                        <b>Invoice Date:</b> {inv.invoice_date}
                    </div>
                ) : null}

                {inv.due_date ? (
                    <div>
                        <b>Due Date:</b> {inv.due_date}
                    </div>
                ) : null}

                <div>
                    <b>Customer:</b> {inv.customer_name ?? "—"}
                </div>

                {inv.customer_phone ? (
                    <div>
                        <b>Tel:</b> {inv.customer_phone}
                    </div>
                ) : null}

                <div style={{ display: "grid", gap: 6 }}>
                    <b>Billing Email:</b>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input
                            type="email"
                            value={billingEmail}
                            onChange={(e) => onChangeBillingEmail(e.target.value)}
                            placeholder="customer@example.com"
                            style={{
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: "1px solid #ddd",
                                minWidth: 280,
                                flex: "1 1 320px",
                            }}
                        />

                        <button
                            type="button"
                            onClick={onSaveBillingEmail}
                            disabled={savingBillingEmail || !inv?.invoice_id}
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid #111",
                                background: "#111",
                                color: "white",
                                cursor: savingBillingEmail ? "not-allowed" : "pointer",
                                fontWeight: 800,
                                opacity: savingBillingEmail ? 0.7 : 1,
                            }}
                        >
                            {savingBillingEmail ? "Saving..." : "Save Billing Email"}
                        </button>
                    </div>
                </div>

                {inv.billing_address ? (
                    <div>
                        <b>Address:</b> {inv.billing_address}
                    </div>
                ) : null}

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <b>Status:</b>
                    <span
                        style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 900,
                            letterSpacing: 0.3,
                            ...statusBadgeStyle(inv.status),
                        }}
                    >
                        {prettyStatus(inv.status)}
                    </span>
                </div>

                <div>
                    <b>Currency:</b> {inv.currency_code ?? "—"}
                </div>

                {!isDraft ? (
                    <div
                        style={{
                            marginTop: 10,
                            padding: 10,
                            borderRadius: 10,
                            background: "#fff7e6",
                            border: "1px solid #ffe1a8",
                            fontWeight: 700,
                        }}
                    >
                        This invoice is in <b>{prettyStatus(inv.status)}</b> status. It is currently read-only.
                    </div>
                ) : null}

                <hr style={{ margin: "10px 0", border: "none", borderTop: "1px solid #eee" }} />

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 12,
                        marginBottom: 14,
                    }}
                >
                    <div
                        style={{
                            background: "#f8fafc",
                            border: "1px solid #eee",
                            borderRadius: 10,
                            padding: 12,
                        }}
                    >
                        <div style={{ fontSize: 11, opacity: 0.7 }}>TOTAL</div>
                        <div style={{ fontSize: 18, fontWeight: 900 }}>
                            {money(inv.total ?? totals.total, inv.currency_code)}
                        </div>
                    </div>

                    <div
                        style={{
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: 10,
                            padding: 12,
                        }}
                    >
                        <div style={{ fontSize: 11, opacity: 0.7 }}>PAID</div>
                        <div style={{ fontSize: 18, fontWeight: 900 }}>
                            {money(paymentsTotal, inv.currency_code)}
                        </div>
                    </div>

                    <div
                        style={{
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            borderRadius: 10,
                            padding: 12,
                        }}
                    >
                        <div style={{ fontSize: 11, opacity: 0.7 }}>BALANCE</div>
                        <div style={{ fontSize: 18, fontWeight: 900 }}>
                            {money(inv.balance_due ?? totals.balance, inv.currency_code)}
                        </div>
                    </div>
                </div>

                <div>
                    <b>Subtotal:</b> {money(inv.subtotal ?? totals.subtotal, inv.currency_code)}
                </div>

                <div>
                    <b>Tax:</b> {money(inv.tax_total ?? totals.tax, inv.currency_code)}
                </div>

                <div>
                    <b>Total:</b> {money(inv.total ?? totals.total, inv.currency_code)}
                </div>

                {depositRequired > 0 ? (
                    <div>
                        <b>Deposit Required:</b> {money(depositRequired, inv.currency_code)}
                    </div>
                ) : null}

                {paymentsTotal > 0 ? (
                    <div>
                        <b>Payments Received:</b> {money(paymentsTotal, inv.currency_code)}
                    </div>
                ) : null}

                <div>
                    <b>Balance Due:</b> {money(inv.balance_due ?? totals.balance, inv.currency_code)}
                </div>

                {(inv.total ?? totals.total) > 0 ? (
                    <div style={{ marginTop: 14 }}>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 6,
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#555",
                            }}
                        >
                            <span>Payment Progress</span>
                            <span>
                                {Math.min(
                                    100,
                                    Math.round(
                                        (paymentsTotal / Math.max(Number(inv.total ?? totals.total), 1)) * 100
                                    )
                                )}
                                %
                            </span>
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
                                    width: `${Math.min(
                                        100,
                                        (paymentsTotal / Math.max(Number(inv.total ?? totals.total), 1)) * 100
                                    )}%`,
                                    background:
                                        (inv.balance_due ?? totals.balance) <= 0 ? "#10b981" : "#2563eb",
                                    transition: "width 0.25s ease",
                                }}
                            />
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}