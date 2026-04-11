"use client";

type InvoiceItemRowType = {
    invoice_item_id: string;
    description: string | null;
    qty: number | null;
    unit_price: number | null;
    tax_rate: number | null;
    line_subtotal: number | null;
    line_tax: number | null;
    line_total: number | null;
    created_at: string | null;
    synced_from_wo?: boolean | null;
};

type Props = {
    item: InvoiceItemRowType;
    currencyCode?: string | null;
    isDraft: boolean;
    money: (amount: any, currencyCode?: string | null) => string;
    onUpdateItem: (invoiceItemId: string, fields: any) => Promise<void>;
    onDeleteItem: (invoiceItemId: string) => Promise<void>;
};

const fieldInputStyle: React.CSSProperties = {
    height: 40,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    fontSize: 14,
    boxSizing: "border-box",
};

export default function InvoiceItemRow({
    item,
    currencyCode,
    isDraft,
    money,
    onUpdateItem,
    onDeleteItem,
}: Props) {
    const qtyN = Number(item.qty ?? 0);
    const unitN = Number(item.unit_price ?? 0);
    const taxN = Number(item.tax_rate ?? 0);

    const fallbackSub = qtyN * unitN;
    const fallbackTax = fallbackSub * taxN;
    const fallbackTotal = fallbackSub + fallbackTax;

    const subtotal = item.line_subtotal ?? fallbackSub;
    const tax = item.line_tax ?? fallbackTax;
    const total = item.line_total ?? fallbackTotal;

    const isManual = item.synced_from_wo !== true;
    const canEdit = isDraft && isManual;

    return (
        <div
            style={{
                padding: 16,
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background: "#fcfcfd",
                display: "grid",
                gap: 14,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                }}
            >
                <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 260 }}>
                    {canEdit ? (
                        <div style={{ display: "grid", gap: 6 }}>
                            <div
                                style={{
                                    fontSize: 11,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.8,
                                    color: "#6b7280",
                                    fontWeight: 800,
                                }}
                            >
                                Description
                            </div>

                            <input
                                defaultValue={item.description ?? ""}
                                onBlur={(e) =>
                                    onUpdateItem(item.invoice_item_id, {
                                        description: e.target.value,
                                    })
                                }
                                style={{
                                    ...fieldInputStyle,
                                    width: "100%",
                                    height: 42,
                                    fontWeight: 700,
                                }}
                            />
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                            <div
                                style={{
                                    fontSize: 18,
                                    lineHeight: 1.2,
                                    fontWeight: 900,
                                    color: "#111827",
                                }}
                            >
                                {item.description ?? "Item"}
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                }}
                            >
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        height: 28,
                                        padding: "0 10px",
                                        borderRadius: 999,
                                        background: isManual ? "#eef2ff" : "#f3f4f6",
                                        color: isManual ? "#3730a3" : "#4b5563",
                                        border: isManual
                                            ? "1px solid #c7d2fe"
                                            : "1px solid #e5e7eb",
                                        fontSize: 12,
                                        fontWeight: 800,
                                    }}
                                >
                                    {isManual ? "Manual item" : "Synced from work order"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div
                    style={{
                        minWidth: 220,
                        display: "grid",
                        gap: 8,
                        justifyItems: "end",
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: 0.8,
                            color: "#6b7280",
                            fontWeight: 800,
                        }}
                    >
                        Line Total
                    </div>

                    <div
                        style={{
                            fontSize: 24,
                            lineHeight: 1.1,
                            fontWeight: 900,
                            color: "#111827",
                        }}
                    >
                        {money(total, currencyCode)}
                    </div>

                    <div
                        style={{
                            fontSize: 12,
                            color: "#6b7280",
                            textAlign: "right",
                            lineHeight: 1.5,
                        }}
                    >
                        Subtotal: {money(subtotal, currencyCode)}
                        <br />
                        Tax: {money(tax, currencyCode)}
                    </div>
                </div>
            </div>

            {canEdit ? (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "end",
                        gap: 16,
                        flexWrap: "wrap",
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(110px, 150px))",
                            gap: 12,
                            alignItems: "end",
                        }}
                    >
                        <div style={{ display: "grid", gap: 6 }}>
                            <div
                                style={{
                                    fontSize: 11,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.8,
                                    color: "#6b7280",
                                    fontWeight: 800,
                                }}
                            >
                                Qty
                            </div>

                            <input
                                type="number"
                                defaultValue={qtyN}
                                onBlur={(e) =>
                                    onUpdateItem(item.invoice_item_id, {
                                        qty: Number(e.target.value),
                                    })
                                }
                                style={fieldInputStyle}
                            />
                        </div>

                        <div style={{ display: "grid", gap: 6 }}>
                            <div
                                style={{
                                    fontSize: 11,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.8,
                                    color: "#6b7280",
                                    fontWeight: 800,
                                }}
                            >
                                Unit Price
                            </div>

                            <input
                                type="number"
                                defaultValue={unitN}
                                onBlur={(e) =>
                                    onUpdateItem(item.invoice_item_id, {
                                        unit_price: Number(e.target.value),
                                    })
                                }
                                style={fieldInputStyle}
                            />
                        </div>

                        <div style={{ display: "grid", gap: 6 }}>
                            <div
                                style={{
                                    fontSize: 11,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.8,
                                    color: "#6b7280",
                                    fontWeight: 800,
                                }}
                            >
                                Tax Rate
                            </div>

                            <div
                                style={{
                                    height: 40,
                                    padding: "0 12px",
                                    borderRadius: 10,
                                    border: "1px solid #e5e7eb",
                                    background: "#f9fafb",
                                    color: "#374151",
                                    fontSize: 14,
                                    display: "flex",
                                    alignItems: "center",
                                    fontWeight: 700,
                                }}
                            >
                                {taxN}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => onDeleteItem(item.invoice_item_id)}
                        style={{
                            height: 40,
                            padding: "0 14px",
                            borderRadius: 10,
                            border: "1px solid #ef4444",
                            background: "#ef4444",
                            color: "#ffffff",
                            cursor: "pointer",
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                        }}
                    >
                        Delete
                    </button>
                </div>
            ) : (
                <div
                    style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                    }}
                >
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            height: 28,
                            padding: "0 10px",
                            borderRadius: 999,
                            background: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            color: "#4b5563",
                            fontSize: 12,
                            fontWeight: 700,
                        }}
                    >
                        Qty: {qtyN}
                    </span>

                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            height: 28,
                            padding: "0 10px",
                            borderRadius: 999,
                            background: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            color: "#4b5563",
                            fontSize: 12,
                            fontWeight: 700,
                        }}
                    >
                        Unit: {unitN}
                    </span>

                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            height: 28,
                            padding: "0 10px",
                            borderRadius: 999,
                            background: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            color: "#4b5563",
                            fontSize: 12,
                            fontWeight: 700,
                        }}
                    >
                        Tax rate: {taxN}
                    </span>
                </div>
            )}
        </div>
    );
}