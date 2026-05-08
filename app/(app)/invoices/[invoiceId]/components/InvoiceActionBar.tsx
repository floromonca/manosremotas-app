"use client";

import type { CSSProperties } from "react";
import { MR_THEME } from "@/lib/theme";
import { buildInvoicePdfFileName } from "@/lib/invoiceFileNames";

type Props = {
    invoiceId: string;
    invoiceNumber?: string | null;
    customerName?: string | null;
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
    invoiceNumber,
    customerName,
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
    const pdfFileName = buildInvoicePdfFileName({ invoiceNumber, customerName });

    const actionButtonBase: CSSProperties = {
        width: "100%",
        padding: "10px 14px",
        borderRadius: MR_THEME.radius.control,
        color: "#ffffff",
        textDecoration: "none",
        cursor: "pointer",
        fontWeight: 900,
        minHeight: 42,
        lineHeight: 1.2,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        whiteSpace: "nowrap",
        boxShadow: MR_THEME.shadows.cardSoft,
        boxSizing: "border-box",
    };

    const secondaryButtonBase: CSSProperties = {
        ...actionButtonBase,
        border: `1px solid ${MR_THEME.colors.borderStrong}`,
        background: MR_THEME.colors.cardBg,
        color: MR_THEME.colors.textPrimary,
    };

    return (
        <>
            <div className="invoiceActionBar">
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
                        download={pdfFileName}
                        style={{
                            ...actionButtonBase,
                            border: `1px solid ${MR_THEME.colors.textPrimary}`,
                            background: MR_THEME.colors.textPrimary,
                        }}
                        title="Download invoice PDF"
                    >
                        Download PDF
                    </a>
                ) : null}

                {showSendButton ? (
                    <button
                        type="button"
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
                        type="button"
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

                <button type="button" onClick={onBack} style={secondaryButtonBase}>
                    {fromWorkOrder ? "← Back to Work Order" : "← Back"}
                </button>
            </div>

            <style jsx>{`
                .invoiceActionBar {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 10px;
                    align-items: stretch;
                    width: 100%;
                    max-width: 100%;
                    overflow: hidden;
                }

                @media (max-width: 720px) {
                    .invoiceActionBar {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </>
    );
}
