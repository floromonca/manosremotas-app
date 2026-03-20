"use client";

type Props = {
    invoiceId: string;
    fromWorkOrder: string | null;
    hasInvoice: boolean;
    isDraft: boolean;
    canResend: boolean;
    sendingInvoice: boolean;
    canRecordPayment: boolean;
    onSendInvoice: () => void;
    onRecordPayment: () => void;
    onBack: () => void;
};

export default function InvoiceActionBar({
    invoiceId,
    fromWorkOrder,
    hasInvoice,
    isDraft,
    canResend,
    sendingInvoice,
    canRecordPayment,
    onSendInvoice,
    onRecordPayment,
    onBack,
}: Props) {
    return (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {hasInvoice ? (
                <a
                    href={
                        fromWorkOrder
                            ? `/api/invoices/${invoiceId}/html?mode=preview&fromWorkOrder=${encodeURIComponent(fromWorkOrder)}`
                            : `/api/invoices/${invoiceId}/html?mode=preview`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #2563eb",
                        background: "#2563eb",
                        color: "white",
                        textDecoration: "none",
                        cursor: "pointer",
                        fontWeight: 900,
                        height: "fit-content",
                        display: "inline-flex",
                        alignItems: "center",
                    }}
                    title="Abrir vista HTML de la factura"
                >
                    View HTML
                </a>
            ) : null}

            {hasInvoice ? (
                <a
                    href={`/api/invoices/${invoiceId}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #0f172a",
                        background: "#0f172a",
                        color: "white",
                        textDecoration: "none",
                        cursor: "pointer",
                        fontWeight: 900,
                        height: "fit-content",
                        display: "inline-flex",
                        alignItems: "center",
                    }}
                    title="Abrir PDF de la factura"
                >
                    Download PDF
                </a>
            ) : null}

            <button
                onClick={onSendInvoice}
                disabled={!hasInvoice || (!isDraft && !canResend) || sendingInvoice}
                title={
                    !hasInvoice
                        ? "Invoice no disponible"
                        : !isDraft && !canResend
                            ? "Esta factura no se puede enviar"
                            : canResend
                                ? "Resend invoice"
                                : "Send invoice"
                }
                style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #7c3aed",
                    background: !hasInvoice || (!isDraft && !canResend) ? "#c4b5fd" : "#7c3aed",
                    color: "white",
                    cursor: !hasInvoice || (!isDraft && !canResend) || sendingInvoice ? "not-allowed" : "pointer",
                    fontWeight: 900,
                    opacity: !hasInvoice || (!isDraft && !canResend) || sendingInvoice ? 0.85 : 1,
                }}
            >
                {sendingInvoice ? "Sending..." : canResend ? "Resend Invoice" : "Send Invoice"}
            </button>

            {canRecordPayment ? (
                <button
                    onClick={onRecordPayment}
                    title="Record a payment"
                    style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #16a34a",
                        background: "#16a34a",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 900,
                        height: "fit-content",
                    }}
                >
                    Record Payment
                </button>
            ) : null}

            <button
                onClick={onBack}
                style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "white",
                    cursor: "pointer",
                    fontWeight: 800,
                    height: "fit-content",
                }}
            >
                {fromWorkOrder ? "← Back to Work Order" : "← Back"}
            </button>
        </div>
    );
}