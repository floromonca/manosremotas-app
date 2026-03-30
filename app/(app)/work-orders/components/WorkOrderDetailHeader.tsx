import React from "react";

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
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                gap: 16,
                marginBottom: 10,
                flexWrap: "wrap",
            }}
        >
            <div style={{ flex: 1, minWidth: 280 }}>
                <div
                    style={{
                        fontSize: 20,
                        textTransform: "uppercase",
                        letterSpacing: 1.4,
                        color: "#6b7280",
                        fontWeight: 900,
                        marginBottom: 10,
                    }}
                >
                    Work Order
                </div>

                <div
                    style={{
                        fontSize: 12,
                        color: "#6b7280",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 12,
                    }}
                >
                    <span style={{ fontWeight: 700 }}>Ref:</span>
                    <span style={{ fontFamily: "monospace" }}>{workOrderId.slice(0, 8)}</span>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        fontSize: 13,
                        color: "#4b5563",
                    }}
                >
                    <span
                        style={{
                            padding: "5px 10px",
                            borderRadius: 999,
                            background: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            fontWeight: 800,
                            color: "#111827",
                        }}
                    >
                        Rol: {myRole ?? "—"}
                    </span>

                    {invoiceId ? (
                        <span
                            style={{
                                padding: "5px 10px",
                                borderRadius: 999,
                                background: "#f9fafb",
                                border: "1px solid #e5e7eb",
                                fontWeight: 700,
                            }}
                        >
                            Invoice: <span style={{ fontFamily: "monospace" }}>{String(invoiceId).slice(0, 8)}</span>
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

                    {isAdmin ? (
                        <>
                            {invoiceId ? (
                                <button
                                    type="button"
                                    onClick={onOpenInvoice}
                                    style={{
                                        padding: "6px 10px",
                                        borderRadius: 10,
                                        border: "1px solid #d1d5db",
                                        background: "white",
                                        cursor: "pointer",
                                        fontWeight: 800,
                                        fontSize: 12,
                                    }}
                                >
                                    Open
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
                                    padding: "6px 10px",
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
                                {syncingInvoice ? "Syncing..." : "Sync"}
                            </button>
                        </>
                    ) : null}
                </div>
            </div>

            <button
                onClick={onBack}
                style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    background: "white",
                    cursor: "pointer",
                    fontWeight: 800,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
            >
                ← Back to Work Orders
            </button>
        </div>
    );
}