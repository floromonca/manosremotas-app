"use client";

import { MR_THEME } from "../../../../../lib/theme";

type InvoicePaymentRow = {
    payment_id: string;
    amount: number | null;
    payment_method: string | null;
    payment_date: string | null;
    notes: string | null;
    created_at: string | null;
};

type Props = {
    payments: InvoicePaymentRow[];
    currencyCode?: string | null;
    money: (amount: any, currencyCode?: string | null) => string;
};

function formatPaymentDate(value: string | null) {
    if (!value) return "—";

    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatPaymentMethod(value: string | null) {
    const raw = value?.trim();
    if (!raw) return "Payment";

    return raw
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function InvoicePaymentsSection({
    payments,
    currencyCode,
    money,
}: Props) {
    const sortedPayments = [...payments].sort((a, b) => {
        const aDate = `${a.payment_date ?? ""}T${a.created_at ?? ""}`;
        const bDate = `${b.payment_date ?? ""}T${b.created_at ?? ""}`;
        return bDate.localeCompare(aDate);
    });

    return (
        <section
            style={{
                border: `1px solid ${MR_THEME.colors.border}`,
                borderRadius: MR_THEME.radius.card,
                background: MR_THEME.colors.cardBg,
                boxShadow: MR_THEME.shadows.card,
                padding: MR_THEME.layout.cardPadding,
            }}
        >
            <div style={{ display: "grid", gap: 16 }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ display: "grid", gap: 6 }}>
                        <div
                            style={{
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: 1.1,
                                color: MR_THEME.colors.textMuted,
                                fontWeight: 800,
                            }}
                        >
                            Payments
                        </div>

                        <div
                            style={{
                                fontSize: 22,
                                lineHeight: 1.15,
                                fontWeight: 900,
                                color: MR_THEME.colors.textPrimary,
                            }}
                        >
                            Payment History
                        </div>

                        <div
                            style={{
                                fontSize: 14,
                                color: MR_THEME.colors.textSecondary,
                                lineHeight: 1.6,
                            }}
                        >
                            Review recorded payments applied to this invoice.
                        </div>
                    </div>

                    <div
                        style={{
                            minWidth: 88,
                            height: 36,
                            padding: "0 12px",
                            borderRadius: MR_THEME.radius.pill,
                            background: MR_THEME.colors.cardBgSoft,
                            border: `1px solid ${MR_THEME.colors.border}`,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 800,
                            color: MR_THEME.colors.textSecondary,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {payments.length} {payments.length === 1 ? "payment" : "payments"}
                    </div>
                </div>

                {sortedPayments.length === 0 ? (
                    <div
                        style={{
                            border: `1px dashed ${MR_THEME.colors.borderStrong}`,
                            borderRadius: MR_THEME.radius.control,
                            background: MR_THEME.colors.cardBgSoft,
                            padding: "18px 16px",
                            color: MR_THEME.colors.textSecondary,
                            fontSize: 14,
                            lineHeight: 1.6,
                        }}
                    >
                        No payments recorded yet.
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                        {sortedPayments.map((p) => (
                            <div
                                key={p.payment_id}
                                style={{
                                    padding: 16,
                                    border: `1px solid ${MR_THEME.colors.border}`,
                                    borderRadius: MR_THEME.radius.control,
                                    background: MR_THEME.colors.cardBgSoft,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: 16,
                                    flexWrap: "wrap",
                                }}
                            >
                                <div style={{ display: "grid", gap: 6, minWidth: 220 }}>
                                    <div
                                        style={{
                                            fontWeight: 900,
                                            fontSize: 15,
                                            color: MR_THEME.colors.textPrimary,
                                        }}
                                    >
                                        {formatPaymentDate(p.payment_date)}
                                    </div>

                                    <div
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            width: "fit-content",
                                            padding: "5px 10px",
                                            borderRadius: MR_THEME.radius.pill,
                                            background: MR_THEME.colors.primarySoft,
                                            color: MR_THEME.colors.primaryHover,
                                            fontSize: 12,
                                            fontWeight: 800,
                                        }}
                                    >
                                        {formatPaymentMethod(p.payment_method)}
                                    </div>

                                    {p.notes ? (
                                        <div
                                            style={{
                                                fontSize: 13,
                                                color: MR_THEME.colors.textSecondary,
                                                lineHeight: 1.6,
                                                maxWidth: 720,
                                            }}
                                        >
                                            {p.notes}
                                        </div>
                                    ) : null}
                                </div>

                                <div
                                    style={{
                                        minWidth: 160,
                                        textAlign: "right",
                                        display: "grid",
                                        gap: 6,
                                        justifyItems: "end",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 11,
                                            textTransform: "uppercase",
                                            letterSpacing: 0.8,
                                            color: MR_THEME.colors.textMuted,
                                            fontWeight: 800,
                                        }}
                                    >
                                        Amount
                                    </div>

                                    <div
                                        style={{
                                            fontWeight: 900,
                                            fontSize: 24,
                                            lineHeight: 1.1,
                                            color: MR_THEME.colors.textPrimary,
                                        }}
                                    >
                                        {money(p.amount, currencyCode)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}