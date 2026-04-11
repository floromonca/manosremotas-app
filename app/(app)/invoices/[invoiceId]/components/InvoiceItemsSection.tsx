"use client";

import AddInvoiceItemForm from "./AddInvoiceItemForm";
import InvoiceItemRow from "./InvoiceItemRow";

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
    items: InvoiceItemRowType[];
    currencyCode?: string | null;
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
    money: (amount: any, currencyCode?: string | null) => string;
    onUpdateItem: (invoiceItemId: string, fields: any) => Promise<void>;
    onDeleteItem: (invoiceItemId: string) => Promise<void>;
};

export default function InvoiceItemsSection({
    items,
    currencyCode,
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
    money,
    onUpdateItem,
    onDeleteItem,
}: Props) {
    return (
        <section
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 20,
                background: "#ffffff",
                boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                padding: 20,
            }}
        >
            <div style={{ display: "grid", gap: 16 }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ display: "grid", gap: 6 }}>
                        <div
                            style={{
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: 1.1,
                                color: "#6b7280",
                                fontWeight: 800,
                            }}
                        >
                            Items
                        </div>

                        <div
                            style={{
                                fontSize: 22,
                                lineHeight: 1.15,
                                fontWeight: 900,
                                color: "#111827",
                            }}
                        >
                            Invoice Line Items
                        </div>

                        <div
                            style={{
                                fontSize: 14,
                                color: "#6b7280",
                                lineHeight: 1.6,
                                maxWidth: 760,
                            }}
                        >
                            Review, add, and update the billable items included in this invoice.
                        </div>
                    </div>

                    <div
                        style={{
                            minWidth: 88,
                            height: 36,
                            padding: "0 12px",
                            borderRadius: 999,
                            background: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 800,
                            color: "#374151",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {items.length} {items.length === 1 ? "item" : "items"}
                    </div>
                </div>

                <div
                    style={{
                        padding: 16,
                        borderRadius: 16,
                        border: "1px solid #e5e7eb",
                        background: "#fcfcfd",
                    }}
                >
                    <AddInvoiceItemForm
                        desc={desc}
                        qty={qty}
                        unitPrice={unitPrice}
                        taxable={taxable}
                        isDraft={isDraft}
                        saving={saving}
                        onChangeDesc={onChangeDesc}
                        onChangeQty={onChangeQty}
                        onChangeUnitPrice={onChangeUnitPrice}
                        onChangeTaxable={onChangeTaxable}
                        onAddItem={onAddItem}
                    />
                </div>

                {items.length === 0 ? (
                    <div
                        style={{
                            border: "1px dashed #d1d5db",
                            borderRadius: 16,
                            background: "#fcfcfd",
                            padding: "18px 16px",
                            color: "#6b7280",
                            fontSize: 14,
                            lineHeight: 1.6,
                        }}
                    >
                        No items added yet.
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                        {items.map((it) => (
                            <InvoiceItemRow
                                key={it.invoice_item_id}
                                item={it}
                                currencyCode={currencyCode}
                                isDraft={isDraft}
                                money={money}
                                onUpdateItem={onUpdateItem}
                                onDeleteItem={onDeleteItem}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}