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
    return (
        <div style={{ display: "grid", gap: 10, marginBottom: 12, opacity: isDraft ? 1 : 0.75 }}>
            <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Descripción</span>
                <input
                    value={desc}
                    onChange={(e) => onChangeDesc(e.target.value)}
                    placeholder="Ej: Mano de obra / Material"
                    disabled={!isDraft}
                    style={{
                        padding: 10,
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        background: !isDraft ? "#f6f6f6" : "white",
                    }}
                />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>Qty</span>
                    <input
                        type="number"
                        value={qty}
                        onChange={(e) => onChangeQty(Number(e.target.value))}
                        disabled={!isDraft}
                        style={{
                            padding: 10,
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            background: !isDraft ? "#f6f6f6" : "white",
                        }}
                    />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>Unit price</span>
                    <input
                        type="number"
                        value={unitPrice}
                        onChange={(e) => onChangeUnitPrice(Number(e.target.value))}
                        disabled={!isDraft}
                        style={{
                            padding: 10,
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            background: !isDraft ? "#f6f6f6" : "white",
                        }}
                    />
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
                    <input
                        type="checkbox"
                        checked={taxable}
                        onChange={(e) => onChangeTaxable(e.target.checked)}
                        disabled={!isDraft}
                    />
                    <span style={{ fontSize: 13 }}>Taxable</span>
                </label>
            </div>

            <button
                type="button"
                onClick={onAddItem}
                disabled={saving || !isDraft}
                style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #111",
                    background: isDraft ? "#111" : "#999",
                    color: "white",
                    cursor: saving || !isDraft ? "not-allowed" : "pointer",
                    fontWeight: 900,
                    width: "fit-content",
                    opacity: saving || !isDraft ? 0.7 : 1,
                }}
            >
                {!isDraft ? "Invoice read-only" : saving ? "Agregando..." : "+ Add item"}
            </button>
        </div>
    );
}