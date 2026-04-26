import React from "react";
import { MR_THEME } from "../../../../lib/theme";

type WorkOrderHeaderProps = {
    workOrderId: string;
    title: string;
    myRole: string | null;
    invoiceId: string | null | undefined;
    invoiceStatus: string | null;
    isAdmin: boolean;
    syncingInvoice: boolean;
    anyPendingPricing: boolean;
    hasInvoice: boolean;
    invoiceIsDraft: boolean;
    prettyInvoiceStatus: (status: string | null | undefined) => string;
    invoiceBadgeStyle: (status: string | null | undefined) => React.CSSProperties;
    onOpenInvoice: () => void;
    onSyncInvoice: () => void;
    onBack: () => void;
    showForm: boolean;
    onToggleForm: () => void;
};

export default function WorkOrderDetailHeader({
    workOrderId,
    title,
    myRole,
    invoiceId,
    invoiceStatus,
    isAdmin,
    syncingInvoice,
    anyPendingPricing,
    hasInvoice,
    invoiceIsDraft,
    prettyInvoiceStatus,
    invoiceBadgeStyle,
    onOpenInvoice,
    onSyncInvoice,
    onBack,
}: WorkOrderHeaderProps) {
    return (
        <div
            style={{
                display: "grid",
                gap: 8,
                marginBottom: 12,
            }}
        >
            <div
                style={{
                    padding: "14px 14px 12px",
                    borderRadius: MR_THEME.radius.card,
                    border: `1px solid ${MR_THEME.colors.border}`,
                    background: MR_THEME.colors.cardBg,
                    boxShadow: MR_THEME.shadows.card,
                }}
            >
                <div style={{ marginBottom: 6 }}>
                    <button
                        onClick={onBack}
                        style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: MR_THEME.colors.textSecondary,
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                        }}
                    >
                        ← Back
                    </button>
                </div>
                <div
                    style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                        color: "#6b7280",
                        fontWeight: 900,
                        marginBottom: 8,
                    }}
                >
                    Work Order
                </div>

                <div
                    style={{
                        fontSize: 24,
                        lineHeight: 1.15,
                        fontWeight: 900,
                        color: "#111827",
                        marginBottom: 10,
                        wordBreak: "break-word",
                    }}
                >
                    {title || "Work Order"}
                </div>

                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: isAdmin ? 10 : 0,
                    }}
                >
                    <span
                        style={{
                            padding: "5px 10px",
                            borderRadius: 999,
                            background: "#f9fafb",
                            border: "1px solid #e5e7eb",
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#374151",
                        }}
                    >
                        Ref: <span style={{ fontFamily: "monospace" }}>{workOrderId.slice(0, 8)}</span>
                    </span>

                    <span
                        style={{
                            padding: "5px 10px",
                            borderRadius: 999,
                            background: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#111827",
                        }}
                    >
                        Role: {myRole ?? "—"}
                    </span>

                    {invoiceId ? (
                        <span
                            style={{
                                padding: "5px 10px",
                                borderRadius: 999,
                                background: "#f9fafb",
                                border: "1px solid #e5e7eb",
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#374151",
                            }}
                        >
                            Invoice:{" "}
                            <span style={{ fontFamily: "monospace" }}>
                                {String(invoiceId).slice(0, 8)}
                            </span>
                        </span>
                    ) : null}

                    {invoiceId && invoiceStatus ? (
                        <span
                            style={{
                                display: "inline-block",
                                padding: "5px 10px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 900,
                                letterSpacing: 0.3,
                                ...invoiceBadgeStyle(invoiceStatus),
                            }}
                        >
                            {prettyInvoiceStatus(invoiceStatus)}
                        </span>
                    ) : null}
                </div>

                {isAdmin ? (
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            paddingTop: 10,
                            borderTop: "1px solid #f3f4f6",
                        }}
                    >
                        {invoiceId ? (
                            <button
                                type="button"
                                onClick={onOpenInvoice}
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: 10,
                                    border: "1px solid #d1d5db",
                                    background: "white",
                                    cursor: "pointer",
                                    fontWeight: 800,
                                    fontSize: 12,
                                    color: "#111827",
                                }}
                            >
                                Open Invoice
                            </button>
                        ) : null}

                        <button
                            type="button"
                            onClick={onSyncInvoice}
                            disabled={syncingInvoice || anyPendingPricing || (hasInvoice && !invoiceIsDraft)}
                            title={
                                anyPendingPricing
                                    ? "Aprueba los Pending pricing primero"
                                    : hasInvoice && !invoiceIsDraft
                                        ? `La invoice está en ${prettyInvoiceStatus(invoiceStatus)} y ya no permite Sync`
                                        : "Sincroniza items priced hacia la invoice"
                            }
                            style={{
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "1px solid #111827",
                                background: hasInvoice && !invoiceIsDraft ? "#9ca3af" : "#111827",
                                color: "white",
                                cursor:
                                    syncingInvoice || anyPendingPricing || (hasInvoice && !invoiceIsDraft)
                                        ? "not-allowed"
                                        : "pointer",
                                fontWeight: 900,
                                fontSize: 12,
                                opacity:
                                    syncingInvoice || anyPendingPricing || (hasInvoice && !invoiceIsDraft)
                                        ? 0.65
                                        : 1,
                            }}
                        >
                            {syncingInvoice ? "Syncing..." : "Sync Invoice"}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}