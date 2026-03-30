"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useActiveCompany } from "../../../hooks/useActiveCompany";
import { useRouter } from "next/navigation";

type Invoice = {
    invoice_id: string;
    invoice_number: string;
    customer_name: string | null;
    issue_date: string | null;
    due_date: string | null;
    status: string | null;
    total: number | null;
    balance_due: number | null;
    currency_code: string | null;
};

export default function InvoicesPage() {
    const { companyId } = useActiveCompany();
    const router = useRouter();

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

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
        loadInvoices();
    }, [loadInvoices]);

    return (
        <div style={{ padding: 24, maxWidth: 1200 }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    marginBottom: 20,
                    flexWrap: "wrap",
                }}
            >
                <div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                        Invoices
                    </div>

                    <h1
                        style={{
                            fontSize: 32,
                            fontWeight: 700,
                            margin: "0 0 8px 0",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        Invoices
                    </h1>

                    <div style={{ color: "#6b7280", fontSize: 15 }}>
                        Review and open invoices for your active company.
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        type="button"
                        onClick={loadInvoices}
                        style={secondaryButtonStyle}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {errorMsg ? (
                <div
                    style={{
                        marginBottom: 16,
                        padding: 12,
                        border: "1px solid #f3caca",
                        background: "#fff5f5",
                        borderRadius: 10,
                        color: "#a40000",
                        fontSize: 13,
                    }}
                >
                    <b>Error:</b> {errorMsg}
                </div>
            ) : null}

            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    background: "#fff",
                    overflow: "hidden",
                }}
            >
                {loading ? (
                    <div style={{ padding: 20, color: "#6b7280" }}>Loading invoices...</div>
                ) : !companyId ? (
                    <div style={{ padding: 20, color: "#6b7280" }}>
                        No active company selected.
                    </div>
                ) : invoices.length === 0 ? (
                    <div style={{ padding: 20, color: "#6b7280" }}>No invoices found.</div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: 14,
                                minWidth: 980,
                            }}
                        >
                            <thead>
                                <tr
                                    style={{
                                        textAlign: "left",
                                        borderBottom: "1px solid #e5e7eb",
                                        background: "#fafafa",
                                    }}
                                >
                                    <th style={th}>Invoice</th>
                                    <th style={th}>Customer</th>
                                    <th style={th}>Issue Date</th>
                                    <th style={th}>Due Date</th>
                                    <th style={th}>Status</th>
                                    <th style={th}>Total</th>
                                    <th style={th}>Balance</th>
                                </tr>
                            </thead>

                            <tbody>
                                {invoices.map((inv) => (
                                    <tr
                                        key={inv.invoice_id}
                                        style={{
                                            borderBottom: "1px solid #f1f5f9",
                                            cursor: "pointer",
                                        }}
                                        onClick={() => router.push(`/invoices/${inv.invoice_id}`)}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#fafafa";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "#fff";
                                        }}
                                    >
                                        <td style={tdStrong}>
                                            {inv.invoice_number || "—"}
                                        </td>

                                        <td style={td}>
                                            {inv.customer_name || "—"}
                                        </td>

                                        <td style={td}>
                                            {formatDate(inv.issue_date)}
                                        </td>

                                        <td style={td}>
                                            {formatDate(inv.due_date)}
                                        </td>

                                        <td style={td}>
                                            <StatusBadge status={inv.status} />
                                        </td>

                                        <td style={td}>
                                            {formatMoney(inv.total, inv.currency_code)}
                                        </td>

                                        <td style={td}>
                                            {formatMoney(inv.balance_due, inv.currency_code)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string | null }) {
    const normalized = (status || "").toLowerCase();

    let bg = "#f3f4f6";
    let color = "#374151";
    let label = status || "unknown";

    if (normalized === "draft") {
        bg = "#f3f4f6";
        color = "#374151";
        label = "Draft";
    } else if (normalized === "sent") {
        bg = "#dbeafe";
        color = "#1d4ed8";
        label = "Sent";
    } else if (normalized === "paid") {
        bg = "#dcfce7";
        color = "#166534";
        label = "Paid";
    } else if (normalized === "partial") {
        bg = "#fef3c7";
        color = "#92400e";
        label = "Partial";
    } else if (normalized === "overdue") {
        bg = "#fee2e2";
        color = "#991b1b";
        label = "Overdue";
    } else if (normalized === "final") {
        bg = "#ede9fe";
        color = "#6d28d9";
        label = "Final";
    }

    return (
        <span
            style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: bg,
                color,
                whiteSpace: "nowrap",
            }}
        >
            {label}
        </span>
    );
}

function formatDate(value: string | null) {
    if (!value) return "—";
    return value;
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

const th: React.CSSProperties = {
    padding: "14px 16px",
    fontWeight: 700,
    fontSize: 13,
    color: "#374151",
    whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
    padding: "16px",
    color: "#111827",
    verticalAlign: "middle",
};

const tdStrong: React.CSSProperties = {
    ...td,
    fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600,
};