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
        <div
            style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 12,
                border: "1px solid #eee",
                background: "white",
            }}
        >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Items</div>

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

            {items.length === 0 ? (
                <div style={{ opacity: 0.7 }}>No hay items aún.</div>
            ) : (
                <div style={{ display: "grid", gap: 10 }}>
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
    );
}