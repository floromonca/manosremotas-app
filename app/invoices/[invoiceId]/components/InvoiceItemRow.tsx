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

    const isManual = item.synced_from_wo !== true;
    const canEdit = isDraft && isManual;

    return (
        <div
            style={{
                padding: 12,
                border: "1px solid #eee",
                borderRadius: 10,
                background: "#fafafa",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
            }}
        >
            <div style={{ flex: 1 }}>
                {canEdit ? (
                    <input
                        defaultValue={item.description ?? ""}
                        onBlur={(e) => onUpdateItem(item.invoice_item_id, { description: e.target.value })}
                        style={{
                            fontWeight: 800,
                            padding: "6px 8px",
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            width: "100%",
                            marginBottom: 6,
                        }}
                    />
                ) : (
                    <div style={{ fontWeight: 800 }}>{item.description ?? "Item"}</div>
                )}

                {canEdit ? (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>qty:</div>
                        <input
                            type="number"
                            defaultValue={qtyN}
                            onBlur={(e) => onUpdateItem(item.invoice_item_id, { qty: Number(e.target.value) })}
                            style={{
                                width: 90,
                                padding: "6px 8px",
                                borderRadius: 8,
                                border: "1px solid #ddd",
                            }}
                        />
                        <div style={{ fontSize: 12, opacity: 0.8 }}>unit:</div>
                        <input
                            type="number"
                            defaultValue={unitN}
                            onBlur={(e) =>
                                onUpdateItem(item.invoice_item_id, { unit_price: Number(e.target.value) })
                            }
                            style={{
                                width: 110,
                                padding: "6px 8px",
                                borderRadius: 8,
                                border: "1px solid #ddd",
                            }}
                        />
                        <div style={{ fontSize: 12, opacity: 0.8 }}>tax_rate: {taxN}</div>

                        <button
                            type="button"
                            onClick={() => onDeleteItem(item.invoice_item_id)}
                            style={{
                                marginLeft: "auto",
                                padding: "6px 10px",
                                borderRadius: 8,
                                border: "1px solid #ff4d4f",
                                background: "#ff4d4f",
                                color: "white",
                                cursor: "pointer",
                                fontWeight: 800,
                            }}
                        >
                            Delete
                        </button>
                    </div>
                ) : (
                    <div style={{ opacity: 0.75, fontSize: 12 }}>
                        qty: {qtyN} · unit: {unitN} · tax_rate: {taxN}
                        {!isManual ? " · synced" : ""}
                    </div>
                )}
            </div>

            <div style={{ textAlign: "right", fontFamily: "monospace", minWidth: 170 }}>
                <div>sub: {money(item.line_subtotal ?? fallbackSub, currencyCode)}</div>
                <div>tax: {money(item.line_tax ?? fallbackTax, currencyCode)}</div>
                <div>
                    <b>total: {money(item.line_total ?? fallbackTotal, currencyCode)}</b>
                </div>
            </div>
        </div>
    );
}