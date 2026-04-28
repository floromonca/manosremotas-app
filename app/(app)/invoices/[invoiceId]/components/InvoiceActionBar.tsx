"use client";

import { MR_THEME } from "@/lib/theme";

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
    const showSendButton = hasInvoice && (isDraft || canResend);
    const showRecordPaymentButton = hasInvoice && canRecordPayment && !isDraft;

    const actionButtonBase: React.CSSProperties = {
        padding: "10px 14px",
        borderRadius: MR_THEME.radius.control,
        color: "#ffffff",
        textDecoration: "none",
        cursor: "pointer",
        fontWeight: 900,
        height: "fit-content",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 42,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        boxShadow: MR_THEME.shadows.cardSoft,
    };

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
                        ...actionButtonBase,
                        border: `1px solid ${MR_THEME.colors.primary}`,
                        background: MR_THEME.colors.primary,
                    }}
                    title="Open invoice HTML preview"
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
                        ...actionButtonBase,
                        border: `1px solid ${MR_THEME.colors.textPrimary}`,
                        background: MR_THEME.colors.textPrimary,
                    }}
                    title="Open invoice PDF"
                >
                    Download PDF
                </a>
            ) : null}

            {showSendButton ? (
                <button
                    onClick={onSendInvoice}
                    disabled={sendingInvoice}
                    title={canResend ? "Resend invoice to customer" : "Send invoice to customer"}
                    style={{
                        ...actionButtonBase,
                        border: `1px solid ${MR_THEME.colors.primary}`,
                        background: MR_THEME.colors.primary,
                        opacity: sendingInvoice ? 0.75 : 1,
                        cursor: sendingInvoice ? "not-allowed" : "pointer",
                    }}
                >
                    {sendingInvoice ? "Sending..." : canResend ? "Resend Invoice" : "Send Invoice"}
                </button>
            ) : null}

            {showRecordPaymentButton ? (
                <button
                    onClick={onRecordPayment}
                    title="Record a customer payment"
                    style={{
                        ...actionButtonBase,
                        border: `1px solid ${MR_THEME.colors.success}`,
                        background: MR_THEME.colors.success,
                    }}
                >
                    Record Payment
                </button>
            ) : null}

            <button
                onClick={onBack}
                style={{
                    padding: "10px 14px",
                    borderRadius: MR_THEME.radius.control,
                    border: `1px solid ${MR_THEME.colors.borderStrong}`,
                    background: MR_THEME.colors.cardBg,
                    color: MR_THEME.colors.textPrimary,
                    cursor: "pointer",
                    fontWeight: 900,
                    height: "fit-content",
                    minHeight: 42,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    boxShadow: MR_THEME.shadows.cardSoft,
                }}
            >
                {fromWorkOrder ? "← Back to Work Order" : "← Back"}
            </button>
        </div>
    );
}