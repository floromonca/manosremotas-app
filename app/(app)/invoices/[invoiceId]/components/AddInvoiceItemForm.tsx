"use client";

type Props = {
    desc: string;
    qty: number;
    unitPrice: number;
    taxable: boolean;
    isDraft: boolean;
    saving: boolean;
    onChangeDesc: (value: string) => void;
    onChangeQty: (value: number) => void;
    onChangeUnitPrice: (value: number) => void;
    onChangeTaxable: (value: boolean) => void;
    onAddItem: () => void;
};

const inputStyle = (disabled: boolean): React.CSSProperties => ({
    width: "100%",
    height: 44,
    padding: "0 14px",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    background: disabled ? "#f3f4f6" : "#ffffff",
    color: disabled ? "#6b7280" : "#111827",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
});

export default function AddInvoiceItemForm({
    desc,
    qty,
    unitPrice,
    taxable,
    isDraft,
    saving,
    onChangeDesc,
    onChangeQty,
    onChangeUnitPrice,
    onChangeTaxable,
    onAddItem,
}: Props) {
    const disabled = !isDraft;

    return (
        <div
            style={{
                display: "grid",
                gap: 14,
                opacity: disabled ? 0.82 : 1,
            }}
        >
            <div
                style={{
                    display: "grid",
                    gap: 6,
                }}
            >
                <label
                    style={{
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        color: "#6b7280",
                        fontWeight: 800,
                    }}
                >
                    Description
                </label>

                <input
                    value={desc}
                    onChange={(e) => onChangeDesc(e.target.value)}
                    placeholder="e.g. Labour / Materials"
                    disabled={disabled}
                    style={inputStyle(disabled)}
                />
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(140px, 1fr) minmax(180px, 1fr) auto",
                    gap: 12,
                    alignItems: "end",
                }}
            >
                <div style={{ display: "grid", gap: 6 }}>
                    <label
                        style={{
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: 0.8,
                            color: "#6b7280",
                            fontWeight: 800,
                        }}
                    >
                        Qty
                    </label>

                    <input
                        type="number"
                        value={qty}
                        onChange={(e) => onChangeQty(Number(e.target.value))}
                        disabled={disabled}
                        style={inputStyle(disabled)}
                    />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                    <label
                        style={{
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: 0.8,
                            color: "#6b7280",
                            fontWeight: 800,
                        }}
                    >
                        Unit Price
                    </label>

                    <input
                        type="number"
                        value={unitPrice}
                        onChange={(e) => onChangeUnitPrice(Number(e.target.value))}
                        disabled={disabled}
                        style={inputStyle(disabled)}
                    />
                </div>

                <label
                    style={{
                        height: 44,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "0 12px",
                        borderRadius: 12,
                        border: "1px solid #d1d5db",
                        background: disabled ? "#f3f4f6" : "#ffffff",
                        color: "#111827",
                        fontSize: 14,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                    }}
                >
                    <input
                        type="checkbox"
                        checked={taxable}
                        onChange={(e) => onChangeTaxable(e.target.checked)}
                        disabled={disabled}
                    />
                    Taxable
                </label>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                }}
            >
                <div
                    style={{
                        fontSize: 13,
                        color: "#6b7280",
                        lineHeight: 1.5,
                    }}
                >
                    {disabled
                        ? "This invoice is read-only. Items cannot be added."
                        : "Add a billable line item to this invoice."}
                </div>

                <button
                    type="button"
                    onClick={onAddItem}
                    disabled={saving || disabled}
                    style={{
                        height: 44,
                        padding: "0 16px",
                        borderRadius: 12,
                        border: "1px solid #111827",
                        background: disabled ? "#9ca3af" : "#111827",
                        color: "#ffffff",
                        cursor: saving || disabled ? "not-allowed" : "pointer",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        opacity: saving || disabled ? 0.75 : 1,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                    }}
                >
                    {disabled ? "Invoice read-only" : saving ? "Adding..." : "+ Add Item"}
                </button>
            </div>
        </div>
    );
}