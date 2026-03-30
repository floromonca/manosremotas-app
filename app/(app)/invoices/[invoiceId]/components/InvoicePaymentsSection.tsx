"use client";

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

export default function InvoicePaymentsSection({
    payments,
    currencyCode,
    money,
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
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Payments</div>

            {payments.length === 0 ? (
                <div style={{ opacity: 0.7 }}>No payments recorded yet.</div>
            ) : (
                <div style={{ display: "grid", gap: 10 }}>
                    {payments.map((p) => (
                        <div
                            key={p.payment_id}
                            style={{
                                padding: 14,
                                border: "1px solid #eee",
                                borderRadius: 12,
                                background: "#fafafa",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 16,
                            }}
                        >
                            <div style={{ display: "grid", gap: 4 }}>
                                <div style={{ fontWeight: 800, fontSize: 14 }}>
                                    {p.payment_date
                                        ? new Date(p.payment_date + "T00:00:00").toLocaleDateString(undefined, {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })
                                        : "—"}
                                </div>

                                <div style={{ fontSize: 13, color: "#555", textTransform: "capitalize" }}>
                                    {(p.payment_method?.trim() || "payment").toLowerCase()} payment
                                </div>

                                {p.notes ? (
                                    <div style={{ fontSize: 12, color: "#777" }}>{p.notes}</div>
                                ) : null}
                            </div>

                            <div
                                style={{
                                    textAlign: "right",
                                    minWidth: 140,
                                    fontWeight: 900,
                                    fontSize: 16,
                                    fontFamily: "monospace",
                                }}
                            >
                                {money(p.amount, currencyCode)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}